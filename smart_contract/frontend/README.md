# 📁 Estrutura do Frontend

Este diretório contém a interface web do DASI Gov.

## 📂 Organização

```
frontend/
├── index.html          # Página principal (votações)
├── cadastro.html       # Página de cadastro de estudantes
├── admin.html          # Área administrativa
│
├── css/
│   └── styles.css      # Estilos CSS globais
│
└── js/
    ├── config.js           # Configuração dos contratos (endereços, ABIs)
    ├── session.js           # Gerenciamento de sessão
    ├── access-control.js   # Sistema de controle de acesso
    ├── api.js              # Cliente API REST
    ├── app.js              # Lógica da página principal (votações)
    ├── cadastro.js         # Lógica de cadastro
    └── admin.js            # Lógica administrativa
```

## 📄 Descrição dos Arquivos

### HTML

- **index.html**: Interface principal para visualizar e votar em propostas
- **cadastro.html**: Formulário de cadastro para novos estudantes
- **admin.html**: Painel administrativo para aprovar cadastros, gerenciar owners e aprovar propostas

### CSS

- **css/styles.css**: Estilos globais para todas as páginas

### JavaScript

#### Core/Configuração
- **config.js**: Contém endereços dos contratos, ABIs e configurações do sistema
- **session.js**: Gerencia sessão do usuário e persistência de dados

#### Módulos
- **access-control.js**: Sistema centralizado de controle de acesso (deployer, owners, usuários aprovados)

#### Páginas
- **app.js**: Lógica da página principal (conexão de carteira, criação de propostas, votação)
- **cadastro.js**: Lógica do formulário de cadastro
- **admin.js**: Lógica do painel administrativo

#### Utilitários
- **reset-system.js**: Funções para resetar dados locais (apenas desenvolvimento)

## 🔗 Dependências Externas

- **Ethers.js v5.7.2**: Biblioteca para interação com blockchain (via CDN)
- **MetaMask**: Extensão do navegador para conexão de carteira

## 🚀 Como Usar

1. Abra os arquivos HTML diretamente no navegador, ou
2. Use um servidor HTTP local:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server -p 8000
   ```
3. Acesse `http://localhost:8000/index.html`

## ⚙️ Configuração

Após fazer deploy dos contratos, atualize os endereços em `js/config.js`:
- `TOKEN_ADDRESS`: Endereço do contrato DASIToken
- `DAO_ADDRESS`: Endereço do contrato DASIDAO
- `DEPLOYER_ADDRESS`: Endereço da conta deployer


