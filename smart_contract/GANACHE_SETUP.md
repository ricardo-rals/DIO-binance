# 🚀 Guia de Configuração do Ganache

Este guia explica como configurar e usar o Ganache para testar os smart contracts da DASI Gov.

## 📋 Pré-requisitos

- Ganache instalado (GUI ou CLI)
- Node.js e npm instalados
- MetaMask instalado no navegador

## 🔧 Configuração do Ganache

### Opção 1: Ganache GUI

1. **Abra o Ganache**
2. **Crie um novo workspace** ou use o padrão
3. **Configure as seguintes opções:**
   - **Porta:** 7545 (padrão do Ganache GUI)
   - **Chain ID:** 1337
   - **Network ID:** 1337
   - **Gas Limit:** 6721975 (padrão)
   - **Gas Price:** 20000000000 (20 Gwei)

4. **Clique em "Start"** para iniciar o servidor

### Opção 2: Ganache CLI

```bash
# Instalar Ganache CLI globalmente (se ainda não tiver)
npm install -g ganache-cli

# Iniciar Ganache
ganache-cli --port 7545 --chainId 1337 --gasLimit 6721975
```

## 🚀 Deploy dos Contratos

### Passo 1: Compilar os Contratos

```bash
cd smart_contract
npm install
npm run compile
```

### Passo 2: Fazer Deploy no Ganache

Com o Ganache rodando, execute:

```bash
npm run deploy:ganache
```

Este comando irá:
- ✅ Fazer deploy do token DASI
- ✅ Fazer deploy do contrato DAO
- ✅ Configurar permissões (DAO como minter)
- ✅ **NÃO mintear tokens automaticamente** (deploy limpo)

**IMPORTANTE:** Após o deploy, você precisará:
1. Atualizar os endereços em `frontend/config.js`
2. Usar a interface admin para aprovar cadastros e distribuir tokens

### Passo 3: Copiar Endereços dos Contratos

Após o deploy, você verá os endereços dos contratos. Copie-os e atualize em `frontend/config.js`:

```javascript
TOKEN_ADDRESS: "0x...", // Cole o endereço do DASIToken aqui
DAO_ADDRESS: "0x...",   // Cole o endereço do DASIDAO aqui
DEPLOYER_ADDRESS: "0x...", // Cole o endereço do deployer aqui
```

### Passo 4: Inicializar Sistema

1. Abra `admin.html` no navegador
2. Conecte com a conta do deployer
3. O sistema de controle de acesso será inicializado automaticamente
4. Você poderá aprovar cadastros e distribuir tokens

## 🧪 Executar Testes

Para executar os testes usando o Ganache:

```bash
npm run test:ganache
```

## 🔐 Configurar MetaMask

1. **Abra o MetaMask**
2. **Clique no menu de redes** (topo da extensão)
3. **Clique em "Add Network"** → "Add a network manually"
4. **Preencha os dados:**
   - **Network Name:** Ganache Local
   - **New RPC URL:** http://127.0.0.1:7545
   - **Chain ID:** 1337
   - **Currency Symbol:** ETH
   - **Block Explorer URL:** (deixe em branco)

5. **Importe contas do Ganache:**
   - No Ganache, copie a **chave privada** de uma conta
   - No MetaMask, clique em "Importar conta"
   - Cole a chave privada
   - Repita para outras contas que deseja usar

## 💡 Dicas

### Usar Contas Específicas

Se você quiser usar contas específicas do Ganache (por exemplo, para testes automatizados):

**Windows (PowerShell):**
```powershell
$env:GANACHE_PRIVATE_KEYS="0xchave1,0xchave2,0xchave3"
npm run deploy:ganache
```

**Linux/Mac:**
```bash
export GANACHE_PRIVATE_KEYS="0xchave1,0xchave2,0xchave3"
npm run deploy:ganache
```

### Verificar Conexão

Para verificar se o Hardhat consegue se conectar ao Ganache:

```bash
npx hardhat console --network ganache
```

No console, teste:
```javascript
const accounts = await ethers.getSigners();
console.log("Contas disponíveis:", accounts.length);
console.log("Primeira conta:", await accounts[0].getAddress());
```

### Resetar o Ganache

Se você precisar resetar o estado do Ganache:

- **Ganache GUI:** Clique em "Restart" ou recrie o workspace
- **Ganache CLI:** Pare e reinicie o processo

**Importante:** Após resetar, você precisará fazer o deploy novamente!

## 🐛 Solução de Problemas

### Erro: "Nenhuma conta encontrada"

**Solução:** Certifique-se de que o Ganache está rodando na porta 7545.

### Erro: "Insufficient funds"

**Solução:** O Ganache fornece ETH automaticamente. Se o erro persistir, verifique se está usando a conta correta.

### Erro: "Network mismatch"

**Solução:** Certifique-se de que o Chain ID no Ganache é 1337 e que o MetaMask está configurado com o mesmo Chain ID.

### Contratos não aparecem no front-end

**Solução:** 
1. Verifique se os endereços em `frontend/config.js` estão corretos
2. Certifique-se de que o MetaMask está conectado à rede Ganache
3. Recarregue a página do front-end

## 📚 Recursos

- [Documentação do Ganache](https://trufflesuite.com/docs/ganache/)
- [Hardhat Networks](https://hardhat.org/hardhat-network/docs/overview)

---

**Boa sorte com seus testes! 🚀**

