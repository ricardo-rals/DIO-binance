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
async function isDeployer(address) {
    if (!address) return false;
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        console.warn('API não disponível para verificar deployer');
        return false;
    }
    
    try {
        const result = await window.APIClient.checkAdminAccess(address);
        return result.isDeployer || false;
    } catch (error) {
        console.warn('Erro ao verificar deployer via API:', error);
        return false;
    }
}

/**
 * Verificar se uma conta é owner
 */
async function isOwner(address) {
    if (!address) return false;
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        console.warn('API não disponível para verificar owner');
        return false;
    }
    
    try {
        const result = await window.APIClient.checkAdminAccess(address);
        return result.isOwner || false;
    } catch (error) {
        console.warn('Erro ao verificar owner via API:', error);
        return false;
    }
}

/**
 * Verificar se uma conta tem acesso administrativo (deployer ou owner)
 */
async function hasAdminAccess(address) {
    if (!address) return false;
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        console.warn('API não disponível para verificar acesso admin');
        return false;
    }
    
    try {
        const result = await window.APIClient.checkAdminAccess(address);
        const hasAccess = result && result.hasAdminAccess === true;
        console.log(`Verificação de admin para ${address}:`, { hasAccess, result });
        return hasAccess;
    } catch (error) {
        console.log(`Erro ao verificar acesso admin para ${address}:`, error.message);
        return false;
    }
}

/**
 * Adicionar um novo owner (apenas deployer pode fazer isso)
 */
async function addOwner(newOwnerAddress, addedBy) {
    if (!(await hasAdminAccess(addedBy))) {
        throw new Error('Apenas deployer ou owners podem adicionar novos owners');
    }
    
    if (!ethers.utils.isAddress(newOwnerAddress)) {
        throw new Error('Endereço inválido');
    }
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    if (!(await isDeployer(addedBy))) {
        throw new Error('Apenas o deployer pode adicionar owners');
    }
    
    try {
        await window.APIClient.addOwner(newOwnerAddress);
        return true;
    } catch (error) {
        console.error('Erro ao adicionar owner via API:', error);
        throw error;
    }
}

/**
 * Remover um owner (apenas deployer pode fazer isso)
 */
async function removeOwner(ownerAddress, removedBy) {
    if (!(await isDeployer(removedBy))) {
        throw new Error('Apenas o deployer pode remover owners');
    }
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    try {
        await window.APIClient.removeOwner(ownerAddress);
        return true;
    } catch (error) {
        console.error('Erro ao remover owner via API:', error);
        throw error;
    }
}

/**
 * Obter lista de owners
 */
async function getOwners() {
    // Usar API (obrigatório)
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    try {
        const owners = await window.APIClient.getOwners();
        return Array.isArray(owners) ? owners : [];
    } catch (error) {
        console.error('Erro ao obter owners via API:', error);
        throw error;
    }
}

/**
 * Obter deployer
 */
async function getDeployer() {
    // Usar API (obrigatório)
    if (window.APIClient && window.currentAccount) {
        try {
            const deployer = await window.APIClient.getDeployer();
            return deployer;
        } catch (error) {
            console.error('Erro ao obter deployer via API:', error);
        }
    }
    
    // Fallback para localStorage
    const accessControl = getAccessControl();
    if (!accessControl) return null;
    return accessControl.deployer;
}

/**
 * Obter cadastros (compatibilidade - usar API quando disponível)
 */
async function getCadastros() {
    // Tentar usar API se disponível (apenas admin)
    if (window.APIClient && window.currentAccount) {
        try {
            return await window.APIClient.getCadastros();
        } catch (error) {
            console.warn('Erro ao obter cadastros via API:', error);
        }
    }
    
    // Fallback para localStorage
    try {
        const cadastros = localStorage.getItem(CADASTROS_KEY);
        return cadastros ? JSON.parse(cadastros) : [];
    } catch (error) {
        console.error('Erro ao ler cadastros:', error);
        return [];
    }
}

/**
 * Salvar cadastros (não usado mais - dados são salvos via API)
 */
function saveCadastros(cadastrosArray) {
    console.warn('saveCadastros não deve ser usado. Use a API diretamente.');
    // Esta função é mantida apenas para compatibilidade, mas não faz nada
}

/**
 * Aprovar um cadastro
 */
async function approveCadastro(endereco, approvedBy) {
    if (!(await hasAdminAccess(approvedBy))) {
        throw new Error('Apenas deployer ou owners podem aprovar cadastros');
    }
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    try {
        await window.APIClient.approveCadastro(endereco);
        // Buscar cadastro atualizado
        const cadastros = await window.APIClient.getCadastros();
        return cadastros.find(c => 
            (c.endereco?.toLowerCase() === endereco.toLowerCase()) ||
            (c.address?.toLowerCase() === endereco.toLowerCase())
        );
    } catch (error) {
        console.error('Erro ao aprovar cadastro via API:', error);
        throw error;
    }
}

/**
 * Rejeitar um cadastro
 */
async function rejectCadastro(endereco, rejectedBy, motivo = '') {
    if (!(await hasAdminAccess(rejectedBy))) {
        throw new Error('Apenas deployer ou owners podem rejeitar cadastros');
    }
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    try {
        await window.APIClient.rejectCadastro(endereco, motivo);
        // Buscar cadastro atualizado
        const cadastros = await window.APIClient.getCadastros();
        return cadastros.find(c => 
            (c.endereco?.toLowerCase() === endereco.toLowerCase()) ||
            (c.address?.toLowerCase() === endereco.toLowerCase())
        );
    } catch (error) {
        console.error('Erro ao rejeitar cadastro via API:', error);
        throw error;
    }
}

/**
 * Verificar se um endereço está aprovado
 */
async function isCadastroAprovado(endereco) {
    if (!endereco) return false;
    
    // Usar API (obrigatório)
    if (!window.APIClient) {
        console.warn('API não disponível para verificar acesso');
        return false;
    }
    
    try {
        const result = await window.APIClient.checkAccess(endereco);
        // Se não encontrou cadastro, result.approved será false (não é erro)
        // Garantir que retorna boolean
        const approved = result && result.approved === true;
        console.log(`Verificação de cadastro para ${endereco}:`, { approved, result });
        return approved;
    } catch (error) {
        // Qualquer erro significa que não está cadastrado ou não tem acesso
        console.log(`Erro ao verificar cadastro para ${endereco}:`, error.message);
        return false;
    }
}

/**
 * Verificar se um endereço pode acessar o sistema
 * Retorna true se:
 * - É deployer ou owner (acesso total)
 * - Tem cadastro aprovado
 */
async function canAccessSystem(address) {
    if (!address) return false;
    
    // Verificar se API está disponível
    if (!window.APIClient) {
        console.warn('API não disponível - negando acesso por segurança');
        return false;
    }
    
    try {
        // Deployer e owners têm acesso total
        const hasAdmin = await hasAdminAccess(address);
        if (hasAdmin) {
            return true;
        }
        
        // Verificar se tem cadastro aprovado
        const isAprovado = await isCadastroAprovado(address);
        return isAprovado;
    } catch (error) {
        console.error('Erro ao verificar acesso ao sistema:', error);
        // Em caso de erro, negar acesso por segurança
        return false;
    }
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


