# 🔒 Verificação de Acesso - Guia de Troubleshooting

## ✅ Como Funciona

O sistema verifica acesso em duas etapas:

1. **Verificação de Admin (Deployer/Owner)**:
   - Verifica se a conta é deployer ou owner
   - Se for, tem acesso total (admin + sistema)

2. **Verificação de Cadastro Aprovado**:
   - Verifica se a conta tem cadastro aprovado
   - Se tiver, tem acesso ao sistema (mas não admin)

## 🔍 Verificar Status Atual

### 1. Verificar Deployer no Backend

```bash
# Verificar arquivo diretamente
cat backend/database/access_control.json
```

Deve mostrar:
```json
{
  "deployer": "0xf3ca79a01452e14c2790a8298d16dfade24ade8d",
  "owners": []
}
```

### 2. Testar Verificação via API

```bash
# Testar com deployer
curl "http://localhost:3000/api/access-control/check?address=0xF3cA79A01452E14C2790A8298D16dfade24ade8d"

# Testar com conta não cadastrada
curl "http://localhost:3000/api/access-control/check?address=0x01e6db1f75C82956bb6Fc022BA005C114ed7a7d0"
```

### 3. Verificar Cadastro

```bash
# Verificar se conta está cadastrada (público)
curl "http://localhost:3000/api/cadastros/address/0x01e6db1f75C82956bb6Fc022BA005C114ed7a7d0"
```

## 🐛 Problemas Comuns

### Problema: Todas as contas têm acesso

**Causa**: Deployer não definido ou verificação não está funcionando

**Solução**:
1. Verificar se deployer está definido: `cat backend/database/access_control.json`
2. Se não estiver, definir: `npm run setup-deployer <endereco>`
3. Verificar logs do console do navegador para ver o que está retornando

### Problema: Erro 403 ao acessar admin

**Causa**: Conta não é deployer/owner

**Solução**: 
- Apenas o deployer (ou owners adicionados) podem acessar a área admin
- Outras contas devem fazer cadastro e aguardar aprovação

### Problema: Conta não cadastrada consegue acessar

**Causa**: Verificação não está sendo feita corretamente

**Solução**:
1. Verificar logs no console do navegador
2. Verificar se `canAccessSystem` está retornando false para contas não cadastradas
3. Verificar se API está retornando corretamente

## 📝 Logs de Debug

O sistema agora adiciona logs no console para facilitar debug:

- `Verificação de admin para <endereco>`: Mostra resultado da verificação de admin
- `Verificação de cadastro para <endereco>`: Mostra resultado da verificação de cadastro

## ✅ Checklist de Verificação

- [ ] Deployer definido no `backend/database/access_control.json`
- [ ] Backend rodando (`npm run backend` ou `npm run dev`)
- [ ] API respondendo (`curl http://localhost:3000/api/health`)
- [ ] Deployer consegue acessar admin
- [ ] Contas não cadastradas são redirecionadas para cadastro
- [ ] Contas cadastradas mas não aprovadas são bloqueadas
