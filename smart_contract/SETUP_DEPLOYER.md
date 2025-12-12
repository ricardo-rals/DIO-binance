# 🔧 Configuração do Deployer

Após fazer o deploy dos contratos, é necessário definir o deployer no backend para que o sistema funcione corretamente.

## 📋 Passos

### 1. Fazer o Deploy dos Contratos

```bash
npm run deploy:ganache
```

O script tentará definir o deployer automaticamente se o backend estiver rodando.

### 2. Definir o Deployer Manualmente (se necessário)

Se o backend não estava rodando durante o deploy, você precisa definir o deployer manualmente:

#### Opção A: Via Script

```bash
# Certifique-se de que o backend está rodando primeiro
npm run backend

# Em outro terminal, execute:
npm run setup-deployer <endereco-do-deployer>
```

Exemplo:
```bash
npm run setup-deployer 0xF3cA79A01452E14C2790A8298D16dfade24ade8d
```

#### Opção B: Via API

```bash
curl -X POST http://localhost:3000/api/access-control/deployer \
  -H "Content-Type: application/json" \
  -d '{"address": "0xF3cA79A01452E14C2790A8298D16dfade24ade8d"}'
```

#### Opção C: Via Interface Admin

1. Inicie o backend: `npm run backend`
2. Abra `frontend/admin.html` no navegador
3. Conecte a carteira do deployer
4. O sistema detectará que não há deployer definido e permitirá definir

## ⚠️ Importante

- O deployer só pode ser definido **uma vez**
- Se já houver um deployer definido, você precisará limpar o arquivo `backend/database/access_control.json` manualmente
- O endereço do deployer está em `deployment-ganache.json` após o deploy

## 🔍 Verificar Deployer

Para verificar se o deployer está definido corretamente:

```bash
curl http://localhost:3000/api/access-control/check?address=0xF3cA79A01452E14C2790A8298D16dfade24ade8d
```

Deve retornar:
```json
{
  "address": "0xF3cA79A01452E14C2790A8298D16dfade24ade8d",
  "isDeployer": true,
  "isOwner": false,
  "hasAdminAccess": true
}
```

## 🗑️ Limpar e Redefinir (Desenvolvimento)

Se precisar redefinir o deployer (apenas em desenvolvimento):

1. Pare o backend
2. Edite `backend/database/access_control.json`:
   ```json
   {
     "deployer": null,
     "owners": []
   }
   ```
3. Inicie o backend novamente
4. Defina o deployer novamente usando um dos métodos acima
