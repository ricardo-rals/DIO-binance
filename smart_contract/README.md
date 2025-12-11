# 🏛️ DASI Gov - Smart Contracts e Front-end

Sistema completo de DAO (Decentralized Autonomous Organization) para governança estudantil, implementado com Solidity e interface web. Inclui sistema de cadastro, aprovação e distribuição de tokens.

## 📋 Estrutura do Projeto

```
smart_contract/
├── contracts/              # Smart Contracts em Solidity
│   ├── DASIToken.sol       # Token ERC-20 para governança
│   └── DASIDAO.sol         # Contrato principal da DAO
├── scripts/                # Scripts de deploy
│   ├── deploy-ganache.js   # Script para deploy no Ganache
│   ├── deploy.js           # Script genérico de deploy
│   └── distribuir-tokens.js # Script para distribuição (alternativo)
├── frontend/               # Interface web
│   ├── index.html          # Página principal (votações)
│   ├── cadastro.html       # Página de cadastro
│   ├── admin.html          # Área administrativa
│   ├── app.js              # Lógica da página principal
│   ├── cadastro.js         # Lógica de cadastro
│   ├── admin.js            # Lógica administrativa
│   ├── access-control.js   # Sistema de controle de acesso
│   ├── reset-system.js     # Ferramentas de reset (dev)
│   ├── session.js          # Gerenciamento de sessão
│   ├── config.js           # Configuração dos contratos
│   └── styles.css          # Estilos CSS
├── test/                   # Testes
│   └── DAO.test.js         # Testes do contrato DAO
├── hardhat.config.js       # Configuração do Hardhat
└── package.json            # Dependências do projeto
```

## 🚀 Instalação

### Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- MetaMask instalado no navegador
- Ganache (para testes locais)

### Passos

1. **Instalar dependências:**
```bash
cd smart_contract
npm install
```

2. **Compilar os contratos:**
```bash
npm run compile
```

## 🛠️ Uso

### Opção 1: Usando Ganache (Recomendado)

#### 1. Iniciar o Ganache

1. Abra o Ganache (GUI ou CLI)
2. Configure para usar a porta **7545** (padrão do Ganache GUI)
3. Certifique-se de que o **Chain ID** está configurado como **1337**

#### 2. Fazer deploy dos contratos

Em um terminal:
```bash
npm run deploy:ganache
```

Este comando irá:
- ✅ Fazer deploy do token DASI
- ✅ Fazer deploy do contrato DAO
- ✅ Configurar permissões (DAO como minter)
- ✅ **NÃO mintear tokens automaticamente** (deploy limpo)

**IMPORTANTE:** Após o deploy, copie os endereços dos contratos e atualize em `frontend/config.js`:
```javascript
TOKEN_ADDRESS: "0x...", // Endereço do DASIToken
DAO_ADDRESS: "0x...",   // Endereço do DASIDAO
DEPLOYER_ADDRESS: "0x...", // Endereço do deployer
```

#### 3. Configurar MetaMask para Ganache

1. Abra o MetaMask
2. Adicione uma rede customizada:
   - **Network Name:** Ganache Local
   - **RPC URL:** http://127.0.0.1:7545
   - **Chain ID:** 1337
   - **Currency Symbol:** ETH

3. Importe a conta do deployer:
   - No Ganache, copie a chave privada da primeira conta (deployer)
   - No MetaMask, clique em "Importar conta"
   - Cole a chave privada

#### 4. Abrir o front-end

Abra os arquivos HTML no navegador ou use um servidor local:

```bash
# Usando Python
cd frontend
python -m http.server 8000

# Ou usando Node.js (http-server)
npx http-server frontend -p 8000
```

Acesse:
- **Votações**: http://localhost:8000/index.html
- **Cadastro**: http://localhost:8000/cadastro.html
- **Admin**: http://localhost:8000/admin.html

## 🎯 Funcionalidades

### Sistema de Cadastro e Aprovação

1. **Cadastro de Estudantes**
   - Estudantes preenchem dados (matrícula, nome, email)
   - Conectam carteira MetaMask
   - Assinam mensagem para verificação
   - Cadastro salvo com status "pendente"

2. **Aprovação de Cadastros**
   - Apenas deployer ou owners podem aprovar
   - Interface admin para aprovar/rejeitar cadastros
   - Cadastros aprovados podem receber tokens

3. **Distribuição de Tokens**
   - Admin seleciona estudantes aprovados
   - Distribui 1 token DASI por estudante
   - Status atualizado automaticamente

### Controle de Acesso

- **Deployer**: Acesso total (único, definido no deploy)
- **Owners/Diretores**: Acesso total (gerenciados pelo deployer)
- **Estudantes Aprovados**: Acesso ao sistema de votações

### Smart Contracts

#### DASIToken (ERC-20)
- Token de governança $DASI
- 1 token = 1 voto
- Sistema de minteamento controlado
- Apenas minters autorizados podem mintear

#### DASIDAO
- **Criar Propostas**: Detentores de tokens podem criar propostas simples
- **Propostas com Múltiplas Opções**: Apenas deployer/owners podem criar
- **Votar**: Membros votam usando seus tokens (A Favor, Contra, Abster)
- **Executar**: Propostas aprovadas podem ser executadas após o período de votação
- **Quórum**: Configurável (padrão: 50%)
- **Período de Votação**: Configurável (padrão: 7 dias)

