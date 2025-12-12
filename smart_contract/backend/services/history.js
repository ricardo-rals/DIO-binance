const fs = require('fs').promises;
const path = require('path');

const DB_DIR = path.join(__dirname, '../database');
const HISTORY_FILE = path.join(DB_DIR, 'distribution_history.json');

/**
 * Obter histórico completo
 */
async function getHistory() {
    try {
        const data = await fs.readFile(HISTORY_FILE, 'utf8');
        const json = JSON.parse(data);
        return json.history || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

/**
 * Salvar histórico
 */
async function saveHistory(history) {
    // Manter apenas os últimos 1000 registros
    const limited = history.slice(0, 1000);
    await fs.writeFile(HISTORY_FILE, JSON.stringify({ history: limited }, null, 2));
}

/**
 * Adicionar registro ao histórico (SEM dados pessoais)
 */
async function addRecord(record) {
    const history = await getHistory();
    
    // Garantir que não há dados pessoais
    const cleanRecord = {
        id: record.id, // ID hash, não nome/matrícula
        address: record.address, // Apenas endereço
        amount: record.amount,
        type: record.type, // 'approval' ou 'manual'
        timestamp: record.timestamp || new Date().toISOString(),
        admin: record.admin // Endereço do admin que fez a distribuição
    };
    
    history.unshift(cleanRecord);
    await saveHistory(history);
    
    return cleanRecord;
}

/**
 * Obter histórico filtrado
 */
async function getFilteredHistory(filter = 'all') {
    const history = await getHistory();
    
    if (filter === 'all') {
        return history;
    }
    
    return history.filter(h => h.type === filter);
}

module.exports = {
    getHistory,
    addRecord,
    getFilteredHistory
};

