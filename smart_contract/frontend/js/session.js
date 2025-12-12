/**
 * Sistema de Sessão para manter conexão entre páginas
 * Usa localStorage para persistir o estado da conexão
 */

const SESSION_KEY = 'dasi_wallet_session';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

/**
 * Salvar sessão de conexão
 */
function saveSession(account, network) {
    const session = {
        account: account,
        network: network || 'ganache',
        timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Carregar sessão de conexão
 */
function loadSession() {
    try {
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (!sessionStr) return null;
        
        const session = JSON.parse(sessionStr);
        
        // Verificar se a sessão expirou
        const now = Date.now();
        if (now - session.timestamp > SESSION_TIMEOUT) {
            clearSession();
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        clearSession();
        return null;
    }
}

/**
 * Limpar sessão
 */
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

/**
 * Verificar se há sessão ativa
 */
function hasActiveSession() {
    const session = loadSession();
    return session !== null;
}

/**
 * Obter conta da sessão
 */
function getSessionAccount() {
    const session = loadSession();
    return session ? session.account : null;
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.SessionManager = {
        save: saveSession,
        load: loadSession,
        clear: clearSession,
        hasActive: hasActiveSession,
        getAccount: getSessionAccount
    };
}




