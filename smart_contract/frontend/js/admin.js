// Verificar se ethers está carregado
if (typeof ethers === 'undefined') {
    console.error('ethers.js não foi carregado!');
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erro ao carregar ethers.js</h1></div>';
    throw new Error('ethers.js não está disponível');
}

// Variáveis globais
let provider;
let signer;
let currentAccount = null;
let tokenContract = null;
let daoContract = null;
let cadastros = [];
let selectedCadastros = new Set();

// Elementos do DOM
const connectBtn = document.getElementById('connect-wallet-btn');
const disconnectBtn = document.getElementById('disconnect-wallet-btn');
const accountDisplay = document.getElementById('account-display');
const balanceDisplay = document.getElementById('token-balance');
const balanceAmount = document.getElementById('balance-amount');
const authSection = document.getElementById('auth-section');
const authStatus = document.getElementById('auth-status');
const dashboardSection = document.getElementById('dashboard-section');
const cadastrosContainer = document.getElementById('cadastros-container');
const totalCadastros = document.getElementById('total-cadastros');
const pendentes = document.getElementById('pendentes');
const distribuidos = document.getElementById('distribuidos');
const selectedCount = document.getElementById('selected-count');
const distributeBtn = document.getElementById('distribute-tokens-btn');
const distributionStatus = document.getElementById('distribution-status');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const searchInput = document.getElementById('search-input');

// Inicialização
window.addEventListener('load', async () => {
    // Inicializar sistema de controle de acesso
    if (window.AccessControl) {
        window.AccessControl.init();
    }
    
    await checkConnection();
});

// Flag para controlar reconexão automática
let autoReconnectEnabled = false;

// Verificar se já está conectado via sessão
async function checkConnection() {
    // Verificar se há sessão ativa
    const session = window.SessionManager ? window.SessionManager.load() : null;
    if (session && session.account) {
        // Tentar reconectar usando a sessão
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0 && accounts[0].toLowerCase() === session.account.toLowerCase()) {
                    autoReconnectEnabled = true;
                    await connectWallet();
                } else {
                    // Conta mudou, limpar sessão
                    if (window.SessionManager) window.SessionManager.clear();
                }
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            if (window.SessionManager) window.SessionManager.clear();
        }
    }
}

