/**
 * Sistema de Controle de Acesso
 * Gerencia deployer, owners e aprovação de cadastros
 */

const ACCESS_CONTROL_KEY = 'dasi_access_control';
const CADASTROS_KEY = 'dasi_cadastros';

/**
 * Inicializar sistema de controle de acesso
 * Cria estrutura inicial se não existir
 */
function initAccessControl() {
    const deployer = CONFIG.DEPLOYER_ADDRESS;
    
    let accessControl = getAccessControl();
    
    // Se não existe, criar estrutura inicial
    if (!accessControl) {
        accessControl = {
            deployer: deployer,
            owners: CONFIG.OWNERS || [],
            initialized: true,
            createdAt: Date.now()
        };
        saveAccessControl(accessControl);
    }
    
    return accessControl;
}

/**
 * Obter controle de acesso
 */
function getAccessControl() {
    try {
        const data = localStorage.getItem(ACCESS_CONTROL_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao ler controle de acesso:', error);
        return null;
    }
}

/**
 * Salvar controle de acesso
 */
function saveAccessControl(accessControl) {
    try {
        localStorage.setItem(ACCESS_CONTROL_KEY, JSON.stringify(accessControl));
    } catch (error) {
        console.error('Erro ao salvar controle de acesso:', error);
        throw error;
    }
}

/**
 * Verificar se uma conta é deployer
 */
function isDeployer(address) {
    if (!address) return false;
    const accessControl = getAccessControl();
    if (!accessControl) return false;
    return address.toLowerCase() === accessControl.deployer.toLowerCase();
}

/**
 * Verificar se uma conta é owner
 */
function isOwner(address) {
    if (!address) return false;
    const accessControl = getAccessControl();
    if (!accessControl) return false;
    
    const addressLower = address.toLowerCase();
    return accessControl.owners.some(owner => 
        owner.toLowerCase() === addressLower
    );
}

/**
 * Verificar se uma conta tem acesso administrativo (deployer ou owner)
 */
function hasAdminAccess(address) {
    return isDeployer(address) || isOwner(address);
}

/**
 * Adicionar um novo owner (apenas deployer pode fazer isso)
 */
function addOwner(newOwnerAddress, addedBy) {
    if (!hasAdminAccess(addedBy)) {
        throw new Error('Apenas deployer ou owners podem adicionar novos owners');
    }
    
    if (!ethers.utils.isAddress(newOwnerAddress)) {
        throw new Error('Endereço inválido');
    }
    
    const accessControl = getAccessControl();
    if (!accessControl) {
        throw new Error('Sistema de controle de acesso não inicializado');
    }
    
    const newOwnerLower = newOwnerAddress.toLowerCase();
    
    // Verificar se já é owner
    if (isOwner(newOwnerAddress)) {
        throw new Error('Este endereço já é um owner');
    }
    
    // Verificar se é o deployer
    if (isDeployer(newOwnerAddress)) {
        throw new Error('O deployer não precisa ser adicionado como owner');
    }
    
    accessControl.owners.push(newOwnerAddress);
    saveAccessControl(accessControl);
    
    return true;
}

/**
 * Remover um owner (apenas deployer pode fazer isso)
 */
function removeOwner(ownerAddress, removedBy) {
    if (!isDeployer(removedBy)) {
        throw new Error('Apenas o deployer pode remover owners');
    }
    
    const accessControl = getAccessControl();
    if (!accessControl) {
        throw new Error('Sistema de controle de acesso não inicializado');
    }
    
    const ownerLower = ownerAddress.toLowerCase();
    accessControl.owners = accessControl.owners.filter(owner => 
        owner.toLowerCase() !== ownerLower
    );
    
    saveAccessControl(accessControl);
    return true;
}

/**
 * Obter lista de owners
 */
function getOwners() {
    const accessControl = getAccessControl();
    if (!accessControl) return [];
    return accessControl.owners;
}

/**
 * Obter deployer
 */
function getDeployer() {
    const accessControl = getAccessControl();
    if (!accessControl) return null;
    return accessControl.deployer;
}

/**
 * Obter cadastros
 */
function getCadastros() {
    try {
        const cadastros = localStorage.getItem(CADASTROS_KEY);
        return cadastros ? JSON.parse(cadastros) : [];
    } catch (error) {
        console.error('Erro ao ler cadastros:', error);
        return [];
    }
}

/**
 * Salvar cadastros
 */
function saveCadastros(cadastrosArray) {
    try {
        localStorage.setItem(CADASTROS_KEY, JSON.stringify(cadastrosArray));
    } catch (error) {
        console.error('Erro ao salvar cadastros:', error);
        throw error;
    }
}

/**
 * Aprovar um cadastro
 */
function approveCadastro(endereco, approvedBy) {
    if (!hasAdminAccess(approvedBy)) {
        throw new Error('Apenas deployer ou owners podem aprovar cadastros');
    }
    
    const cadastros = getCadastros();
    const cadastro = cadastros.find(c => 
        c.endereco.toLowerCase() === endereco.toLowerCase()
    );
    
    if (!cadastro) {
        throw new Error('Cadastro não encontrado');
    }
    
    if (cadastro.status === 'aprovado') {
        throw new Error('Cadastro já está aprovado');
    }
    
    cadastro.status = 'aprovado';
    cadastro.aprovadoPor = approvedBy;
    cadastro.dataAprovacao = Date.now();
    
    saveCadastros(cadastros);
    return cadastro;
}

/**
 * Rejeitar um cadastro
 */
function rejectCadastro(endereco, rejectedBy, motivo = '') {
    if (!hasAdminAccess(rejectedBy)) {
        throw new Error('Apenas deployer ou owners podem rejeitar cadastros');
    }
    
    const cadastros = getCadastros();
    const cadastro = cadastros.find(c => 
        c.endereco.toLowerCase() === endereco.toLowerCase()
    );
    
    if (!cadastro) {
        throw new Error('Cadastro não encontrado');
    }
    
    cadastro.status = 'rejeitado';
    cadastro.rejeitadoPor = rejectedBy;
    cadastro.dataRejeicao = Date.now();
    cadastro.motivoRejeicao = motivo;
    
    saveCadastros(cadastros);
    return cadastro;
}

/**
 * Verificar se um endereço está aprovado
 */
function isCadastroAprovado(endereco) {
    if (!endereco) return false;
    
    const cadastros = getCadastros();
    const cadastro = cadastros.find(c => 
        c.endereco.toLowerCase() === endereco.toLowerCase()
    );
    
    if (!cadastro) return false;
    
    return cadastro.status === 'aprovado';
}

/**
 * Verificar se um endereço pode acessar o sistema
 * Retorna true se:
 * - É deployer ou owner (acesso total)
 * - Tem cadastro aprovado
 */
function canAccessSystem(address) {
    if (!address) return false;
    
    // Deployer e owners têm acesso total
    if (hasAdminAccess(address)) {
        return true;
    }
    
    // Verificar se tem cadastro aprovado
    return isCadastroAprovado(address);
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.AccessControl = {
        init: initAccessControl,
        isDeployer: isDeployer,
        isOwner: isOwner,
        hasAdminAccess: hasAdminAccess,
        addOwner: addOwner,
        removeOwner: removeOwner,
        getOwners: getOwners,
        getDeployer: getDeployer,
        approveCadastro: approveCadastro,
        rejectCadastro: rejectCadastro,
        isCadastroAprovado: isCadastroAprovado,
        canAccessSystem: canAccessSystem,
        getCadastros: getCadastros,
        saveCadastros: saveCadastros
    };
}


