const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, '../database');
const CADASTROS_FILE = path.join(DB_DIR, 'cadastros.json');
const MAPPINGS_FILE = path.join(DB_DIR, 'wallet_mappings.json');

/**
 * Gerar ID único baseado em hash
 */
function generateId(data) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(data) + Date.now() + Math.random())
        .digest('hex')
        .substring(0, 16);
}

/**
 * Ler cadastros (dados pessoais)
 */
async function getCadastros() {
    try {
        const data = await fs.readFile(CADASTROS_FILE, 'utf8');
        const json = JSON.parse(data);
        return json.cadastros || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

/**
 * Salvar cadastros
 */
async function saveCadastros(cadastros) {
    await fs.writeFile(CADASTROS_FILE, JSON.stringify({ cadastros }, null, 2));
}

/**
 * Ler mapeamentos de carteira
 */
async function getMappings() {
    try {
        const data = await fs.readFile(MAPPINGS_FILE, 'utf8');
        const json = JSON.parse(data);
        return json.mappings || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

/**
 * Salvar mapeamentos
 */
async function saveMappings(mappings) {
    await fs.writeFile(MAPPINGS_FILE, JSON.stringify({ mappings }, null, 2));
}

/**
 * Criar novo cadastro (separando dados pessoais de endereço)
 */
async function createCadastro(cadastroData) {
    const { matricula, nome, email, endereco, assinatura, mensagem } = cadastroData;
    
    // Verificar se já existe
    const cadastros = await getCadastros();
    const mappings = await getMappings();
    
    // Verificar matrícula duplicada
    if (cadastros.some(c => c.matricula === matricula)) {
        throw new Error('Matrícula já cadastrada');
    }
    
    // Verificar endereço duplicado
    if (mappings.some(m => m.address.toLowerCase() === endereco.toLowerCase())) {
        throw new Error('Endereço de carteira já cadastrado');
    }
    
    // Gerar ID único
    const id = generateId({ matricula, endereco, timestamp: Date.now() });
    
    // Separar dados pessoais
    const cadastro = {
        id,
        matricula,
        nome,
        email: email || null,
        status: 'pendente',
        timestamp: Date.now(),
        assinatura,
        mensagem
    };
    
    // Mapeamento anônimo (sem dados pessoais)
    const mapping = {
        id,
        address: endereco.toLowerCase(),
        approved: false,
        totalTokens: '0',
        createdAt: Date.now()
    };
    
    cadastros.push(cadastro);
    mappings.push(mapping);
    
    await saveCadastros(cadastros);
    await saveMappings(mappings);
    
    return { id, cadastro, mapping };
}

/**
 * Obter cadastro por ID (com dados pessoais - apenas para admin)
 */
async function getCadastroById(id) {
    const cadastros = await getCadastros();
    return cadastros.find(c => c.id === id);
}

/**
 * Obter cadastro por endereço (apenas mapeamento, sem dados pessoais)
 */
async function getCadastroByAddress(address) {
    const mappings = await getMappings();
    const mapping = mappings.find(m => m.address.toLowerCase() === address.toLowerCase());
    
    if (!mapping) {
        return null;
    }
    
    // Retornar apenas dados anônimos
    return {
        id: mapping.id,
        address: mapping.address,
        approved: mapping.approved,
        totalTokens: mapping.totalTokens
    };
}

/**
 * Obter todos os cadastros (com dados pessoais - apenas para admin)
 */
async function getAllCadastros() {
    const cadastros = await getCadastros();
    const mappings = await getMappings();
    
    // Combinar dados para admin (com dados pessoais)
    return cadastros.map(cadastro => {
        const mapping = mappings.find(m => m.id === cadastro.id);
        return {
            ...cadastro,
            endereco: mapping ? mapping.address : null,
            totalTokens: mapping ? mapping.totalTokens : '0',
            approved: mapping ? mapping.approved : false
        };
    });
}

/**
 * Obter cadastros pendentes (com dados pessoais - apenas para admin)
 */
async function getPendingCadastros() {
    const cadastros = await getCadastros();
    const mappings = await getMappings();
    
    // Filtrar pendentes e combinar com mappings para incluir endereço
    const pending = cadastros.filter(c => c.status === 'pendente');
    
    return pending.map(cadastro => {
        const mapping = mappings.find(m => m.id === cadastro.id);
        return {
            ...cadastro,
            endereco: mapping ? mapping.address : null,
            address: mapping ? mapping.address : null,
            totalTokens: mapping ? mapping.totalTokens : '0',
            approved: mapping ? mapping.approved : false
        };
    });
}

/**
 * Aprovar cadastro
 */
async function approveCadastro(address, approvedBy) {
    const cadastros = await getCadastros();
    const mappings = await getMappings();
    
    const mapping = mappings.find(m => m.address.toLowerCase() === address.toLowerCase());
    if (!mapping) {
        throw new Error('Cadastro não encontrado');
    }
    
    const cadastro = cadastros.find(c => c.id === mapping.id);
    if (!cadastro) {
        throw new Error('Dados pessoais não encontrados');
    }
    
    if (cadastro.status === 'aprovado') {
        throw new Error('Cadastro já está aprovado');
    }
    
    cadastro.status = 'aprovado';
    cadastro.aprovadoPor = approvedBy;
    cadastro.dataAprovacao = Date.now();
    
    mapping.approved = true;
    
    await saveCadastros(cadastros);
    await saveMappings(mappings);
    
    return { cadastro, mapping };
}

/**
 * Rejeitar cadastro
 */
async function rejectCadastro(address, rejectedBy, motivo) {
    const cadastros = await getCadastros();
    const mappings = await getMappings();
    
    const mapping = mappings.find(m => m.address.toLowerCase() === address.toLowerCase());
    if (!mapping) {
        throw new Error('Cadastro não encontrado');
    }
    
    const cadastro = cadastros.find(c => c.id === mapping.id);
    if (!cadastro) {
        throw new Error('Dados pessoais não encontrados');
    }
    
    cadastro.status = 'rejeitado';
    cadastro.rejeitadoPor = rejectedBy;
    cadastro.dataRejeicao = Date.now();
    cadastro.motivoRejeicao = motivo || null;
    
    await saveCadastros(cadastros);
    
    return cadastro;
}

/**
 * Atualizar tokens de um cadastro
 */
async function updateTokens(address, amount) {
    const mappings = await getMappings();
    const mapping = mappings.find(m => m.address.toLowerCase() === address.toLowerCase());
    
    if (!mapping) {
        throw new Error('Cadastro não encontrado');
    }
    
    const currentTotal = parseFloat(mapping.totalTokens || '0');
    mapping.totalTokens = (currentTotal + parseFloat(amount)).toString();
    mapping.tokensDistribuidos = true;
    mapping.dataDistribuicao = Date.now();
    
    await saveMappings(mappings);
    
    return mapping;
}

/**
 * Verificar se endereço tem acesso (apenas verificação anônima)
 */
async function hasAccess(address) {
    const mappings = await getMappings();
    const mapping = mappings.find(m => m.address.toLowerCase() === address.toLowerCase());
    return mapping ? mapping.approved : false;
}

module.exports = {
    createCadastro,
    getCadastroById,
    getCadastroByAddress,
    getAllCadastros,
    getPendingCadastros,
    approveCadastro,
    rejectCadastro,
    updateTokens,
    hasAccess
};

