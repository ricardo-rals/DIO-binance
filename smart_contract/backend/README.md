# Backend DASI - API REST

Backend Node.js com Express para gerenciar dados do sistema DASI de forma segura e anônima.

## 🎯 Objetivo

Separar dados pessoais dos endereços de carteira para manter o anonimato dos usuários.

## 📁 Estrutura

```
backend/
├── server.js              # Servidor Express principal
├── routes/                # Rotas da API
│   ├── cadastros.js       # Rotas de cadastros
│   ├── history.js         # Rotas de histórico
│   └── access-control.js  # Rotas de controle de acesso
├── services/               # Lógica de negócio
│   ├── cadastros.js       # Serviço de cadastros
│   ├── history.js         # Serviço de histórico
│   └── access-control.js   # Serviço de controle de acesso
└── database/               # Arquivos JSON (banco de dados)
    ├── cadastros.json     # Dados pessoais (separados)
    ├── wallet_mappings.json # Mapeamento anônimo (endereço → ID)
    ├── distribution_history.json # Histórico (sem dados pessoais)
    └── access_control.json # Deployer e owners
```

## 🚀 Como Usar

### 1. Instalar dependências

```bash
cd smart_contract
npm install
```

### 2. Iniciar servidor

```bash
npm run backend
# ou
node backend/server.js
```

O servidor estará rodando em `http://localhost:3000`

### 3. Verificar saúde da API

```bash
curl http://localhost:3000/api/health
```

## 📡 Endpoints da API

### Cadastros

- `GET /api/cadastros` - Obter todos (apenas admin, com dados pessoais)
- `GET /api/cadastros/pending` - Obter pendentes (apenas admin)
- `GET /api/cadastros/address/:address` - Verificar acesso (público, sem dados pessoais)
- `POST /api/cadastros` - Criar cadastro (público)
- `POST /api/cadastros/:address/approve` - Aprovar (apenas admin)
- `POST /api/cadastros/:address/reject` - Rejeitar (apenas admin)
- `PUT /api/cadastros/:address/tokens` - Atualizar tokens (apenas admin)

### Histórico

- `GET /api/history?filter=all|approval|manual` - Obter histórico (apenas admin)
- `POST /api/history` - Adicionar registro (apenas admin)

### Controle de Acesso

- `GET /api/access-control/check?address=0x...` - Verificar acesso
- `GET /api/access-control/deployer` - Obter deployer (apenas admin)
- `POST /api/access-control/deployer` - Definir deployer (apenas se não existir)
- `GET /api/access-control/owners` - Obter owners (apenas admin)
- `POST /api/access-control/owners` - Adicionar owner (apenas deployer)
- `DELETE /api/access-control/owners/:address` - Remover owner (apenas deployer)
- `POST /api/access-control/reset-database` - Resetar banco de dados (apenas deployer)

## 🔒 Segurança e Anonimato

### Separação de Dados

1. **Dados Pessoais** (`cadastros.json`):
   - Nome, matrícula, email
   - Associados a um ID hash único
   - Apenas admin pode ver

2. **Mapeamento Anônimo** (`wallet_mappings.json`):
   - ID hash → Endereço de carteira
   - Total de tokens
   - Status de aprovação
   - **SEM dados pessoais**

3. **Histórico** (`distribution_history.json`):
   - Apenas ID hash e endereço
   - Quantidade de tokens
   - Tipo de distribuição
   - **SEM nome, matrícula ou email**

### Headers Requeridos

Para endpoints que requerem admin, envie:
```
x-admin-address: 0x...
```

## 📝 Exemplo de Uso

### Criar Cadastro

```javascript
const response = await fetch('http://localhost:3000/api/cadastros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        matricula: '2024001',
        nome: 'João Silva',
        email: 'joao@email.com',
        endereco: '0x1234...',
        assinatura: '0xabcd...',
        mensagem: 'Mensagem assinada...'
    })
});
```

### Verificar Acesso (Público)

```javascript
const response = await fetch('http://localhost:3000/api/cadastros/address/0x1234...');
const data = await response.json();
// Retorna: { id: 'abc123...', approved: true, totalTokens: '1' }
// SEM dados pessoais!
```

### Aprovar Cadastro (Admin)

```javascript
const response = await fetch('http://localhost:3000/api/cadastros/0x1234.../approve', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-admin-address': '0xadmin...'
    }
});
```

## 🔄 Migração do localStorage

O frontend foi modificado para usar a API quando disponível, mas mantém compatibilidade com localStorage como fallback.

## ⚠️ Notas Importantes

1. **Primeira Execução**: O servidor cria automaticamente os arquivos JSON se não existirem
2. **Deployer**: Deve ser definido na primeira execução via API
3. **CORS**: Habilitado para `localhost` (ajustar para produção)
4. **Backup**: Fazer backup regular dos arquivos em `backend/database/`

## 🚀 Próximos Passos

- [ ] Adicionar autenticação JWT
- [ ] Migrar para SQLite/PostgreSQL
- [ ] Adicionar rate limiting
- [ ] Implementar logs
- [ ] Adicionar testes