// Conectar carteira
connectBtn.addEventListener('click', async () => {
    await connectWallet();
});

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask não encontrado! Por favor, instale o MetaMask.');
        window.open('https://metamask.io/download/', '_blank');
        return;
    }

    try {
        // Reabilitar reconexão automática ao conectar manualmente
        autoReconnectEnabled = true;
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            alert('Nenhuma conta encontrada no MetaMask!');
            return;
        }

        currentAccount = accounts[0];
        // Tornar disponível globalmente para a API
        window.currentAccount = currentAccount;
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Verificar conexão com a rede
        try {
            const network = await provider.getNetwork();
            console.log('Rede conectada:', network);
            
            // Verificar se está na rede correta (Ganache = chainId 1337)
            if (network.chainId !== 1337) {
                console.warn('⚠️ Você não está conectado à rede Ganache (chainId 1337). ChainId atual:', network.chainId);
            }
        } catch (error) {
            console.error('Erro ao verificar rede:', error);
            throw new Error('Não foi possível conectar à rede. Certifique-se de que o Ganache está rodando.');
        }

        // Verificar se os endereços estão configurados
        if (CONFIG.TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000" ||
            CONFIG.DAO_ADDRESS === "0x0000000000000000000000000000000000000000") {
            alert('Por favor, atualize os endereços dos contratos em config.js após o deploy!');
            return;
        }
        
        // Inicializar contrato de token
        const fullTokenABI = [
            ...CONFIG.TOKEN_ABI,
            "function authorizedMinters(address) view returns (bool)"
        ];
        tokenContract = new ethers.Contract(
            CONFIG.TOKEN_ADDRESS,
            fullTokenABI,
            signer
        );
        
        // Inicializar contrato DAO
        daoContract = new ethers.Contract(
            CONFIG.DAO_ADDRESS,
            CONFIG.DAO_ABI,
            signer
        );
        
        // Verificar se os contratos existem (verificando código no endereço)
        try {
            const tokenCode = await provider.getCode(CONFIG.TOKEN_ADDRESS);
            const daoCode = await provider.getCode(CONFIG.DAO_ADDRESS);
            
            if (tokenCode === '0x' || tokenCode === '0x0') {
                throw new Error(`Contrato DASIToken não encontrado no endereço ${CONFIG.TOKEN_ADDRESS}. Faça o deploy novamente.`);
            }
            if (daoCode === '0x' || daoCode === '0x0') {
                throw new Error(`Contrato DASIDAO não encontrado no endereço ${CONFIG.DAO_ADDRESS}. Faça o deploy novamente.`);
            }
        } catch (error) {
            console.error('Erro ao verificar contratos:', error);
            throw new Error('Não foi possível verificar os contratos. Certifique-se de que o Ganache está rodando e os contratos foram deployados.');
        }
        
        // Verificar se tem permissão de minter (opcional, não crítico)
        try {
            const isMinter = await tokenContract.authorizedMinters(currentAccount);
            if (!isMinter) {
                console.warn('⚠️ Conta não tem permissão de minter. Certifique-se de que a conta foi adicionada como minter no contrato DASIToken.');
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível verificar permissão de minter:', error.message);
            // Não bloqueia o fluxo, apenas avisa
        }
        
        console.log('Contratos inicializados:', {
            token: CONFIG.TOKEN_ADDRESS,
            dao: CONFIG.DAO_ADDRESS
        });

        // Salvar sessão
        if (window.SessionManager) {
            window.SessionManager.save(currentAccount, 'ganache');
        }
        
        // Atualizar UI
        accountDisplay.textContent = `Conectado: ${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        authSection.style.display = 'block';
        
        // Garantir que window.currentAccount está definido antes de fazer requisições
        if (currentAccount && !window.currentAccount) {
            window.currentAccount = currentAccount;
        }
        
        // Carregar saldo
        await loadTokenBalance();
        
        // Verificar autorização
        await checkAuthorization();
        
    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        alert('Erro ao conectar carteira: ' + error.message);
    }
}

// Desconectar
disconnectBtn.addEventListener('click', () => {
    disconnectWallet();
});

function disconnectWallet() {
    // Desabilitar reconexão automática
    autoReconnectEnabled = false;
    
    // Limpar sessão
    if (window.SessionManager) {
        window.SessionManager.clear();
    }
    
    currentAccount = null;
    window.currentAccount = null;
    provider = null;
    signer = null;
    tokenContract = null;
    daoContract = null;
    tokenContract = null;
    selectedCadastros.clear();
    
    accountDisplay.textContent = 'Não conectado';
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    balanceDisplay.style.display = 'none';
    authSection.style.display = 'none';
    dashboardSection.style.display = 'none';
}

// Carregar saldo
async function loadTokenBalance() {
    if (!currentAccount || !tokenContract) return;
    
    try {
        const balance = await tokenContract.balanceOf(currentAccount);
        balanceAmount.textContent = ethers.utils.formatEther(balance);
        balanceDisplay.style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
    }
}

// Verificar autorização
async function checkAuthorization() {
    if (!currentAccount) return;
    
    // Garantir que window.currentAccount está definido
    if (currentAccount && !window.currentAccount) {
        window.currentAccount = currentAccount;
    }
    
    // Inicializar sistema de controle de acesso
    if (window.AccessControl) {
        window.AccessControl.init();
    }
    
    const hasAdmin = window.AccessControl ? 
        await window.AccessControl.hasAdminAccess(currentAccount) : false;
    const isDeployer = window.AccessControl ? 
        await window.AccessControl.isDeployer(currentAccount) : false;
    
    if (hasAdmin) {
        const role = isDeployer ? 'Deployer' : 'Owner/Diretor';
        authStatus.innerHTML = `
            <div style="background: #c6f6d5; padding: 15px; border-radius: 8px; border-left: 4px solid #48bb78;">
                <h3 style="color: #22543d; margin: 0;">✅ Autorizado - ${role}</h3>
                <p style="color: #22543d; margin: 5px 0 0 0;">Você tem acesso total ao sistema administrativo.</p>
            </div>
        `;
        
        // Mostrar seções apropriadas
        dashboardSection.style.display = 'block';
        document.getElementById('approval-section').style.display = 'block';
        document.getElementById('proposal-approval-section').style.display = 'block';
        document.getElementById('history-section').style.display = 'block';
        
        // Apenas deployer pode gerenciar owners e utilitários
        if (isDeployer) {
            document.getElementById('owners-section').style.display = 'block';
            document.getElementById('utilities-section').style.display = 'block';
            await loadOwners();
        }
        
        await loadCadastros();
        await loadPendingCadastros();
        await loadPendingProposals();
        await loadDistributionHistory();
    } else {
        authStatus.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ Não Autorizado</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">
                    Apenas deployer ou owners podem acessar esta área.
                </p>
            </div>
        `;
        dashboardSection.style.display = 'none';
        document.getElementById('approval-section').style.display = 'none';
        document.getElementById('proposal-approval-section').style.display = 'none';
        document.getElementById('owners-section').style.display = 'none';
    }
}

// Obter cadastros do localStorage (usando AccessControl se disponível)
async function getCadastros() {
    if (!window.APIClient) {
        throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
    }
    
    // Garantir que window.currentAccount está definido
    if (currentAccount && !window.currentAccount) {
        window.currentAccount = currentAccount;
    }
    
    if (!currentAccount && !window.currentAccount) {
        throw new Error('Carteira não conectada. Por favor, conecte sua carteira primeiro.');
    }
    
    try {
        const result = await window.APIClient.getCadastros();
        // Garantir que é um array
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error('Erro ao obter cadastros via API:', error);
        
        // Se o erro for sobre endereço não fornecido, dar uma mensagem mais clara
        if (error.message && error.message.includes('Endereço')) {
            throw new Error('Erro: Carteira não conectada ou endereço não disponível. Por favor, conecte sua carteira novamente.');
        }
        
        throw new Error(`Erro ao conectar com a API: ${error.message}. Verifique se o servidor backend está rodando.`);
    }
}

// Salvar cadastros (não usado mais - dados são salvos via API)
function saveCadastros(cadastrosArray) {
    console.warn('saveCadastros não deve ser usado. Use a API diretamente.');
    // Esta função é mantida apenas para compatibilidade, mas não faz nada
}

// Carregar cadastros
async function loadCadastros() {
    cadastros = await getCadastros();
    updateStats();
    renderCadastros();
}

// Atualizar estatísticas
function updateStats() {
    totalCadastros.textContent = cadastros.length;
    pendentes.textContent = cadastros.filter(c => !c.tokensDistribuidos && c.status === 'aprovado').length;
    distribuidos.textContent = cadastros.filter(c => c.tokensDistribuidos).length;
}

