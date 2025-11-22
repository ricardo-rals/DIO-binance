const bip32 = require('bip32');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const fs = require('fs');
const readline = require('readline');
const https = require('https');

const network = bitcoin.networks.testnet;
const WALLET_FILE = 'wallets.json';


function LoadWallets() {
  if (!fs.existsSync(WALLET_FILE)) {

    fs.writeFileSync(WALLET_FILE, JSON.stringify([]));

  }

  return JSON.parse(fs.readFileSync(WALLET_FILE));
}

function SaveWallet(WalletData) {

  const Wallets = LoadWallets();

  Wallets.push(WalletData);

  fs.writeFileSync(WALLET_FILE, JSON.stringify(Wallets, null, 2));

}

function IsValidMnemonic(Mnemonic) {

  return bip39.validateMnemonic(Mnemonic);

}

function CreateRootKey(Mnemonic) {

  if (!IsValidMnemonic(Mnemonic)) return null;

  const Seed = bip39.mnemonicToSeedSync(Mnemonic);

  return bip32.fromSeed(Seed, network);

}

function GenerateMnemonic() {

  return bip39.generateMnemonic();

}

function GenerateAddress(Mnemonic) {

  const Root = CreateRootKey(Mnemonic);
  if (!Root) return null;

  const Path = `m/49'/1'/0'/0/0`;
  const Node = Root.derivePath(Path);

  const Address = bitcoin.payments.p2pkh({
    pubkey: Node.publicKey,
    network: network
  }).address;

  return {
    mnemonic: Mnemonic,
    address: Address,
    privateKey: Node.toWIF(),
    publicKey: Node.publicKey.toString('hex')
  };
}

function ImportWallet(Mnemonic) {

  return GenerateAddress(Mnemonic);

}

// ---------- Get Transactions ----------

function GetTransactions(Address, Limit = 5) {

  return new Promise((Resolve, Reject) => {

    const Url = `https://api.blockcypher.com/v1/btc/test3/addrs/${Address}`;

    https.get(Url, (Res) => {
      let Data = '';

      Res.on('data', Chunk => (Data += Chunk));
      Res.on('end', () => {
        try {

          const Json = JSON.parse(Data);

          if (!Json.txrefs) {
            Resolve([]);
            return;
          }

          Resolve(Json.txrefs.slice(0, Limit));

        } catch (Err) {

          Resolve(null);

        }
      });
    }).on('error', () => Resolve(null));
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function Ask(Text) {

  return new Promise((Res) => rl.question(Text, (Ans) => Res(Ans)));

}

async function MainMenu() {

  console.log('\n========== BTC WALLET MANAGER ==========');
  console.log('1. Create new wallet');
  console.log('2. Import wallet');
  console.log('3. Validate mnemonic');
  console.log('4. Search address transactions');
  console.log('5. Exit');
  console.log('========================================\n');

  const Option = await Ask('Select an option: ');

  switch (Option) {
    case '1':
      await CreateNewWalletCLI();
      break;
    case '2':
      await ImportWalletCLI();
      break;
    case '3':
      await ValidateMnemonicCLI();
      break;
    case '4':
      await SearchTransactionsCLI();
      break;
    case '5':
      console.log('Exiting...');
      rl.close();
      return;
    default:
      console.log('Invalid option!');
  }

  await MainMenu();
}

// ---------- CLI Options ----------

async function CreateNewWalletCLI() {
  console.log('\n--- Creating New Wallet ---');

  const Mnemonic = GenerateMnemonic();
  const Wallet = GenerateAddress(Mnemonic);

  SaveWallet(Wallet);

  console.log('\n✓ Wallet created successfully!');
  console.log('Address:', Wallet.address);
  console.log('Private Key:', Wallet.privateKey);
  console.log('Mnemonic:', Mnemonic);
  console.log('Saved in wallets.json');
}

async function ImportWalletCLI() {

  console.log('\n--- Import Wallet ---');

  const Mnemonic = await Ask('Enter mnemonic: ');

  const Wallet = ImportWallet(Mnemonic);

  if (!Wallet) {
    console.log('✗ Invalid mnemonic!');
    return;
  }

  SaveWallet(Wallet);

  console.log('\n✓ Wallet imported!');
  console.log('Address:', Wallet.address);
  console.log('Private Key:', Wallet.privateKey);
}

async function ValidateMnemonicCLI() {
  console.log('\n--- Validate Mnemonic ---');
  const Mnemonic = await Ask('Enter mnemonic: ');

  if (IsValidMnemonic(Mnemonic)) {
    console.log('✓ Valid mnemonic!');
  } else {
    console.log('✗ Invalid mnemonic!');
  }
}

async function SearchTransactionsCLI() {
  console.log('\n--- Search Transactions ---');

  const Address = await Ask('Enter BTC testnet address: ');

  const Limit = await Ask('How many transactions to show? (default: 5): ');

  const Txs = await GetTransactions(Address, parseInt(Limit) || 5);

  if (Txs === null) {
    console.log('✗ Error fetching transactions!');
    return;
  }

  if (Txs.length === 0) {
    console.log('No transactions found.');
    return;
  }

  console.log(`\n✓ Showing ${Txs.length} transactions:\n`);
  
  Txs.forEach((Tx, i) => {
    console.log(`Transaction ${i + 1}:`);
    console.log(`  Hash: ${Tx.tx_hash}`);
    console.log(`  Value: ${Tx.value} satoshis`);
    console.log(`  Confirmations: ${Tx.confirmations}`);
    console.log('');
  });
}

// ---------- Start ----------

MainMenu();
