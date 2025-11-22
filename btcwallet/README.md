# BTC Wallet Manager

A simple CLI application to manage Bitcoin wallets on the testnet using Node.js.

## 📚 About this Project

This project was developed as part of the **DIO Binance - Blockchain Developer with Solidity 2025** bootcamp.

- **createWallet.js** - Example and foundation provided by the bootcamp instructor
- **app.js** - Development and expansion of functionalities with own authorship

## Features

- ✅ Create new wallets with mnemonic (BIP39)
- ✅ Import existing wallets
- ✅ Validate mnemonic
- ✅ Query transactions of an address
- ✅ Store wallets locally in JSON

## Requirements

- Node.js (v16+)
- npm

## Installation

```bash
# Clone or download the project
cd btcwallet

# Install dependencies
npm install
```

## Dependencies

- `bip32` - HD key derivation
- `bip39` - Mnemonic generation
- `bitcoinjs-lib` - Bitcoin library for JavaScript

## Usage

```bash
# Start the application
node src/app.js
```

### Main Menu

1. **Create new wallet** - Generates a new wallet with mnemonic
2. **Import wallet** - Imports a wallet using an existing mnemonic
3. **Validate mnemonic** - Validates if a mnemonic is valid
4. **Search address transactions** - Searches transactions of a testnet address
5. **Exit** - Exit the application

## Storage

Created/imported wallets are saved in `wallets.json` in the project root.

## Security

⚠️ **WARNING**: This project is for educational purposes only. Never use in production with real keys.

- Keep your mnemonics safe
- Never share your private keys
- Use only on testnet for testing

## Project Structure

```
btcwallet/
├── src/
│   └── app.js          # Main file
├── wallets.json        # Wallet storage
├── package.json        # Dependencies
├── README.md          # This file
└── .gitignore         # Files ignored by Git
```

## BlockCypher API

This project uses the BlockCypher API to query transactions on the testnet.

Endpoint: `https://api.blockcypher.com/v1/btc/test3/addrs/{address}`

## License

MIT
