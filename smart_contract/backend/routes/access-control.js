const express = require('express');
const router = express.Router();
const accessControlService = require('../services/access-control');

// Middleware para verificar deployer
async function requireDeployer(req, res, next) {
    const deployerAddress = req.headers['x-admin-address'];
    
    if (!deployerAddress) {
        return res.status(401).json({ error: 'Endereço não fornecido' });
    }
    
    const isDeployer = await accessControlService.isDeployer(deployerAddress);
    if (!isDeployer) {
        return res.status(403).json({ error: 'Apenas deployer pode executar esta ação' });
    }
    
    req.deployerAddress = deployerAddress;
    next();
}

// GET /api/access-control/check - Verificar acesso
router.get('/check', async (req, res) => {
    try {
        const address = req.query.address || req.headers['x-admin-address'];
        
        if (!address) {
            return res.status(400).json({ error: 'Endereço não fornecido' });
        }
        
        const isDeployer = await accessControlService.isDeployer(address);
        const isOwner = await accessControlService.isOwner(address);
        const hasAdmin = await accessControlService.hasAdminAccess(address);
        
        res.json({
            address,
            isDeployer,
            isOwner,
            hasAdminAccess: hasAdmin
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/access-control/deployer - Definir deployer (apenas se não existir)
router.post('/deployer', async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Endereço não fornecido' });
        }
        
        const currentDeployer = await accessControlService.getDeployer();
        if (currentDeployer) {
            return res.status(400).json({ error: 'Deployer já definido' });
        }
        
        await accessControlService.setDeployer(address);
        res.json({ message: 'Deployer definido com sucesso', deployer: address });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/access-control/deployer - Obter deployer (apenas admin)
router.get('/deployer', async (req, res) => {
    try {
        const adminAddress = req.headers['x-admin-address'] || req.query.address;
        
        if (!adminAddress) {
            return res.status(401).json({ error: 'Endereço não fornecido. Envie o header x-admin-address ou o parâmetro address na query string.' });
        }
        
        const hasAccess = await accessControlService.hasAdminAccess(adminAddress);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        const deployer = await accessControlService.getDeployer();
        res.json({ deployer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/access-control/owners - Obter owners (apenas admin)
router.get('/owners', async (req, res) => {
    try {
        const adminAddress = req.headers['x-admin-address'] || req.query.address;
        
        if (!adminAddress) {
            return res.status(401).json({ error: 'Endereço não fornecido. Envie o header x-admin-address ou o parâmetro address na query string.' });
        }
        
        const hasAccess = await accessControlService.hasAdminAccess(adminAddress);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        const owners = await accessControlService.getOwners();
        res.json(owners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/access-control/owners - Adicionar owner (apenas deployer)
router.post('/owners', requireDeployer, async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Endereço não fornecido' });
        }
        
        await accessControlService.addOwner(address);
        res.json({ message: 'Owner adicionado com sucesso', address });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/access-control/owners/:address - Remover owner (apenas deployer)
router.delete('/owners/:address', requireDeployer, async (req, res) => {
    try {
        const { address } = req.params;
        await accessControlService.removeOwner(address);
        res.json({ message: 'Owner removido com sucesso' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/access-control/reset-database - Resetar banco de dados (apenas deployer)
router.post('/reset-database', requireDeployer, async (req, res) => {
    try {
        const result = await accessControlService.resetDatabase();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

