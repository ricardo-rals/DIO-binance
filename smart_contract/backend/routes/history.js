const express = require('express');
const router = express.Router();
const historyService = require('../services/history');
const accessControlService = require('../services/access-control');

// Middleware para verificar admin
async function requireAdmin(req, res, next) {
    const adminAddress = req.headers['x-admin-address'];
    
    if (!adminAddress) {
        return res.status(401).json({ error: 'Endereço de admin não fornecido' });
    }
    
    const hasAccess = await accessControlService.hasAdminAccess(adminAddress);
    if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    
    req.adminAddress = adminAddress;
    next();
}

// GET /api/history - Obter histórico (apenas admin, sem dados pessoais)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { filter = 'all' } = req.query;
        const history = await historyService.getFilteredHistory(filter);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/history - Adicionar registro (apenas admin)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { id, address, amount, type } = req.body;
        
        if (!id || !address || !amount || !type) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const record = await historyService.addRecord({
            id,
            address,
            amount,
            type,
            admin: req.adminAddress
        });
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

