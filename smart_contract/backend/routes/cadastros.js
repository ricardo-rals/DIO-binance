const express = require('express');
const router = express.Router();
const cadastrosService = require('../services/cadastros');
const accessControlService = require('../services/access-control');

// Middleware para verificar admin (deployer ou owner)
async function requireAdmin(req, res, next) {
    const adminAddress = req.headers['x-admin-address'];
    
    if (!adminAddress) {
        return res.status(401).json({ error: 'Endereço de admin não fornecido' });
    }
    
    const hasAccess = await accessControlService.hasAdminAccess(adminAddress);
    if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso negado. Apenas deployer ou owners podem acessar.' });
    }
    
    req.adminAddress = adminAddress;
    next();
}

// GET /api/cadastros - Obter todos (apenas admin, com dados pessoais)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const cadastros = await cadastrosService.getAllCadastros();
        res.json(cadastros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cadastros/pending - Obter pendentes (apenas admin)
router.get('/pending', requireAdmin, async (req, res) => {
    try {
        const cadastros = await cadastrosService.getPendingCadastros();
        res.json(cadastros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cadastros/address/:address - Verificar acesso (público, sem dados pessoais)
router.get('/address/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const cadastro = await cadastrosService.getCadastroByAddress(address);
        
        // Se não encontrou, retornar objeto vazio (não é erro, apenas não cadastrado)
        if (!cadastro) {
            return res.json({
                id: null,
                approved: false,
                totalTokens: '0'
            });
        }
        
        // Retornar apenas dados anônimos
        res.json({
            id: cadastro.id,
            approved: cadastro.approved,
            totalTokens: cadastro.totalTokens
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/cadastros - Criar novo cadastro (público)
router.post('/', async (req, res) => {
    try {
        const result = await cadastrosService.createCadastro(req.body);
        // Retornar apenas ID e status, sem dados pessoais
        res.json({
            id: result.id,
            status: 'pendente',
            message: 'Cadastro criado com sucesso. Aguarde aprovação.'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/cadastros/:address/approve - Aprovar cadastro (apenas admin)
router.post('/:address/approve', requireAdmin, async (req, res) => {
    try {
        const { address } = req.params;
        const result = await cadastrosService.approveCadastro(address, req.adminAddress);
        
        // Retornar apenas dados anônimos
        res.json({
            id: result.mapping.id,
            address: result.mapping.address,
            approved: true,
            message: 'Cadastro aprovado com sucesso'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/cadastros/:address/reject - Rejeitar cadastro (apenas admin)
router.post('/:address/reject', requireAdmin, async (req, res) => {
    try {
        const { address } = req.params;
        const { motivo } = req.body;
        await cadastrosService.rejectCadastro(address, req.adminAddress, motivo);
        
        res.json({ message: 'Cadastro rejeitado' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/cadastros/:address/tokens - Atualizar tokens (apenas admin)
router.put('/:address/tokens', requireAdmin, async (req, res) => {
    try {
        const { address } = req.params;
        const { amount } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Quantidade inválida' });
        }
        
        const mapping = await cadastrosService.updateTokens(address, amount);
        res.json({
            id: mapping.id,
            address: mapping.address,
            totalTokens: mapping.totalTokens
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;

