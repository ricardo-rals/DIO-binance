// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Classe para gerenciar requisições à API
 */
class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    /**
     * Fazer requisição HTTP
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Adicionar endereço do admin se disponível
        // Tenta obter de várias fontes
        const adminAddress = window.currentAccount || 
                            (typeof currentAccount !== 'undefined' ? currentAccount : null);
        
        if (adminAddress) {
            config.headers['x-admin-address'] = adminAddress;
        } else {
            // Para endpoints que não requerem admin, não adicionar o header
            // Mas para endpoints que requerem, isso causará erro no backend (o que é esperado)
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição API:', error);
            throw error;
        }
    }

    // ==================== CADASTROS ====================

    /**
     * Obter todos os cadastros (apenas admin, com dados pessoais)
     */
    async getCadastros() {
        return this.request('/cadastros');
    }

    /**
     * Obter cadastros pendentes (apenas admin)
     */
    async getPendingCadastros() {
        return this.request('/cadastros/pending');
    }

    /**
     * Verificar acesso por endereço (público, sem dados pessoais)
     */
    async checkAccess(address) {
        return this.request(`/cadastros/address/${address}`);
    }

    /**
     * Criar novo cadastro (público)
     */
    async createCadastro(cadastroData) {
        return this.request('/cadastros', {
            method: 'POST',
            body: JSON.stringify(cadastroData)
        });
    }

    /**
     * Aprovar cadastro (apenas admin)
     */
    async approveCadastro(address) {
        return this.request(`/cadastros/${address}/approve`, {
            method: 'POST'
        });
    }

    /**
     * Rejeitar cadastro (apenas admin)
     */
    async rejectCadastro(address, motivo) {
        return this.request(`/cadastros/${address}/reject`, {
            method: 'POST',
            body: JSON.stringify({ motivo })
        });
    }

    /**
     * Atualizar tokens de um cadastro (apenas admin)
     */
    async updateTokens(address, amount) {
        return this.request(`/cadastros/${address}/tokens`, {
            method: 'PUT',
            body: JSON.stringify({ amount })
        });
    }

    // ==================== HISTÓRICO ====================

    /**
     * Obter histórico (apenas admin)
     */
    async getHistory(filter = 'all') {
        return this.request(`/history?filter=${filter}`);
    }

    /**
     * Adicionar registro ao histórico (apenas admin)
     */
    async addHistoryRecord(record) {
        return this.request('/history', {
            method: 'POST',
            body: JSON.stringify(record)
        });
    }

    // ==================== ACCESS CONTROL ====================

    /**
     * Verificar acesso admin
     */
    async checkAdminAccess(address) {
        return this.request(`/access-control/check?address=${address}`);
    }

    /**
     * Definir deployer (apenas se não existir)
     */
    async setDeployer(address) {
        return this.request('/access-control/deployer', {
            method: 'POST',
            body: JSON.stringify({ address })
        });
    }

    /**
     * Obter deployer (apenas admin)
     */
    async getDeployer() {
        const result = await this.request('/access-control/deployer');
        return result.deployer;
    }

    /**
     * Obter owners (apenas admin)
     */
    async getOwners() {
        return this.request('/access-control/owners');
    }

    /**
     * Adicionar owner (apenas deployer)
     */
    async addOwner(address) {
        return this.request('/access-control/owners', {
            method: 'POST',
            body: JSON.stringify({ address })
        });
    }

    /**
     * Remover owner (apenas deployer)
     */
    async removeOwner(address) {
        return this.request(`/access-control/owners/${address}`, {
            method: 'DELETE'
        });
    }

    /**
     * Resetar banco de dados (apenas deployer)
     */
    async resetDatabase() {
        return this.request('/access-control/reset-database', {
            method: 'POST'
        });
    }

    // ==================== HEALTH CHECK ====================

    /**
     * Verificar se API está online
     */
    async healthCheck() {
        try {
            return await this.request('/health');
        } catch (error) {
            return null;
        }
    }
}

// Criar instância global
window.APIClient = new APIClient();