// Renderizar cadastros
function renderCadastros() {
    const filter = document.querySelector('input[name="filter"]:checked').value;
    const search = searchInput.value.toLowerCase();
    
    let filtered = cadastros;
    
    // Aplicar filtro
    if (filter === 'pending') {
        filtered = filtered.filter(c => !c.tokensDistribuidos);
    } else if (filter === 'distributed') {
        filtered = filtered.filter(c => c.tokensDistribuidos);
    }
    
    // Aplicar busca
    if (search) {
        filtered = filtered.filter(c => 
            c.matricula.toLowerCase().includes(search) ||
            c.nome.toLowerCase().includes(search)
        );
    }
    
    if (filtered.length === 0) {
        cadastrosContainer.innerHTML = '<p class="loading">Nenhum cadastro encontrado.</p>';
        return;
    }
    
    cadastrosContainer.innerHTML = '';
    
    filtered.forEach((cadastro, index) => {
        const cadastroDiv = document.createElement('div');
        cadastroDiv.className = 'cadastro-item';
        cadastroDiv.style.cssText = 'padding: 15px; margin-bottom: 10px; background: #f7fafc; border-radius: 8px; border: 2px solid #e2e8f0;';
        
        const isSelected = selectedCadastros.has(cadastro.endereco);
        if (isSelected) {
            cadastroDiv.style.borderColor = '#667eea';
            cadastroDiv.style.background = '#edf2f7';
        }
        
        let statusBadge = '';
        if (cadastro.status === 'pendente') {
            statusBadge = '<span style="background: #fff3cd; color: #856404; padding: 5px 10px; border-radius: 15px; font-size: 0.85em;">⏳ Pendente</span>';
        } else if (cadastro.status === 'rejeitado') {
            statusBadge = '<span style="background: #fed7d7; color: #742a2a; padding: 5px 10px; border-radius: 15px; font-size: 0.85em;">❌ Rejeitado</span>';
        } else if (cadastro.tokensDistribuidos) {
            statusBadge = '<span style="background: #c6f6d5; color: #22543d; padding: 5px 10px; border-radius: 15px; font-size: 0.85em;">✅ Tokens Distribuídos</span>';
        } else {
            statusBadge = '<span style="background: #bee3f8; color: #2c5282; padding: 5px 10px; border-radius: 15px; font-size: 0.85em;">✅ Aprovado</span>';
        }
        
        cadastroDiv.innerHTML = `
            <div style="display: flex; align-items: start; gap: 15px;">
                <input type="checkbox" 
                       class="cadastro-checkbox" 
                       data-endereco="${cadastro.endereco}"
                       ${cadastro.tokensDistribuidos || cadastro.status !== 'aprovado' ? 'disabled' : ''}
                       ${isSelected ? 'checked' : ''}
                       style="margin-top: 5px;">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <h4 style="margin: 0; color: #2d3748;">${cadastro.nome}</h4>
                            <p style="margin: 5px 0; color: #718096; font-size: 0.9em;">
                                Matrícula: ${cadastro.matricula} | 
                                ${cadastro.email ? `Email: ${cadastro.email}` : 'Sem email'}
                            </p>
                        </div>
                        ${statusBadge}
                    </div>
                    <p style="margin: 5px 0; font-size: 0.85em; color: #718096; font-family: monospace;">
                        ${cadastro.endereco}
                    </p>
                    <p style="margin: 5px 0; font-size: 0.85em; color: #718096;">
                        Cadastrado em: ${new Date(cadastro.timestamp).toLocaleString('pt-BR')}
                        ${cadastro.dataDistribuicao ? 
                            `| Tokens distribuídos em: ${new Date(cadastro.dataDistribuicao).toLocaleString('pt-BR')}` : 
                            ''
                        }
                        ${cadastro.totalTokens ? 
                            `| Total de tokens: <strong style="color: #667eea;">${parseFloat(cadastro.totalTokens).toFixed(1)} DASI</strong>` : 
                            ''}
                    </p>
                </div>
            </div>
        `;
        
        cadastrosContainer.appendChild(cadastroDiv);
    });
    
    // Adicionar listeners aos checkboxes
    document.querySelectorAll('.cadastro-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const endereco = e.target.dataset.endereco;
            if (e.target.checked) {
                selectedCadastros.add(endereco);
            } else {
                selectedCadastros.delete(endereco);
            }
            updateSelectedCount();
        });
    });
}

// Atualizar contagem de selecionados
function updateSelectedCount() {
    const count = selectedCadastros.size;
    selectedCount.textContent = count;
    distributeBtn.disabled = count === 0;
}

// Selecionar todos
selectAllBtn.addEventListener('click', () => {
    const pending = cadastros.filter(c => !c.tokensDistribuidos);
    pending.forEach(c => selectedCadastros.add(c.endereco));
    renderCadastros();
    updateSelectedCount();
});

// Desselecionar todos
deselectAllBtn.addEventListener('click', () => {
    selectedCadastros.clear();
    renderCadastros();
    updateSelectedCount();
});

// Filtros
document.querySelectorAll('input[name="filter"]').forEach(radio => {
    radio.addEventListener('change', () => {
        renderCadastros();
    });
});

// Busca
searchInput.addEventListener('input', () => {
    renderCadastros();
});