### Front-end

- ✅ Conectar carteira MetaMask
- ✅ Visualizar saldo de tokens
- ✅ Criar novas propostas (simples ou múltiplas opções)
- ✅ Ver todas as propostas ativas
- ✅ Votar em propostas
- ✅ Executar propostas aprovadas
- ✅ Visualizar estatísticas de votação
- ✅ Informações da DAO (quórum, período de votação, etc.)
- ✅ Sistema de cadastro com aprovação
- ✅ Interface administrativa completa
- ✅ Gerenciamento de owners (deployer)

## 🔐 Sistema de Controle de Acesso

### Níveis de Acesso

1. **Deployer**
   - Acesso total ao sistema
   - Pode aprovar/rejeitar cadastros
   - Pode distribuir tokens
   - Pode gerenciar owners
   - Pode criar propostas com múltiplas opções

2. **Owners/Diretores**
   - Acesso total ao sistema
   - Pode aprovar/rejeitar cadastros
   - Pode distribuir tokens
   - Pode criar propostas com múltiplas opções
   - Gerenciados pelo deployer

3. **Estudantes Aprovados**
   - Acesso ao sistema de votações
   - Podem criar propostas simples
   - Podem votar em propostas
   - Podem executar propostas aprovadas

### Verificação de Acesso

- Sistema verifica se a carteira está aprovada antes de permitir conexão
- Cadastros pendentes não têm acesso
- Cadastros rejeitados não têm acesso

## 🧪 Testes

Para executar os testes:
```bash
npm test
```

Para testes com Ganache:
```bash
npm run test:ganache
```

## 📊 Configurações Padrão

- **Quórum:** 50% dos tokens
- **Período de Votação:** 7 dias
- **Cooldown entre Propostas:** 1 dia (por endereço)
- **Tokens por Estudante:** 1 token DASI

## 🔧 Personalização

### Alterar Quórum

Após o deploy:
```javascript
await dao.setQuorumPercentage(60); // 60%
```

### Alterar Período de Votação

```javascript
await dao.setVotingPeriod(14 * 24 * 60 * 60); // 14 dias
```

### Adicionar Owner

Via interface admin (apenas deployer):
1. Acesse admin.html
2. Conecte como deployer
3. Na seção "Gerenciamento de Owners"
4. Digite o endereço e clique em "Adicionar Owner"

## 📚 Estrutura dos Contratos

### DASIToken

```solidity
- mint(address to, uint256 amount) - Mintear tokens
- batchMint(address[] recipients, uint256[] amounts) - Mintear para múltiplos
- addMinter(address minter) - Adicionar minter autorizado
- removeMinter(address minter) - Remover minter
- authorizedMinters(address) - Verificar se é minter
```

### DASIDAO

```solidity
- createProposal(string description) - Criar proposta simples
- createMultiOptionProposal(string description, string[] options) - Criar proposta com múltiplas opções
- vote(uint256 proposalId, Vote voteType) - Votar (1=A Favor, 2=Contra, 3=Abster)
- voteMultiOption(uint256 proposalId, uint256 optionIndex) - Votar em proposta com múltiplas opções
- executeProposal(uint256 proposalId) - Executar proposta
- getProposal(uint256 proposalId) - Obter detalhes da proposta
- hasVoted(uint256 proposalId, address voter) - Verificar se votou
- getProposalStatus(uint256 proposalId) - Obter status da proposta
- addAuthorizedProposer(address proposer) - Adicionar proposer autorizado
```

## 🚨 Importante

1. **Segurança:** Este é um projeto educacional. Para produção, faça auditorias de segurança.

2. **Endereços:** Sempre atualize os endereços dos contratos em `frontend/config.js` após cada deploy.

3. **Rede:** O deploy padrão é na rede local (Ganache). Para outras redes, configure as variáveis de ambiente.

4. **Deploy Limpo:** O deploy não minteia tokens automaticamente. Use a interface admin para distribuir tokens após aprovar cadastros.

5. **Sistema de Aprovação:** Todos os cadastros precisam ser aprovados antes de ter acesso ao sistema.

## 🔗 Deploy em Outras Redes

1. Configure as variáveis de ambiente:
```bash
export POLYGON_RPC_URL="sua_rpc_url"
export PRIVATE_KEY="sua_chave_privada"
```

2. Faça o deploy:
```bash
npx hardhat run scripts/deploy-ganache.js --network polygon
```

## 📖 Documentação Adicional

- [GUIA_CADASTRO.md](./GUIA_CADASTRO.md) - Guia completo de cadastro e distribuição
- [GANACHE_SETUP.md](./GANACHE_SETUP.md) - Configuração do Ganache

## 🤝 Contribuição

Este projeto faz parte do Bootcamp Blockchain Developer com Solidity 2025 da DIO.

## 💡 Metodologia de Desenvolvimento

Este projeto foi desenvolvido utilizando **vibe coding** - uma abordagem iterativa e colaborativa de desenvolvimento, onde o código evolui através de feedback contínuo e refinamento incremental. A metodologia permitiu uma construção ágil do sistema, com ajustes e melhorias baseados em testes práticos e necessidades reais do projeto.

---

**Desenvolvido como parte do Bootcamp Blockchain Developer com Solidity 2025 - DIO** 🚀
