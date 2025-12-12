const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Importar rotas
const cadastrosRoutes = require('./routes/cadastros');
const historyRoutes = require('./routes/history');
const accessControlRoutes = require('./routes/access-control');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Criar diretório de database se não existir
const DB_DIR = path.join(__dirname, 'database');
async function ensureDatabaseDir() {
    try {
        await fs.mkdir(DB_DIR, { recursive: true });
        
        // Inicializar arquivos JSON se não existirem
        const files = {
            'cadastros.json': { cadastros: [] },
            'wallet_mappings.json': { mappings: [] },
            'distribution_history.json': { history: [] },
            'access_control.json': { deployer: null, owners: [] }
        };
        
        for (const [filename, defaultData] of Object.entries(files)) {
            const filepath = path.join(DB_DIR, filename);
            try {
                await fs.access(filepath);
            } catch {
                await fs.writeFile(filepath, JSON.stringify(defaultData, null, 2));
                console.log(`✅ Criado arquivo: ${filename}`);
            }
        }
    } catch (error) {
        console.error('Erro ao criar diretório de database:', error);
    }
}

// Rotas
app.use('/api/cadastros', cadastrosRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/access-control', accessControlRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'DASI Backend API is running' });
});

// Inicializar servidor
async function startServer() {
    await ensureDatabaseDir();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📁 Database em: ${DB_DIR}`);
    });
}

startServer().catch(console.error);