// Distribuir tokens
distributeBtn.addEventListener('click', async () => {
    if (selectedCadastros.size === 0) {
        alert('Selecione pelo menos um estudante!');
        return;
    }
    
    const tokenAmountInput = document.getElementById('token-amount');
    const tokenAmount = parseFloat(tokenAmountInput.value);
    
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
        alert('Por favor, insira uma quantidade válida de tokens');
        return;
    }
    
    if (!confirm(`Deseja distribuir ${tokenAmount} token(s) DASI para cada um dos ${selectedCadastros.size} estudante(s) selecionado(s)?\n\nTotal: ${(tokenAmount * selectedCadastros.size).toFixed(1)} tokens`)) {
        return;
    }
    
    if (!tokenContract) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    try {
        distributeBtn.disabled = true;
        distributeBtn.textContent = 'Distribuindo...';
        distributionStatus.innerHTML = '<p style="color: #667eea;">⏳ Preparando distribuição...</p>';
        
        // Obter quantidade de tokens
        const tokenAmountInput = document.getElementById('token-amount');
        const tokenAmount = parseFloat(tokenAmountInput.value);
        
        if (isNaN(tokenAmount) || tokenAmount <= 0) {
            throw new Error('Por favor, insira uma quantidade válida de tokens (maior que 0)');
        }
        
        // Obter endereços selecionados
        const enderecos = Array.from(selectedCadastros);
        const amounts = enderecos.map(() => ethers.utils.parseEther(tokenAmount.toString()));
        
        // Verificar se tem permissão de minter
        let isMinter = false;
        try {
            isMinter = await tokenContract.authorizedMinters(currentAccount);
        } catch (error) {
            console.error('Erro ao verificar permissão de minter:', error);
            throw new Error('Não foi possível verificar permissão de minter. Verifique se os contratos estão deployados corretamente.');
        }
        
        if (!isMinter) {
            throw new Error('Sua conta não tem permissão para mintear tokens. Entre em contato com o administrador do sistema.');
        }
        
        distributionStatus.innerHTML = '<p style="color: #667eea;">⏳ Enviando transação...</p>';
        
        // Chamar batchMint
        const tx = await tokenContract.batchMint(enderecos, amounts);
        distributionStatus.innerHTML = '<p style="color: #667eea;">⏳ Aguardando confirmação da transação...</p>';
        
        await tx.wait();
        
        // Atualizar tokens via API ou localStorage
        const distributionRecords = [];
        for (const endereco of enderecos) {
            const cadastro = cadastros.find(c => 
                (c.endereco?.toLowerCase() === endereco.toLowerCase()) ||
                (c.address?.toLowerCase() === endereco.toLowerCase())
            );
            
            if (cadastro) {
                // Atualizar via API (obrigatório)
                if (!window.APIClient) {
                    throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
                }
                
                try {
                    await window.APIClient.updateTokens(endereco, tokenAmount.toString());
                } catch (error) {
                    console.error('Erro ao atualizar tokens via API:', error);
                    throw new Error(`Erro ao atualizar tokens: ${error.message}`);
                }
                
                // Registrar no histórico (SEM dados pessoais)
                const record = {
                    id: cadastro.id || endereco,
                    address: endereco,
                    amount: tokenAmount.toString(),
                    type: 'manual',
                    timestamp: new Date().toISOString()
                };
                
                try {
                    await window.APIClient.addHistoryRecord(record);
                } catch (error) {
                    console.error('Erro ao salvar histórico via API:', error);
                    // Não bloquear a distribuição se o histórico falhar
                }
            }
        }
        
        // Salvar cadastros se não estiver usando API
        if (!window.APIClient) {
            saveCadastros(cadastros);
            distributionRecords.forEach(record => {
                saveDistributionHistory(record);
            });
        }
        
        distributionStatus.innerHTML = `
            <div style="background: #c6f6d5; padding: 15px; border-radius: 8px; border-left: 4px solid #48bb78;">
                <h3 style="color: #22543d; margin: 0;">✅ Tokens distribuídos com sucesso!</h3>
                <p style="color: #22543d; margin: 5px 0 0 0;">
                    ${tokenAmount} token(s) DASI distribuído(s) para ${selectedCadastros.size} estudante(s).
                </p>
            </div>
        `;
        
        // Recarregar histórico se estiver visível
        if (document.getElementById('history-section') && document.getElementById('history-section').style.display !== 'none') {
            loadDistributionHistory();
        }
        
        // Limpar seleção
        selectedCadastros.clear();
        
        // Recarregar
        await loadCadastros();
        updateSelectedCount();
        
        distributeBtn.textContent = 'Distribuir Tokens para Selecionados';
        
    } catch (error) {
        console.error('Erro ao distribuir tokens:', error);
        distributionStatus.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ Erro ao distribuir tokens</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">${error.message}</p>
            </div>
        `;
        distributeBtn.disabled = false;
        distributeBtn.textContent = 'Distribuir Tokens para Selecionados';
    }
});

// Carregar cadastros pendentes de aprovação
async function loadPendingCadastros() {
    let cadastros = [];
    
    try {
        // Tentar usar API se disponível
        if (window.APIClient && currentAccount) {
            cadastros = await window.APIClient.getPendingCadastros();
        } else {
            // Se não tiver API, buscar todos e filtrar
            cadastros = await getCadastros();
        }
    } catch (error) {
        console.error('Erro ao carregar cadastros pendentes:', error);
        const container = document.getElementById('pending-cadastros-container');
        if (container) {
            container.innerHTML = `
                <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                    <h3 style="color: #742a2a; margin: 0;">❌ Erro ao carregar cadastros</h3>
                    <p style="color: #742a2a; margin: 5px 0 0 0;">${error.message}</p>
                </div>
            `;
        }
        return;
    }
    
    // Garantir que é um array
    if (!Array.isArray(cadastros)) {
        cadastros = [];
    }
    
    const pending = cadastros.filter(c => c.status === 'pendente');
    const approved = cadastros.filter(c => c.status === 'aprovado');
    const rejected = cadastros.filter(c => c.status === 'rejeitado');
    
    document.getElementById('pending-approvals').textContent = pending.length;
    document.getElementById('approved-count').textContent = approved.length;
    document.getElementById('rejected-count').textContent = rejected.length;
    
    const container = document.getElementById('pending-cadastros-container');
    
    if (pending.length === 0) {
        container.innerHTML = '<p class="loading">Nenhum cadastro pendente.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    pending.forEach(cadastro => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 20px; margin-bottom: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #f59e0b;';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">${cadastro.nome}</h4>
                    <p style="margin: 5px 0; color: #856404;"><strong>Matrícula:</strong> ${cadastro.matricula}</p>
                    <p style="margin: 5px 0; color: #856404;"><strong>Email:</strong> ${cadastro.email || 'Não informado'}</p>
                    <p style="margin: 5px 0; color: #856404; font-family: monospace; font-size: 0.9em;"><strong>Endereço:</strong> ${cadastro.endereco || cadastro.address || 'N/A'}</p>
                    <p style="margin: 5px 0; color: #856404; font-size: 0.9em;"><strong>Cadastrado em:</strong> ${new Date(cadastro.timestamp).toLocaleString('pt-BR')}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success approve-btn" data-endereco="${cadastro.endereco || cadastro.address}">
                        ✅ Aprovar
                    </button>
                    <button class="btn btn-danger reject-btn" data-endereco="${cadastro.endereco || cadastro.address}">
                        ❌ Rejeitar
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
    
    // Adicionar listeners aos botões
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const endereco = btn.dataset.endereco;
            await approveCadastro(endereco);
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const endereco = btn.dataset.endereco;
            const motivo = prompt('Motivo da rejeição (opcional):');
            await rejectCadastro(endereco, motivo || '');
        });
    });
}

// Aprovar cadastro
async function approveCadastro(endereco) {
    if (!window.AccessControl) {
        alert('Sistema de controle de acesso não disponível');
        return;
    }
    
    if (!tokenContract) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    try {
        // Verificar se tem permissão de minter
        let isMinter = false;
        try {
            isMinter = await tokenContract.authorizedMinters(currentAccount);
        } catch (error) {
            console.error('Erro ao verificar permissão de minter:', error);
            throw new Error('Não foi possível verificar permissão de minter. Verifique se os contratos estão deployados corretamente.');
        }
        
        if (!isMinter) {
            throw new Error('Sua conta não tem permissão para mintear tokens. Entre em contato com o administrador do sistema.');
        }
        
        // Obter dados do cadastro antes de aprovar
        const cadastros = await getCadastros();
        const cadastro = cadastros.find(c => 
            c.endereco?.toLowerCase() === endereco.toLowerCase() || 
            c.address?.toLowerCase() === endereco.toLowerCase()
        );
        
        if (!cadastro) {
            throw new Error('Cadastro não encontrado');
        }
        
        // Aprovar cadastro (via API ou AccessControl)
        if (window.APIClient) {
            await window.APIClient.approveCadastro(endereco);
        } else if (window.AccessControl) {
            await window.AccessControl.approveCadastro(endereco, currentAccount);
        } else {
            throw new Error('Sistema de controle de acesso não disponível');
        }
        
        // Mintear 1 token automaticamente para o usuário aprovado
        const amount = ethers.utils.parseEther('1');
        const tx = await tokenContract.mint(endereco, amount);
        await tx.wait();
        
        // Atualizar tokens via API
        if (window.APIClient) {
            await window.APIClient.updateTokens(endereco, '1');
        }
        
        // Registrar no histórico (sem dados pessoais)
        const cadastroId = cadastro.id || cadastro.address;
        if (window.APIClient) {
            await window.APIClient.addHistoryRecord({
                id: cadastroId,
                address: endereco,
                amount: '1',
                type: 'approval'
            });
        } else {
            saveDistributionHistory({
                type: 'approval',
                id: cadastroId,
                recipient: endereco,
                amount: '1',
                timestamp: new Date().toISOString(),
                admin: currentAccount
            });
        }
        
        alert('Cadastro aprovado e 1 token DASI distribuído automaticamente!');
        await loadPendingCadastros();
        await loadCadastros();
        updateStats();
        
        // Recarregar histórico se estiver visível
        if (document.getElementById('history-section') && document.getElementById('history-section').style.display !== 'none') {
            loadDistributionHistory();
        }
    } catch (error) {
        console.error('Erro ao aprovar cadastro:', error);
        alert('Erro ao aprovar cadastro: ' + error.message);
    }
}

// Rejeitar cadastro
async function rejectCadastro(endereco, motivo) {
    if (!window.AccessControl) {
        alert('Sistema de controle de acesso não disponível');
        return;
    }
    
    try {
        window.AccessControl.rejectCadastro(endereco, currentAccount, motivo);
        alert('Cadastro rejeitado.');
        await loadPendingCadastros();
        await loadCadastros();
        updateStats();
    } catch (error) {
        alert('Erro ao rejeitar cadastro: ' + error.message);
    }
}

// Carregar owners
async function loadOwners() {
    const container = document.getElementById('owners-list');
    if (!container) return;
    
    try {
        // Obter deployer e owners via API
        let deployer = null;
        let owners = [];
        
        if (window.APIClient && currentAccount) {
            try {
                deployer = await window.APIClient.getDeployer();
                owners = await window.APIClient.getOwners();
                // Garantir que owners é um array
                if (!Array.isArray(owners)) {
                    owners = [];
                }
            } catch (error) {
                console.error('Erro ao obter owners/deployer via API:', error);
                // Fallback para AccessControl se API falhar
                if (window.AccessControl) {
                    deployer = await window.AccessControl.getDeployer();
                    owners = await window.AccessControl.getOwners();
                }
            }
        } else if (window.AccessControl) {
            // Fallback se não tiver API
            deployer = await window.AccessControl.getDeployer();
            owners = await window.AccessControl.getOwners();
        }
        
        let html = '';
        
        if (deployer) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong>Deployer:</strong>
                    <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 5px; font-family: monospace;">
                        ${deployer}
                    </div>
                </div>
            `;
        }
        
        if (owners.length > 0) {
            html += '<div style="margin-top: 15px;"><strong>Owners/Diretores:</strong></div>';
            owners.forEach((owner, index) => {
                html += `
                    <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-family: monospace;">${owner}</span>
                        <button class="btn btn-danger remove-owner-btn" data-owner="${owner}" style="padding: 5px 15px; font-size: 0.9em;">
                            Remover
                        </button>
                    </div>
                `;
            });
        } else {
            html += '<p style="color: #718096; margin-top: 15px;">Nenhum owner adicionado ainda.</p>';
        }
        
        container.innerHTML = html || '<p class="loading">Carregando...</p>';
        
        // Adicionar listeners aos botões de remover
        document.querySelectorAll('.remove-owner-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const owner = btn.dataset.owner;
                if (confirm(`Tem certeza que deseja remover o owner ${owner}?`)) {
                    await removeOwner(owner);
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar owners:', error);
        container.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ Erro ao carregar owners</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">${error.message}</p>
            </div>
        `;
    }
}

// Adicionar owner
async function addOwner() {
    const addressInput = document.getElementById('new-owner-address');
    const address = addressInput.value.trim();
    const statusDiv = document.getElementById('owner-status');
    
    if (!address) {
        statusDiv.innerHTML = '<p style="color: #f56565;">Por favor, informe um endereço.</p>';
        return;
    }
    
    if (!ethers.utils.isAddress(address)) {
        statusDiv.innerHTML = '<p style="color: #f56565;">Endereço inválido.</p>';
        return;
    }
    
    if (!window.AccessControl) {
        statusDiv.innerHTML = '<p style="color: #f56565;">Sistema de controle de acesso não disponível.</p>';
        return;
    }
    
    try {
        window.AccessControl.addOwner(address, currentAccount);
        statusDiv.innerHTML = '<p style="color: #48bb78;">✅ Owner adicionado com sucesso!</p>';
        addressInput.value = '';
        await loadOwners();
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    } catch (error) {
        statusDiv.innerHTML = `<p style="color: #f56565;">Erro: ${error.message}</p>`;
    }
}

// Remover owner
async function removeOwner(ownerAddress) {
    if (!window.AccessControl) {
        alert('Sistema de controle de acesso não disponível');
        return;
    }
    
    try {
        window.AccessControl.removeOwner(ownerAddress, currentAccount);
        alert('Owner removido com sucesso!');
        await loadOwners();
    } catch (error) {
        alert('Erro ao remover owner: ' + error.message);
    }
}


// Adicionar listener ao botão de adicionar owner
document.addEventListener('DOMContentLoaded', () => {
    const addOwnerBtn = document.getElementById('add-owner-btn');
    if (addOwnerBtn) {
        addOwnerBtn.addEventListener('click', addOwner);
    }
    
    // Listener para botão de resetar banco de dados
    const resetDatabaseBtn = document.getElementById('reset-database-btn');
    if (resetDatabaseBtn) {
        resetDatabaseBtn.addEventListener('click', resetDatabase);
    }
});

// Resetar banco de dados
async function resetDatabase() {
    if (!currentAccount) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    // Confirmação dupla por segurança
    const confirm1 = confirm(
        '⚠️ ATENÇÃO: Esta ação irá DELETAR PERMANENTEMENTE todos os dados do banco!\n\n' +
        'Serão deletados:\n' +
        '• Todos os cadastros de estudantes\n' +
        '• Todos os mapeamentos de carteiras\n' +
        '• Todo o histórico de distribuições\n\n' +
        'Esta ação NÃO pode ser desfeita!\n\n' +
        'Deseja continuar?'
    );
    
    if (!confirm1) {
        return;
    }
    
    const confirm2 = confirm(
        '🔴 ÚLTIMA CONFIRMAÇÃO 🔴\n\n' +
        'Você tem CERTEZA ABSOLUTA que deseja limpar todo o banco de dados?\n\n' +
        'Digite OK apenas se tiver certeza total!'
    );
    
    if (!confirm2) {
        return;
    }
    
    const resetBtn = document.getElementById('reset-database-btn');
    const statusDiv = document.getElementById('reset-database-status');
    
    try {
        resetBtn.disabled = true;
        resetBtn.textContent = '🗑️ Limpando...';
        statusDiv.innerHTML = '<p style="color: #667eea;">⏳ Limpando banco de dados...</p>';
        
        if (!window.APIClient) {
            throw new Error('API não disponível. Por favor, inicie o servidor backend (npm run backend)');
        }
        
        const result = await window.APIClient.resetDatabase();
        
        statusDiv.innerHTML = `
            <div style="background: #c6f6d5; padding: 15px; border-radius: 8px; border-left: 4px solid #48bb78;">
                <h3 style="color: #22543d; margin: 0;">✅ ${result.message}</h3>
                <p style="color: #22543d; margin: 5px 0 0 0;">
                    Arquivos resetados: ${result.resetFiles.join(', ')}
                </p>
            </div>
        `;
        
        resetBtn.textContent = '🗑️ Limpar Banco de Dados';
        resetBtn.disabled = false;
        
        // Recarregar dados após reset
        await loadCadastros();
        await loadPendingCadastros();
        await loadDistributionHistory();
        updateStats();
        
    } catch (error) {
        console.error('Erro ao resetar banco de dados:', error);
        statusDiv.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ Erro ao resetar banco de dados</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">${error.message}</p>
            </div>
        `;
        resetBtn.textContent = '🗑️ Limpar Banco de Dados';
        resetBtn.disabled = false;
    }
}

// Carregar propostas pendentes de aprovação
async function loadPendingProposals() {
    if (!daoContract || !currentAccount) return;
    
    const container = document.getElementById('pending-proposals-container');
    if (!container) return;
    
    try {
        const proposalCount = await daoContract.proposalCount();
        const pendingProposals = [];
        
        // Carregar todas as propostas e filtrar as pendentes
        for (let i = 0; i < proposalCount; i++) {
            try {
                const status = await daoContract.getProposalStatus(i);
                if (status === 'PendingApproval') {
                    const proposal = await daoContract.getProposal(i);
                    const approvalInfo = await daoContract.getProposalApprovalInfo(i);
                    const hasVoted = await daoContract.hasOwnerVotedOnApproval(i, currentAccount);
                    
                    pendingProposals.push({
                        id: i,
                        proposal: proposal,
                        approvalInfo: approvalInfo,
                        hasVoted: hasVoted
                    });
                }
            } catch (error) {
                console.error(`Erro ao carregar proposta ${i}:`, error);
            }
        }
        
        if (pendingProposals.length === 0) {
            container.innerHTML = '<p style="color: #718096; text-align: center; padding: 20px;">Nenhuma proposta pendente de aprovação.</p>';
            return;
        }
        
        // Renderizar propostas pendentes
        container.innerHTML = '';
        pendingProposals.forEach(async (item) => {
            await renderPendingProposal(item);
        });
        
    } catch (error) {
        console.error('Erro ao carregar propostas pendentes:', error);
        container.innerHTML = '<p style="color: #f56565;">Erro ao carregar propostas pendentes.</p>';
    }
}

// Renderizar proposta pendente
async function renderPendingProposal(item) {
    const container = document.getElementById('pending-proposals-container');
    const { id, proposal, approvalInfo, hasVoted } = item;
    
    const requiredVotes = Math.ceil((approvalInfo.totalOwners * 50) / 100); // 50% do quórum
    const progress = approvalInfo.totalOwners > 0 ? 
        (approvalInfo.approvalVotes / requiredVotes) * 100 : 0;
    
    const proposalDiv = document.createElement('div');
    proposalDiv.className = 'card';
    proposalDiv.style.marginBottom = '20px';
    proposalDiv.style.padding = '20px';
    
    proposalDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div>
                <h3 style="margin: 0;">Proposta #${id}</h3>
                <p style="color: #718096; margin: 5px 0;">Proponente: ${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}</p>
            </div>
            <span style="background: #fff3cd; color: #856404; padding: 5px 15px; border-radius: 20px; font-size: 0.9em;">
                ⏳ Aguardando Aprovação
            </span>
        </div>
        
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>Descrição:</strong>
            <p style="margin: 10px 0 0 0; color: #4a5568;">${proposal.description}</p>
        </div>
        
        <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>Status da Aprovação:</strong>
            <div style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Votos de aprovação:</span>
                    <strong>${approvalInfo.approvalVotes.toString()} / ${requiredVotes} necessários</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Owners que votaram:</span>
                    <strong>${approvalInfo.approvalVoterCount.toString()} / ${approvalInfo.totalOwners.toString()}</strong>
                </div>
                <div style="background: #cbd5e0; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #48bb78; height: 100%; width: ${Math.min(progress, 100)}%; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
            ${!hasVoted ? `
                <button class="btn btn-success" onclick="approveProposal(${id})" style="flex: 1;">
                    ✅ Aprovar Proposta
                </button>
                <button class="btn btn-danger" onclick="rejectProposal(${id})" style="flex: 1;">
                    ❌ Rejeitar Proposta
                </button>
            ` : `
                <button class="btn btn-secondary" disabled style="flex: 1;">
                    Você já votou nesta proposta
                </button>
            `}
        </div>
    `;
    
    container.appendChild(proposalDiv);
}

// Aprovar proposta
async function approveProposal(proposalId) {
    if (!daoContract || !currentAccount) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    try {
        // Obter lista de usuários aprovados (cadastros aprovados)
        const cadastros = getCadastros();
        const approvedUsers = cadastros
            .filter(c => c.status === 'aprovado')
            .map(c => c.endereco);
        
        // Permitir aprovar mesmo sem usuários (a proposta será aprovada mas sem distribuir tokens)
        let confirmMessage = `Tem certeza que deseja aprovar esta proposta?\n\nIsso irá:\n- Liberar a proposta para votação pública`;
        
        if (approvedUsers.length > 0) {
            confirmMessage += `\n- Distribuir 1 token DASI para ${approvedUsers.length} usuários aprovados`;
        } else {
            confirmMessage += `\n⚠️ Nenhum usuário aprovado encontrado. A proposta será aprovada mas nenhum token será distribuído.`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const tx = await daoContract.voteOnProposalApproval(proposalId, true, approvedUsers);
        alert('Transação enviada! Aguardando confirmação...');
        await tx.wait();
        
        if (approvedUsers.length > 0) {
            alert(`Proposta aprovada com sucesso! ${approvedUsers.length} tokens distribuídos automaticamente.`);
        } else {
            alert('Proposta aprovada com sucesso! (Nenhum token foi distribuído pois não há usuários aprovados)');
        }
        
        // Recarregar propostas pendentes
        await loadPendingProposals();
        
    } catch (error) {
        console.error('Erro ao aprovar proposta:', error);
        alert('Erro ao aprovar proposta: ' + (error.message || error));
    }
}

// Rejeitar proposta (votar contra a aprovação)
async function rejectProposal(proposalId) {
    if (!daoContract || !currentAccount) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    try {
        if (!confirm('Tem certeza que deseja votar contra a aprovação desta proposta?')) {
            return;
        }
        
        // Passar array vazio pois não vamos distribuir tokens se rejeitar
        const tx = await daoContract.voteOnProposalApproval(proposalId, false, []);
        alert('Transação enviada! Aguardando confirmação...');
        await tx.wait();
        alert('Voto registrado com sucesso!');
        
        // Recarregar propostas pendentes
        await loadPendingProposals();
        
    } catch (error) {
        console.error('Erro ao rejeitar proposta:', error);
        alert('Erro ao rejeitar proposta: ' + (error.message || error));
    }
}

// ==================== HISTÓRICO DE DISTRIBUIÇÕES ====================

// Salvar registro no histórico
function saveDistributionHistory(record) {
    try {
        const history = getDistributionHistory();
        history.unshift(record); // Adicionar no início
        // Manter apenas os últimos 1000 registros
        if (history.length > 1000) {
            history.splice(1000);
        }
        localStorage.setItem('dasi_distribution_history', JSON.stringify(history));
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
}

// Obter histórico completo
function getDistributionHistory() {
    try {
        const historyStr = localStorage.getItem('dasi_distribution_history');
        return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
        console.error('Erro ao ler histórico:', error);
        return [];
    }
}

// Carregar e renderizar histórico
async function loadDistributionHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    if (!window.APIClient || !currentAccount) {
        container.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ API não disponível</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">Por favor, inicie o servidor backend (npm run backend)</p>
            </div>
        `;
        return;
    }
    
    let history = [];
    
    try {
        const filter = document.querySelector('input[name="history-filter"]:checked')?.value || 'all';
        history = await window.APIClient.getHistory(filter);
        
        if (!Array.isArray(history)) {
            history = [];
        }
    } catch (error) {
        console.error('Erro ao obter histórico via API:', error);
        container.innerHTML = `
            <div style="background: #fed7d7; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #742a2a; margin: 0;">❌ Erro ao carregar histórico</h3>
                <p style="color: #742a2a; margin: 5px 0 0 0;">${error.message}</p>
            </div>
        `;
        return;
    }
    
    if (history.length === 0) {
        container.innerHTML = '<p class="loading">Nenhuma distribuição registrada ainda.</p>';
        return;
    }
    
    // Aplicar filtro (já vem filtrado da API, mas garantir)
    const filter = document.querySelector('input[name="history-filter"]:checked')?.value || 'all';
    let filtered = history;
    
    // Se por algum motivo o filtro não foi aplicado na API, aplicar aqui
    if (filter !== 'all') {
        filtered = history.filter(h => h.type === filter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="loading">Nenhum registro encontrado para este filtro.</p>';
        return;
    }
    
    // Renderizar histórico SEM dados pessoais (apenas endereço e ID)
    container.innerHTML = filtered.map(record => {
        const date = new Date(record.timestamp);
        const dateStr = date.toLocaleString('pt-BR');
        const typeLabel = record.type === 'approval' ? 'Aprovação' : 'Distribuição Manual';
        const typeIcon = record.type === 'approval' ? '✅' : '💰';
        const address = record.address || record.recipient || 'N/A';
        const addressShort = address !== 'N/A' ? `${address.substring(0, 6)}...${address.substring(38)}` : 'N/A';
        const recordId = record.id ? `ID: ${record.id.substring(0, 8)}...` : '';
        
        return `
            <div style="padding: 15px; margin-bottom: 10px; background: #f7fafc; border-radius: 8px; border-left: 4px solid ${record.type === 'approval' ? '#48bb78' : '#667eea'};">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">
                            ${typeIcon} ${typeLabel}
                        </div>
                        <div style="color: #718096; font-size: 0.9em; margin-bottom: 5px; font-family: monospace;">
                            ${addressShort}
                        </div>
                        ${recordId ? `<div style="color: #a0aec0; font-size: 0.8em; margin-bottom: 5px;">${recordId}</div>` : ''}
                        <div style="color: #667eea; font-weight: bold; font-size: 1.1em;">
                            ${record.amount} DASI
                        </div>
                    </div>
                    <div style="text-align: right; color: #718096; font-size: 0.85em;">
                        ${dateStr}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filtrar histórico
window.filterHistory = function() {
    loadDistributionHistory();
}

// Exportar funções globalmente
window.approveProposal = approveProposal;
window.rejectProposal = rejectProposal;
window.filterHistory = filterHistory;

// Detectar mudança de conta
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (!autoReconnectEnabled) {
            // Se foi desconectado manualmente, limpar sessão
            if (window.SessionManager) window.SessionManager.clear();
            return;
        }
        
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            // Conta mudou, atualizar sessão
            if (window.SessionManager) {
                window.SessionManager.save(accounts[0], 'ganache');
            }
            connectWallet();
        }
    });
}

