# 📝 Guia de Cadastro e Distribuição de Tokens

## 🎯 Visão Geral

Este guia explica como funciona o sistema de cadastro de estudantes e distribuição de tokens DASI para participação nas votações. O sistema utiliza um processo de **aprovação** onde apenas cadastros aprovados podem receber tokens e acessar o sistema.

---

## 👨‍🎓 Para Estudantes: Como se Cadastrar

### Passo 1: Criar sua Carteira MetaMask

1. **Instale o MetaMask**
   - Acesse: https://metamask.io/download/
   - Instale a extensão no seu navegador
   - Crie uma nova carteira
   - ⚠️ **IMPORTANTE**: Guarde sua seed phrase em local seguro!

2. **Configure a Rede**
   - Adicione a rede Ganache (para testes locais)
   - Network Name: Ganache Local
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH

### Passo 2: Acessar Página de Cadastro

1. Abra `cadastro.html` no navegador
2. **IMPORTANTE**: A página de cadastro só é acessível se você **não estiver conectado**
3. O formulário estará visível imediatamente

### Passo 3: Preencher Dados

1. **Matrícula**: Sua matrícula na universidade
2. **Nome Completo**: Seu nome completo
3. **Email** (opcional): Para receber notificações
4. **Endereço da Carteira**: Será preenchido automaticamente ao conectar

### Passo 4: Conectar Carteira e Assinar Mensagem

1. Clique em "Conectar Carteira"
2. Aprove a conexão no MetaMask
3. O endereço será preenchido automaticamente
4. Uma mensagem será gerada automaticamente
5. Clique em "Assinar Mensagem"
6. Aprove a assinatura no MetaMask
7. Isso prova que você controla a carteira

### Passo 5: Enviar Cadastro

1. Clique em "Enviar Cadastro"
2. Seus dados serão salvos com status **"pendente"**
3. **Aguarde a aprovação** pela administração
4. Após aprovação, você receberá 1 token DASI

---

## 👨‍💼 Para Administradores: Sistema de Aprovação e Distribuição

### Controle de Acesso

O sistema possui três níveis de acesso:

1. **Deployer**: Acesso total (definido no deploy)
2. **Owners/Diretores**: Acesso total (gerenciados pelo deployer)
3. **Estudantes Aprovados**: Acesso ao sistema após aprovação

### Pré-requisitos para Administradores

1. Ser **deployer** ou **owner** (ter acesso administrativo)
2. Ter permissão de minter no contrato DASIToken
   - Isso é configurado automaticamente no deploy

### Fluxo de Aprovação e Distribuição

#### 1. Aprovar Cadastros

1. **Acessar Admin**
   - Abra `admin.html` no navegador
   - Conecte sua carteira MetaMask (deployer ou owner)

2. **Verificar Autorização**
   - O sistema verifica se sua conta tem acesso administrativo
   - Se autorizado, as seções administrativas serão exibidas

3. **Visualizar Cadastros Pendentes**
   - Na seção "Aprovação de Cadastros"
   - Veja todos os cadastros com status "pendente"
   - Visualize: nome, matrícula, email, endereço, data de cadastro

4. **Aprovar ou Rejeitar**
   - **Aprovar**: Clique em "✅ Aprovar" para permitir acesso ao sistema
   - **Rejeitar**: Clique em "❌ Rejeitar" (pode incluir motivo)
   - Apenas cadastros aprovados podem receber tokens

#### 2. Distribuir Tokens

1. **Acessar Dashboard de Cadastros**
   - Na seção "Dashboard de Cadastros"
   - Veja todos os estudantes cadastrados

2. **Filtrar e Buscar**
   - Filtre por status (todos, aguardando distribuição, já distribuídos)
   - Busque por matrícula ou nome

3. **Selecionar Estudantes**
   - Marque os checkboxes dos estudantes **aprovados** que receberão tokens
   - Ou use "Selecionar Todos" para selecionar todos os aprovados pendentes
   - **Nota**: Apenas cadastros aprovados podem ser selecionados

4. **Distribuir Tokens**
   - Clique em "Distribuir Tokens para Selecionados"
   - Confirme a transação no MetaMask
   - Aguarde a confirmação
   - Cada estudante receberá **1 token DASI**

5. **Verificar Resultado**
   - Os cadastros serão atualizados automaticamente
   - Status mudará para "Tokens Distribuídos"

#### 3. Gerenciar Owners (Apenas Deployer)

1. **Acessar Seção de Owners**
   - Apenas o deployer vê esta seção
   - Visualize lista de owners atuais

2. **Adicionar Owner**
   - Digite o endereço da carteira
   - Clique em "Adicionar Owner"
   - O novo owner terá acesso total ao sistema

