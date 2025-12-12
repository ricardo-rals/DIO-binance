const fs = require('fs').promises;
const path = require('path');

const DB_DIR = path.join(__dirname, '../database');
const ACCESS_CONTROL_FILE = path.join(DB_DIR, 'access_control.json');

/**
 * Obter dados de controle de acesso
 */
async function getAccessControl() {
    try {
        const data = await fs.readFile(ACCESS_CONTROL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { deployer: null, owners: [] };
        }
        throw error;
    }
}

/**
 * Salvar dados de controle de acesso
 */
async function saveAccessControl(data) {
    await fs.writeFile(ACCESS_CONTROL_FILE, JSON.stringify(data, null, 2));
}

/**
 * Definir deployer
 */
async function setDeployer(address) {
    const data = await getAccessControl();
    data.deployer = address.toLowerCase();
    await saveAccessControl(data);
    return data;
}

/**
 * Obter deployer
 */
async function getDeployer() {
    const data = await getAccessControl();
    return data.deployer;
}

/**
 * Adicionar owner
 */
async function addOwner(address) {
    const data = await getAccessControl();
    const addressLower = address.toLowerCase();
    
    if (data.owners.includes(addressLower)) {
        throw new Error('Owner já existe');
    }
    
    data.owners.push(addressLower);
    await saveAccessControl(data);
    return data;
}

/**
 * Remover owner
 */
async function removeOwner(address) {
    const data = await getAccessControl();
    const addressLower = address.toLowerCase();
    
    data.owners = data.owners.filter(o => o !== addressLower);
    await saveAccessControl(data);
    return data;
}

/**
 * Verificar se é deployer
 */
async function isDeployer(address) {
    if (!address) return false;
    const data = await getAccessControl();
    // Se não há deployer definido, retornar false
    if (!data.deployer) return false;
    return data.deployer.toLowerCase() === address.toLowerCase();
}

/**
 * Verificar se é owner
 */
async function isOwner(address) {
    const data = await getAccessControl();
    return data.owners.some(o => o.toLowerCase() === address.toLowerCase());
}

/**
 * Verificar se tem acesso admin (deployer ou owner)
 */
async function hasAdminAccess(address) {
    if (!address) return false;
    const isDeployerResult = await isDeployer(address);
    const isOwnerResult = await isOwner(address);
    return isDeployerResult || isOwnerResult;
}

/**
 * Obter todos os owners
 */
async function getOwners() {
    const data = await getAccessControl();
    return data.owners;
}

/**
 * Resetar banco de dados (limpar todos os arquivos JSON)
 */
async function resetDatabase() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const DB_DIR = path.join(__dirname, '../database');
    
    // Resetar arquivos JSON para valores padrão
    const files = {
        'cadastros.json': { cadastros: [] },
        'wallet_mappings.json': { mappings: [] },
        'distribution_history.json': { history: [] }
        // access_control.json não é resetado - mantém deployer e owners
    };
    
    for (const [filename, defaultData] of Object.entries(files)) {
        const filepath = path.join(DB_DIR, filename);
        await fs.writeFile(filepath, JSON.stringify(defaultData, null, 2));
    }
    
    // Retornar confirmação
    return {
        message: 'Banco de dados resetado com sucesso',
        resetFiles: Object.keys(files)
    };
}

module.exports = {
    setDeployer,
    getDeployer,
    addOwner,
    removeOwner,
    isDeployer,
    isOwner,
    hasAdminAccess,
    getOwners,
    resetDatabase
};