3. **Remover Owner**
   - Clique em "Remover" ao lado do owner
   - Confirme a remoção

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────┐
│ 1. Estudante cria carteira          │
│    MetaMask                          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Estudante acessa cadastro.html   │
│    (sem estar conectado)            │
│    - Preenche dados                 │
│    - Conecta carteira                │
│    - Assina mensagem                 │
│    - Envia cadastro                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Cadastro salvo com status        │
│    "pendente" (localStorage)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Admin (deployer/owner) acessa    │
│    admin.html                        │
│    - Vê cadastros pendentes          │
│    - Aprova ou rejeita cadastros     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Admin distribui tokens            │
│    - Seleciona cadastros aprovados   │
│    - Distribui via batchMint()       │
│    - 1 token por estudante           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. Estudante pode acessar sistema   │
│    - Conecta carteira                │
│    - Sistema verifica aprovação      │
│    - Pode votar em propostas         │
└─────────────────────────────────────┘
```

---

## 🔒 Segurança e Controle de Acesso

### Sistema de Aprovação

- **Cadastros Pendentes**: Não têm acesso ao sistema
- **Cadastros Aprovados**: Têm acesso e podem receber tokens
- **Cadastros Rejeitados**: Não têm acesso (podem ser rejeitados com motivo)

### Verificação de Assinatura

O sistema usa assinatura de mensagem para provar que o estudante controla a carteira:

```javascript
// Mensagem assinada
const message = `Eu sou ${nome} (Matrícula: ${matricula}) e controlo esta carteira: ${endereco}`;
const signature = await signer.signMessage(message);

// Verificação
const recoveredAddress = ethers.utils.verifyMessage(message, signature);
// recoveredAddress deve ser igual ao endereco
```

### Prevenção de Duplicidade

- Cada matrícula só pode ser cadastrada uma vez
- Cada endereço só pode ser cadastrado uma vez
- Verificação antes de salvar

### Controle de Acesso

- **Deployer**: Acesso total (único, definido no deploy)
- **Owners**: Acesso total (gerenciados pelo deployer)
- **Estudantes Aprovados**: Acesso ao sistema de votações
- Verificação de permissão de minter no contrato
- Verificação de autorização na interface admin

---

## 📊 Estrutura de Dados

### Cadastro de Estudante

```javascript
{
    matricula: "2024001",
    nome: "João Silva",
    email: "joao@email.com",
    endereco: "0x...",
    assinatura: "0x...",
    mensagem: "Eu sou João Silva...",
    timestamp: 1234567890,
    status: "pendente", // "pendente" | "aprovado" | "rejeitado"
    tokensDistribuidos: false,
    dataDistribuicao: null,
    aprovadoPor: null, // Endereço do admin que aprovou
    dataAprovacao: null,
    rejeitadoPor: null, // Endereço do admin que rejeitou
    dataRejeicao: null,
    motivoRejeicao: null
}
```

### Armazenamento

- **Desenvolvimento**: localStorage do navegador
- **Produção**: Banco de dados (PostgreSQL, MongoDB, etc.)

---

## 🛠️ Troubleshooting

### Problema: "MetaMask não encontrado"
- **Solução**: Instale a extensão MetaMask no navegador

### Problema: "Página de cadastro não acessível"
- **Solução**: Desconecte sua carteira primeiro. A página de cadastro só é acessível quando não está conectado.

### Problema: "Esta carteira não tem acesso ao sistema"
- **Solução**: Seu cadastro pode estar pendente de aprovação ou foi rejeitado. Entre em contato com a administração.

### Problema: "Conta não autorizada" (Admin)
- **Solução**: Apenas deployer ou owners podem acessar a área administrativa. Verifique se sua conta está configurada como owner.

### Problema: "Não tem permissão de minter"
- **Solução**: O deployer tem permissão automaticamente. Para adicionar outros minters:
  ```javascript
  await token.addMinter(adminAddress);
  ```

### Problema: "Assinatura inválida"
- **Solução**: Assine a mensagem novamente após preencher todos os campos

### Problema: "Matrícula já cadastrada"
- **Solução**: Verifique se você já se cadastrou antes. Use a página de cadastro para ver seu status.

---

## 📝 Notas Importantes

1. **Sistema de Aprovação**: Todos os cadastros precisam ser aprovados antes de ter acesso ao sistema.

2. **LocalStorage**: Os cadastros são salvos no localStorage do navegador. Em produção, use um banco de dados.

3. **Permissões**: O deployer tem permissão de minter automaticamente. Owners podem ser adicionados pelo deployer.

4. **Quantidade de Tokens**: Por padrão, cada estudante recebe 1 token. Isso pode ser ajustado no código.

5. **Verificação de Matrícula**: Em produção, você deve verificar a matrícula contra a base de dados da universidade.

6. **Backup**: Faça backup regular dos cadastros (especialmente se usando localStorage).

7. **Acesso ao Sistema**: Apenas cadastros aprovados podem conectar e usar o sistema de votações.

---

## 🚀 Próximos Passos

1. Integrar com banco de dados real
2. Adicionar verificação de matrícula via API da universidade
3. Implementar notificações por email
4. Adicionar sistema de revogação de tokens (se necessário)
5. Criar relatórios e estatísticas
6. Implementar sistema de gasless transactions

---

**Status**: ✅ Sistema Completo e Funcional com Aprovação
