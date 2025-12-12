// Verificar se ethers está carregado
if (typeof ethers === 'undefined') {
    console.error('ethers.js não foi carregado! Verifique a conexão com a internet ou use um CDN alternativo.');
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erro ao carregar ethers.js</h1><p>Verifique sua conexão com a internet e recarregue a página.</p></div>';
    throw new Error('ethers.js não está disponível');
}

// Variáveis globais
let provider;
let signer;
let tokenContract;
let daoContract;
let currentAccount;
let currentProposalId;

// Inicialização
window.addEventListener('load', async () => {
    // Inicializar sistema de controle de acesso
    if (window.AccessControl) {
        window.AccessControl.init();
    }
    
    await init();
});

// Flag para controlar reconexão automática
let autoReconnectEnabled = false;

// Função auxiliar para obter cadastros do localStorage
function getCadastros() {
    try {
        const cadastros = localStorage.getItem('dasi_cadastros');
        return cadastros ? JSON.parse(cadastros) : [];
    } catch (error) {
        console.error('Erro ao ler cadastros:', error);
        return [];
    }
}

async function init() {
    // Verificar se MetaMask está instalado
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Verificar se há sessão ativa
        const session = window.SessionManager ? window.SessionManager.load() : null;
        if (session && session.account) {
            // Tentar reconectar usando a sessão
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0 && accounts[0].toLowerCase() === session.account.toLowerCase()) {
                    // Inicializar sistema de controle de acesso
                    if (window.AccessControl) {
                        window.AccessControl.init();
                    }
                    
                    // Verificar se pode acessar o sistema
                    const canAccess = window.AccessControl ? 
                        await window.AccessControl.canAccessSystem(accounts[0]) : false;
                    
                    if (canAccess) {
                        autoReconnectEnabled = true;
                        await connectWallet();
                    } else {
                        // Carteira não tem acesso, limpar sessão e redirecionar
                        if (window.SessionManager) window.SessionManager.clear();
                        alert('Esta carteira não tem acesso ao sistema! Por favor, faça o cadastro e aguarde aprovação.');
                        window.location.href = 'cadastro.html';
                    }
                } else {
                    // Conta mudou, limpar sessão
                    if (window.SessionManager) window.SessionManager.clear();
                }
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
                if (window.SessionManager) window.SessionManager.clear();
            }
        }
        
        // Listener para mudanças de conta
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (!autoReconnectEnabled) {
                // Se foi desconectado manualmente, limpar sessão
                if (window.SessionManager) window.SessionManager.clear();
                return;
            }
            
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                // Conta mudou, verificar acesso antes de reconectar
                if (window.AccessControl) {
                    window.AccessControl.init();
                }
                
                const canAccess = window.AccessControl ? 
                    await window.AccessControl.canAccessSystem(accounts[0]) : false;
                
                if (canAccess) {
                    // Tem acesso, reconectar
                    if (window.SessionManager) {
                        window.SessionManager.save(accounts[0], 'ganache');
                    }
                    await connectWallet();
                    // Verificar autorização novamente quando a conta mudar
                    setTimeout(async () => {
                        await checkAuthorizedProposer();
                        await checkAndShowAdminButton();
                    }, 500);
                } else {
                    // Não tem acesso, redirecionar para cadastro
                    if (window.SessionManager) {
                        window.SessionManager.clear();
                    }
                    alert('Esta carteira não tem acesso ao sistema! Redirecionando para cadastro...');
                    window.location.href = 'cadastro.html';
                }
            }
        });
    } else {
        alert('Por favor, instale o MetaMask para usar esta aplicação!');
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask não está instalado!');
            return;
        }

        // Reabilitar reconexão automática ao conectar manualmente
        autoReconnectEnabled = true;

        // Solicitar conexão
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        currentAccount = await signer.getAddress();
        
        // Inicializar sistema de controle de acesso
        if (window.AccessControl) {
            window.AccessControl.init();
        }
        
        // Verificar se pode acessar o sistema
        const canAccess = window.AccessControl ? 
            await window.AccessControl.canAccessSystem(currentAccount) : false;
        
        if (!canAccess) {
            // Tentar verificar status do cadastro via API pública
            let statusMessage = 'Esta carteira não está cadastrada ou não tem acesso ao sistema! Por favor, faça o cadastro primeiro na página de cadastro.';
            
            if (window.APIClient) {
                try {
                    const cadastroInfo = await window.APIClient.checkAccess(currentAccount);
                    if (cadastroInfo && cadastroInfo.approved) {
                        
                            statusMessage = 'Seu cadastro está aguardando aprovação ou foi rejeitado. Entre em contato com a administração.';
                        
                    }else {
                        statusMessage = 'Esta carteira não está cadastrada ou não tem acesso ao sistema! Por favor, faça o cadastro primeiro na página de cadastro.';
                    }
                } catch (error) {
                    // Se não encontrou, significa que não está cadastrado (não é erro)
                    console.log('Cadastro não encontrado - usuário precisa se cadastrar');
                }
            }
            
            alert(statusMessage);
            
            // Limpar estado
            currentAccount = null;
            provider = null;
            signer = null;
            // Limpar sessão
            if (window.SessionManager) {
                window.SessionManager.clear();
            }
            // Redirecionar para página de cadastro
            window.location.href = 'cadastro.html';
            return;
        }
        
        // Salvar sessão
        if (window.SessionManager) {
            window.SessionManager.save(currentAccount, 'ganache');
        }
        
        // Atualizar UI
        document.getElementById('account-display').textContent = 
            `Conectado: ${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        document.getElementById('connect-btn').style.display = 'none';
        document.getElementById('disconnect-btn').style.display = 'block';
        
        // Inicializar contratos
        await initContracts();
        
        // Carregar dados
        await loadUserData();
        await loadProposals();
        await loadDAOInfo();
        
        // Mostrar seções
        document.getElementById('proposals-section').style.display = 'block';
        document.getElementById('info-section').style.display = 'block';
        
        // Mostrar botões de navegação
        const navButtons = document.getElementById('navigation-buttons');
        if (navButtons) {
            navButtons.style.display = 'block';
        }
        
        // Verificar se é admin e mostrar botão de admin
        await checkAndShowAdminButton();
        
        // Verificar autorização após tudo estar carregado (com delay para garantir DOM)
        setTimeout(async () => {
            console.log('=== VERIFICANDO AUTORIZAÇÃO ===');
            console.log('Conta atual:', currentAccount);
            await checkAuthorizedProposer();
        }, 500);
        
    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        alert('Erro ao conectar carteira: ' + error.message);
    }
}

// Adicionar listener ao botão de desconectar
document.addEventListener('DOMContentLoaded', () => {
    const disconnectBtn = document.getElementById('disconnect-btn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
});

async function disconnectWallet() {
    try {
        // Desabilitar reconexão automática
        autoReconnectEnabled = false;
        
        // Limpar sessão
        if (window.SessionManager) {
            window.SessionManager.clear();
        }
        
        // Limpar estado
        currentAccount = null;
        provider = null;
        signer = null;
        tokenContract = null;
        daoContract = null;
        
        // Atualizar UI
        document.getElementById('account-display').textContent = 'Não conectado';
        document.getElementById('connect-btn').style.display = 'block';
        document.getElementById('disconnect-btn').style.display = 'none';
        document.getElementById('token-balance').style.display = 'none';
        document.getElementById('proposals-section').style.display = 'none';
        document.getElementById('info-section').style.display = 'none';
        
        // Ocultar botões de navegação
        const navButtons = document.getElementById('navigation-buttons');
        if (navButtons) {
            navButtons.style.display = 'none';
        }
        const adminBtn = document.getElementById('admin-nav-btn');
        if (adminBtn) {
            adminBtn.style.display = 'none';
        }
        
        // Limpar container de propostas
        document.getElementById('proposals-container').innerHTML = '<p class="loading">Carregando propostas...</p>';
    } catch (error) {
        console.error('Erro ao desconectar:', error);
    }
}

async function initContracts() {
    if (!signer) return;
    
    try {
        // Verificar se os endereços estão configurados
        if (CONFIG.TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000" ||
            CONFIG.DAO_ADDRESS === "0x0000000000000000000000000000000000000000") {
            alert('Por favor, atualize os endereços dos contratos em config.js após o deploy!');
            return;
        }
        
        tokenContract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, CONFIG.TOKEN_ABI, signer);
        daoContract = new ethers.Contract(CONFIG.DAO_ADDRESS, CONFIG.DAO_ABI, signer);
        
        console.log('Contratos inicializados');
    } catch (error) {
        console.error('Erro ao inicializar contratos:', error);
    }
}

async function loadUserData() {
    if (!tokenContract || !currentAccount) return;
    
    try {
        const balance = await tokenContract.balanceOf(currentAccount);
        const balanceFormatted = ethers.utils.formatEther(balance);
        
        document.getElementById('balance-amount').textContent = balanceFormatted;
        document.getElementById('token-balance').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
    }
}

async function loadProposals() {
    if (!daoContract) return;
    
    try {
        const proposalCount = await daoContract.proposalCount();
        const container = document.getElementById('proposals-container');
        
        if (proposalCount.toString() === '0') {
            container.innerHTML = '<p class="loading">Nenhuma proposta criada ainda.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        // Carregar todas as propostas
        for (let i = 0; i < proposalCount; i++) {
            try {
                const proposal = await daoContract.getProposal(i);
                const status = await daoContract.getProposalStatus(i);
                const hasVoted = await daoContract.hasVoted(i, currentAccount);
                
                // Carregar informações de aprovação
                let approvalInfo = null;
                if (status === 'PendingApproval') {
                    try {
                        approvalInfo = await daoContract.getProposalApprovalInfo(i);
                    } catch (error) {
                        console.error(`Erro ao carregar info de aprovação da proposta ${i}:`, error);
                    }
                }
                
                if (proposal.isMultiOption) {
                    // Carregar dados da proposta com múltiplas opções
                    const multiData = await daoContract.getMultiOptionProposal(i);
                    await renderMultiOptionProposal(i, proposal, multiData, status, hasVoted, approvalInfo);
                } else {
                    await renderProposal(i, proposal, status, hasVoted, approvalInfo);
                }
            } catch (error) {
                console.error(`Erro ao carregar proposta ${i}:`, error);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar propostas:', error);
        document.getElementById('proposals-container').innerHTML = 
            '<p class="loading">Erro ao carregar propostas.</p>';
    }
}

async function renderProposal(id, proposal, status, hasVoted, approvalInfo) {
    const container = document.getElementById('proposals-container');
    
    const proposalDiv = document.createElement('div');
    proposalDiv.className = 'proposal-item';
    
    let startTime = null;
    let endTime = null;
    if (proposal.startTime && proposal.startTime.toNumber() > 0) {
        startTime = new Date(proposal.startTime.toNumber() * 1000);
        endTime = new Date(proposal.endTime.toNumber() * 1000);
    }
    
    const statusClass = status === 'Active' ? 'status-active' : 
                        status === 'Ended' ? 'status-ended' : 
                        status === 'Executed' ? 'status-executed' :
                        status === 'PendingApproval' ? 'status-pending' : '';
    
    // Status traduzido
    const statusText = status === 'PendingApproval' ? '⏳ Aguardando Aprovação' :
                       status === 'Active' ? '✅ Ativa' :
                       status === 'Ended' ? '🔒 Encerrada' :
                       status === 'Executed' ? '✓ Executada' :
                       status === 'Pending' ? '⏳ Pendente' : status;
    
    // HTML de aprovação
    let approvalHtml = '';
    if (status === 'PendingApproval' && approvalInfo) {
        const requiredVotes = Math.ceil((approvalInfo.totalOwners * 50) / 100); // 50% do quórum
        approvalHtml = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
                <strong>⏳ Esta proposta está aguardando aprovação dos owners/deployer</strong>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    <div>Votos de aprovação: ${approvalInfo.approvalVotes.toString()} / ${requiredVotes} necessários</div>
                    <div>Owners que votaram: ${approvalInfo.approvalVoterCount.toString()} / ${approvalInfo.totalOwners.toString()}</div>
                    <div style="margin-top: 5px; color: #856404;">
                        ⚠️ A votação pública só será liberada após aprovação pelos owners.
                    </div>
                </div>
            </div>
        `;
    }
    
    proposalDiv.innerHTML = `
        <div class="proposal-header">
            <span class="proposal-id">Proposta #${id}</span>
            <span class="proposal-status ${statusClass}">${statusText}</span>
        </div>
        <div class="proposal-description">${proposal.description}</div>
        ${approvalHtml}
        ${status !== 'PendingApproval' ? `
        <div class="proposal-stats">
            <div class="stat-item">
                <div class="stat-label">👍 A Favor</div>
                <div class="stat-value">${proposal.voterCountFor ? proposal.voterCountFor.toString() : '0'}</div>
                <div style="font-size: 0.8em; color: #718096;">${ethers.utils.formatEther(proposal.votesFor)} tokens</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">👎 Contra</div>
                <div class="stat-value">${proposal.voterCountAgainst ? proposal.voterCountAgainst.toString() : '0'}</div>
                <div style="font-size: 0.8em; color: #718096;">${ethers.utils.formatEther(proposal.votesAgainst)} tokens</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">🤷 Abster</div>
                <div class="stat-value">${proposal.voterCountAbstain ? proposal.voterCountAbstain.toString() : '0'}</div>
                <div style="font-size: 0.8em; color: #718096;">${ethers.utils.formatEther(proposal.votesAbstain)} tokens</div>
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 0.9em; color: #718096;">
            <strong>Total de Votantes:</strong> ${proposal.voterCount ? proposal.voterCount.toString() : '0'}
        </div>
        ` : ''}
        <div style="margin-top: 10px; font-size: 0.9em; color: #718096;">
            <strong>Proponente:</strong> ${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}<br>
            ${startTime ? `
            <strong>Início:</strong> ${startTime.toLocaleString('pt-BR')}<br>
            <strong>Fim:</strong> ${endTime.toLocaleString('pt-BR')}
            ` : '<strong>Status:</strong> Aguardando aprovação para iniciar votação'}
        </div>
        <div class="proposal-actions">
            ${status === 'Active' && !hasVoted ? 
                `<button class="btn btn-primary" onclick="openVoteModal(${id})">Votar</button>` : 
                hasVoted ? 
                `<button class="btn btn-secondary" disabled>Você já votou</button>` : 
                status === 'PendingApproval' ?
                `<button class="btn btn-secondary" disabled>Aguardando aprovação</button>` :
                ''}
            ${status === 'Ended' && !proposal.executed ? 
                `<button class="btn btn-success" onclick="executeProposal(${id})">Executar Proposta</button>` : 
                ''}
        </div>
    `;
    
    container.appendChild(proposalDiv);
}

async function renderMultiOptionProposal(id, proposal, multiData, status, hasVoted, approvalInfo) {
    const container = document.getElementById('proposals-container');
    
    const proposalDiv = document.createElement('div');
    proposalDiv.className = 'proposal-item';
    
    const startTime = new Date(proposal.startTime.toNumber() * 1000);
    const endTime = new Date(proposal.endTime.toNumber() * 1000);
    
    const statusClass = status === 'Active' ? 'status-active' : 
                        status === 'Ended' ? 'status-ended' : 
                        status === 'Executed' ? 'status-executed' : '';
    
            // Criar HTML das opções
            let optionsHtml = '';
            for (let i = 0; i < multiData.options.length; i++) {
                const optionName = multiData.options[i];
                const votes = ethers.utils.formatEther(multiData.optionVotes[i]);
                const voterCount = multiData.optionVoterCounts[i].toString();
                const isNulo = optionName === 'Nulo';
                optionsHtml += `
                    <div class="stat-item" style="${isNulo ? 'background: #fed7d7;' : ''}">
                        <div class="stat-label">${optionName}${isNulo ? ' (Voto Nulo)' : ''}</div>
                        <div class="stat-value">${voterCount} votos</div>
                        <div style="font-size: 0.8em; color: #718096;">${votes} tokens</div>
                    </div>
                `;
            }
    
    proposalDiv.innerHTML = `
        <div class="proposal-header">
            <span class="proposal-id">Proposta #${id} (Múltiplas Opções)</span>
            <span class="proposal-status ${statusClass}">${status}</span>
        </div>
        <div class="proposal-description">${proposal.description}</div>
        <div class="proposal-stats">
            ${optionsHtml}
        </div>
        <div style="margin-top: 10px; font-size: 0.9em; color: #718096;">
            <strong>Total de Votantes:</strong> ${proposal.voterCount ? proposal.voterCount.toString() : '0'}<br>
            <strong>Proponente:</strong> ${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}<br>
            <strong>Início:</strong> ${startTime.toLocaleString('pt-BR')}<br>
            <strong>Fim:</strong> ${endTime.toLocaleString('pt-BR')}
        </div>
        <div class="proposal-actions">
            ${status === 'Active' && !hasVoted ? 
                `<button class="btn btn-primary" onclick="openVoteModal(${id}, true)">Votar</button>` : 
                hasVoted ? 
                `<button class="btn btn-secondary" disabled>Você já votou</button>` : 
                ''}
        </div>
    `;
    
    container.appendChild(proposalDiv);
}

async function loadDAOInfo() {
    if (!daoContract) return;
    
    try {
        const quorum = await daoContract.quorumPercentage();
        const votingPeriod = await daoContract.votingPeriod();
        const proposalCount = await daoContract.proposalCount();
        
        document.getElementById('quorum-info').textContent = quorum.toString() + '%';
        document.getElementById('voting-period-info').textContent = 
            Math.floor(votingPeriod.toNumber() / 86400) + ' dias';
        document.getElementById('total-proposals').textContent = proposalCount.toString();
    } catch (error) {
        console.error('Erro ao carregar informações da DAO:', error);
    }
}


// Verificar se o usuário é um proposer autorizado (deployer ou owner)
async function checkAuthorizedProposer() {
    console.log('=== INÍCIO checkAuthorizedProposer ===');
    console.log('currentAccount:', currentAccount);
    
    if (!currentAccount) {
        console.log('❌ checkAuthorizedProposer: Nenhuma conta conectada');
        return;
    }
    
    // Aguardar um pouco para garantir que o DOM está pronto
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const multiOptionLabel = document.getElementById('multi-option-label');
    if (!multiOptionLabel) {
        console.log('❌ checkAuthorizedProposer: Elemento multi-option-label não encontrado no DOM');
        console.log('Tentando novamente em 500ms...');
        setTimeout(async () => {
            await checkAuthorizedProposer();
        }, 500);
        return;
    }
    
    console.log('✅ Elemento multi-option-label encontrado');
    
    // Verificar se é deployer ou owner usando o sistema de controle de acesso
    let isAuthorized = false;
    
    if (window.AccessControl) {
        isAuthorized = window.AccessControl.hasAdminAccess(currentAccount);
        console.log('Verificando autorização via AccessControl:', isAuthorized);
    } else {
        console.warn('⚠️ AccessControl não disponível, usando verificação básica');
        // Fallback: verificar se é deployer
        isAuthorized = currentAccount.toLowerCase() === CONFIG.DEPLOYER_ADDRESS.toLowerCase();
    }
    
    // Se tiver contrato, verificar também no blockchain
    if (daoContract) {
        try {
            const contractAuth = await daoContract.authorizedProposers(currentAccount);
            console.log('Autorização no contrato:', contractAuth);
            isAuthorized = isAuthorized || contractAuth;
        } catch (error) {
            console.error('Erro ao verificar autorização no contrato:', error);
            console.log('Usando apenas verificação do AccessControl');
        }
    } else {
        console.log('⚠️ Contrato DAO não inicializado ainda');
    }
    
    console.log('Resultado final - Autorizado:', isAuthorized);
    
    if (isAuthorized) {
        // Forçar exibição
        multiOptionLabel.style.display = 'block';
        multiOptionLabel.style.visibility = 'visible';
        multiOptionLabel.style.opacity = '1';
        multiOptionLabel.removeAttribute('hidden');
        
        console.log('✅ Opção de múltiplas opções HABILITADA');
        console.log('Elemento encontrado:', multiOptionLabel);
        console.log('Display style:', window.getComputedStyle(multiOptionLabel).display);
        console.log('Visibility:', window.getComputedStyle(multiOptionLabel).visibility);
        
        // Verificar se realmente está visível
        setTimeout(() => {
            const computed = window.getComputedStyle(multiOptionLabel);
            console.log('Verificação final - Display:', computed.display, 'Visibility:', computed.visibility);
            if (computed.display === 'none' || computed.visibility === 'hidden') {
                console.warn('⚠️ Ainda não está visível! Tentando forçar novamente...');
                multiOptionLabel.style.setProperty('display', 'block', 'important');
                multiOptionLabel.style.setProperty('visibility', 'visible', 'important');
            }
        }, 100);
    } else {
        multiOptionLabel.style.display = 'none';
        multiOptionLabel.style.visibility = 'hidden';
        // Se estava selecionado, mudar para simples
        const multiRadio = document.querySelector('input[name="proposal-type"][value="multi"]');
        if (multiRadio && multiRadio.checked) {
            document.querySelector('input[name="proposal-type"][value="simple"]').checked = true;
            document.getElementById('multi-options-container').style.display = 'none';
        }
        console.log('❌ Opção de múltiplas opções DESABILITADA');
    }
    
    console.log('=== FIM checkAuthorizedProposer ===');
}


// Gerenciar tipo de proposta
document.querySelectorAll('input[name="proposal-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const multiContainer = document.getElementById('multi-options-container');
        
        if (e.target.value === 'multi') {
            // Verificar se o usuário está autorizado (deployer ou owner)
            if (!currentAccount) {
                alert('Conecte sua carteira primeiro!');
                document.querySelector('input[name="proposal-type"][value="simple"]').checked = true;
                return;
            }
            
            // Verificar autorização de forma assíncrona
            (async () => {
                let isAuthorized = false;
                
                if (window.AccessControl) {
                    try {
                        isAuthorized = await window.AccessControl.hasAdminAccess(currentAccount);
                    } catch (error) {
                        console.error('Erro ao verificar acesso:', error);
                    }
                }
                
                // Também verificar no contrato se disponível
                if (daoContract && !isAuthorized) {
                    try {
                        const isOwnerOrDeployer = await daoContract.isOwnerOrDeployer(currentAccount);
                        isAuthorized = isOwnerOrDeployer;
                    } catch (error) {
                        console.error('Erro ao verificar no contrato:', error);
                    }
                }
                
                if (!isAuthorized) {
                    alert('Apenas deployer ou owners podem criar propostas com múltiplas opções!');
                    document.querySelector('input[name="proposal-type"][value="simple"]').checked = true;
                    multiContainer.style.display = 'none';
                } else {
                    multiContainer.style.display = 'block';
                }
            })();
        } else {
            multiContainer.style.display = 'none';
        }
    });
});


// Adicionar opção
document.getElementById('add-option-btn').addEventListener('click', () => {
    const optionsList = document.getElementById('options-list');
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.innerHTML = `
        <input type="text" class="option-field" placeholder="Nome da Chapa/Pessoa" required>
        <button type="button" class="btn btn-danger remove-option-btn" onclick="this.parentElement.remove()">Remover</button>
    `;
    optionsList.appendChild(optionDiv);
    
    // Atualizar visibilidade dos botões remover
    updateRemoveButtons();
});

// Atualizar visibilidade dos botões remover (mostrar apenas se houver mais de 2 opções)
function updateRemoveButtons() {
    const options = document.querySelectorAll('.option-input');
    const removeButtons = document.querySelectorAll('.remove-option-btn');
    
    if (options.length <= 2) {
        removeButtons.forEach(btn => btn.style.display = 'none');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    }
}

// Atualizar ao remover opções
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-option-btn')) {
        setTimeout(updateRemoveButtons, 100);
    }
});

// Criar proposta
document.getElementById('create-proposal-btn').addEventListener('click', async () => {
    const description = document.getElementById('proposal-description').value.trim();
    const proposalType = document.querySelector('input[name="proposal-type"]:checked').value;
    
    if (!description) {
        alert('Por favor, descreva a proposta!');
        return;
    }
    
    if (!daoContract) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    try {
        if (proposalType === 'multi') {
            // Verificar autorização (deployer ou owner)
            let isAuthorized = false;
            
            if (window.AccessControl && currentAccount) {
                try {
                    isAuthorized = await window.AccessControl.hasAdminAccess(currentAccount);
                } catch (error) {
                    console.error('Erro ao verificar acesso:', error);
                }
            }
            
            // Também verificar no contrato se disponível
            if (daoContract && currentAccount && !isAuthorized) {
                try {
                    const isOwnerOrDeployer = await daoContract.isOwnerOrDeployer(currentAccount);
                    isAuthorized = isOwnerOrDeployer;
                } catch (error) {
                    console.error('Erro ao verificar no contrato:', error);
                }
            }
            
            if (!isAuthorized) {
                alert('Apenas deployer ou owners podem criar propostas com múltiplas opções!');
                return;
            }
            
            // Coletar opções
            const optionInputs = document.querySelectorAll('.option-field');
            const options = Array.from(optionInputs)
                .map(input => input.value.trim())
                .filter(val => val.length > 0);
            
            if (options.length < 2) {
                alert('Adicione pelo menos 2 opções (chapas/pessoas)!');
                return;
            }
            
            if (options.length > 10) {
                alert('Máximo de 10 opções permitidas!');
                return;
            }
            
            // Adicionar opção "Nulo" automaticamente
            options.push('Nulo');
            
            const tx = await daoContract.createMultiOptionProposal(description, options);
            alert('Transação enviada! Aguardando confirmação...');
            await tx.wait();
            alert('Proposta criada com sucesso!');
            
            // Limpar formulário
            document.getElementById('proposal-description').value = '';
            document.getElementById('options-list').innerHTML = `
                <div class="option-input">
                    <input type="text" class="option-field" placeholder="Nome da Chapa/Pessoa 1" required>
                    <button type="button" class="btn btn-danger remove-option-btn" onclick="this.parentElement.remove()" style="display: none;">Remover</button>
                </div>
                <div class="option-input">
                    <input type="text" class="option-field" placeholder="Nome da Chapa/Pessoa 2" required>
                    <button type="button" class="btn btn-danger remove-option-btn" onclick="this.parentElement.remove()">Remover</button>
                </div>
            `;
            updateRemoveButtons();
        } else {
            const tx = await daoContract.createProposal(description);
            alert('Transação enviada! Aguardando confirmação...');
            await tx.wait();
            alert('Proposta criada com sucesso!');
            document.getElementById('proposal-description').value = '';
        }
        
        await loadProposals();
        await loadDAOInfo();
    } catch (error) {
        console.error('Erro ao criar proposta:', error);
        alert('Erro ao criar proposta: ' + error.message);
    }
});

// Modal de votação
let isMultiOptionProposal = false;
async function openVoteModal(proposalId, isMulti = false) {
    currentProposalId = proposalId;
    isMultiOptionProposal = isMulti;
    document.getElementById('vote-modal').style.display = 'block';
    
    // Carregar detalhes da proposta
    await loadProposalDetails(proposalId, isMulti);
}

function closeVoteModal() {
    document.getElementById('vote-modal').style.display = 'none';
    currentProposalId = null;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('vote-modal');
    if (event.target === modal) {
        closeVoteModal();
    }
}

document.querySelector('.close').onclick = closeVoteModal;

async function loadProposalDetails(proposalId, isMulti = false) {
    if (!daoContract) return;
    
    try {
        const container = document.getElementById('proposal-details');
        const voteOptions = document.querySelector('.vote-options');
        
        if (isMulti) {
            const proposal = await daoContract.getProposal(proposalId);
            const multiData = await daoContract.getMultiOptionProposal(proposalId);
            
            container.innerHTML = `
                <h3>Proposta #${proposalId}</h3>
                <p><strong>Descrição:</strong> ${proposal.description}</p>
                <p><strong>Proponente:</strong> ${proposal.proposer}</p>
                <hr>
                <h4>Escolha uma opção:</h4>
            `;
            
            // Criar botões para cada opção
            voteOptions.innerHTML = '';
            for (let i = 0; i < multiData.options.length; i++) {
                const optionName = multiData.options[i];
                const voteCount = multiData.optionVoterCounts[i].toString();
                const tokenAmount = ethers.utils.formatEther(multiData.optionVotes[i]);
                
                const btn = document.createElement('button');
                btn.className = optionName === 'Nulo' ? 'btn btn-secondary' : 'btn btn-primary';
                btn.style.margin = '5px';
                btn.style.width = '100%';
                btn.style.textAlign = 'left';
                btn.style.padding = '15px';
                btn.innerHTML = `
                    <div style="font-weight: bold; font-size: 1.1em;">${optionName}</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">${voteCount} votos • ${tokenAmount} tokens</div>
                `;
                btn.onclick = () => castMultiOptionVote(proposalId, i);
                voteOptions.appendChild(btn);
            }
        } else {
            const proposal = await daoContract.getProposal(proposalId);
            
            container.innerHTML = `
                <h3>Proposta #${proposalId}</h3>
                <p><strong>Descrição:</strong> ${proposal.description}</p>
                <p><strong>Proponente:</strong> ${proposal.proposer}</p>
                <p><strong>Votos a Favor:</strong> ${ethers.utils.formatEther(proposal.votesFor)} (${proposal.voterCount} votantes)</p>
                <p><strong>Votos Contra:</strong> ${ethers.utils.formatEther(proposal.votesAgainst)}</p>
                <p><strong>Abstenções:</strong> ${ethers.utils.formatEther(proposal.votesAbstain)}</p>
            `;
            
            voteOptions.innerHTML = `
                <button class="btn btn-success" onclick="castVote(1)">👍 A Favor</button>
                <button class="btn btn-danger" onclick="castVote(2)">👎 Contra</button>
                <button class="btn btn-secondary" onclick="castVote(3)">🤷 Abster</button>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
    }
}

async function castVote(voteType) {
    if (!daoContract || currentProposalId === null) return;
    
    try {
        // Verificar saldo antes de votar (para dar feedback melhor ao usuário)
        if (tokenContract && currentAccount) {
            const balance = await tokenContract.balanceOf(currentAccount);
            const balanceFormatted = ethers.utils.formatEther(balance);
            
            // Verificar se é owner/deployer
            let isOwnerOrDeployer = false;
            if (window.AccessControl && currentAccount) {
                const hasAdmin = await window.AccessControl.hasAdminAccess(currentAccount);
                if (hasAdmin) {
                    isOwnerOrDeployer = true;
                }
            }
            
            // Se não é owner/deployer e não tem tokens suficientes, avisar
            if (!isOwnerOrDeployer && parseFloat(balanceFormatted) < 1) {
                const message = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                              `Seu saldo atual: ${balanceFormatted} DASI\n\n` +
                              'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
                alert(message);
                return;
            }
        }
        
        const tx = await daoContract.vote(currentProposalId, voteType);
        alert('Voto enviado! Aguardando confirmação...');
        
        await tx.wait();
        alert('Voto registrado com sucesso!');
        
        closeVoteModal();
        await loadProposals();
        await loadUserData();
    } catch (error) {
        console.error('Erro ao votar:', error);
        
        // Tratamento de erro mais detalhado
        let errorMessage = 'Erro ao votar: ';
        
        if (error.data && error.data.message) {
            const revertReason = error.data.message;
            if (revertReason.includes('Must hold tokens to vote')) {
                errorMessage = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                             'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
            } else if (revertReason.includes('Insufficient tokens')) {
                errorMessage = 'Você não tem tokens suficientes para votar.\n\n' +
                             'É necessário ter pelo menos 1 token DASI.';
            } else if (revertReason.includes('Already voted')) {
                errorMessage = 'Você já votou nesta proposta.';
            } else if (revertReason.includes('Voting ended')) {
                errorMessage = 'O período de votação já terminou.';
            } else if (revertReason.includes('Voting not started')) {
                errorMessage = 'A votação ainda não começou.';
            } else if (revertReason.includes('not approved')) {
                errorMessage = 'Esta proposta ainda não foi aprovada pelos administradores.';
            } else {
                errorMessage += revertReason;
            }
        } else if (error.message) {
            if (error.message.includes('Must hold tokens') || error.message.includes('Insufficient tokens')) {
                errorMessage = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                             'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
            } else {
                errorMessage += error.message;
            }
        } else {
            errorMessage += 'Erro desconhecido. Verifique o console para mais detalhes.';
        }
        
        alert(errorMessage);
    }
}

async function castMultiOptionVote(proposalId, optionIndex) {
    if (!daoContract) return;
    
    try {
        // Verificar saldo antes de votar (para dar feedback melhor ao usuário)
        if (tokenContract && currentAccount) {
            const balance = await tokenContract.balanceOf(currentAccount);
            const balanceFormatted = ethers.utils.formatEther(balance);
            
            // Verificar se é owner/deployer
            let isOwnerOrDeployer = false;
            if (window.AccessControl && currentAccount) {
                const hasAdmin = await window.AccessControl.hasAdminAccess(currentAccount);
                if (hasAdmin) {
                    isOwnerOrDeployer = true;
                }
            }
            
            // Se não é owner/deployer e não tem tokens suficientes, avisar
            if (!isOwnerOrDeployer && parseFloat(balanceFormatted) < 1) {
                const message = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                              `Seu saldo atual: ${balanceFormatted} DASI\n\n` +
                              'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
                alert(message);
                return;
            }
        }
        
        const tx = await daoContract.voteMultiOption(proposalId, optionIndex);
        alert('Voto enviado! Aguardando confirmação...');
        
        await tx.wait();
        alert('Voto registrado com sucesso!');
        
        closeVoteModal();
        await loadProposals();
        await loadUserData();
    } catch (error) {
        console.error('Erro ao votar:', error);
        
        // Tratamento de erro mais detalhado
        let errorMessage = 'Erro ao votar: ';
        
        if (error.data && error.data.message) {
            const revertReason = error.data.message;
            if (revertReason.includes('Must hold tokens to vote')) {
                errorMessage = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                             'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
            } else if (revertReason.includes('Insufficient tokens')) {
                errorMessage = 'Você não tem tokens suficientes para votar.\n\n' +
                             'É necessário ter pelo menos 1 token DASI.';
            } else if (revertReason.includes('Already voted')) {
                errorMessage = 'Você já votou nesta proposta.';
            } else if (revertReason.includes('Voting ended')) {
                errorMessage = 'O período de votação já terminou.';
            } else if (revertReason.includes('Voting not started')) {
                errorMessage = 'A votação ainda não começou.';
            } else if (revertReason.includes('not approved')) {
                errorMessage = 'Esta proposta ainda não foi aprovada pelos administradores.';
            } else {
                errorMessage += revertReason;
            }
        } else if (error.message) {
            if (error.message.includes('Must hold tokens') || error.message.includes('Insufficient tokens')) {
                errorMessage = 'Você precisa ter pelo menos 1 token DASI para votar.\n\n' +
                             'Por favor, solicite um cadastro e aguarde a aprovação para receber tokens.';
            } else {
                errorMessage += error.message;
            }
        } else {
            errorMessage += 'Erro desconhecido. Verifique o console para mais detalhes.';
        }
        
        alert(errorMessage);
    }
}

async function executeProposal(proposalId) {
    if (!daoContract) return;
    
    if (!confirm('Tem certeza que deseja executar esta proposta?')) {
        return;
    }
    
    try {
        const tx = await daoContract.executeProposal(proposalId);
        alert('Executando proposta... Aguardando confirmação...');
        
        await tx.wait();
        alert('Proposta executada com sucesso!');
        
        await loadProposals();
    } catch (error) {
        console.error('Erro ao executar proposta:', error);
        alert('Erro ao executar proposta: ' + error.message);
    }
}


// Conectar botão - aguardar DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', connectWallet);
        }
    });
} else {
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
}

// Função de teste para verificar autorização manualmente (pode ser chamada no console)
window.testAuthorization = async function() {
    console.log('=== TESTE MANUAL DE AUTORIZAÇÃO ===');
    console.log('Conta atual:', currentAccount);
    
    if (!currentAccount) {
        console.log('❌ Nenhuma conta conectada!');
        return;
    }
    
    const isAuthorized = window.AccessControl ? 
        window.AccessControl.hasAdminAccess(currentAccount) : false;
    const isDeployer = window.AccessControl ? 
        window.AccessControl.isDeployer(currentAccount) : false;
    const isOwner = window.AccessControl ? 
        window.AccessControl.isOwner(currentAccount) : false;
    
    console.log('É deployer?', isDeployer);
    console.log('É owner?', isOwner);
    console.log('Está autorizada?', isAuthorized);
    
    const label = document.getElementById('multi-option-label');
    if (label) {
        if (isAuthorized) {
            label.style.display = 'block';
            label.style.visibility = 'visible';
            console.log('✅ Opção HABILITADA manualmente');
        } else {
            label.style.display = 'none';
            console.log('❌ Opção DESABILITADA');
        }
    } else {
        console.log('❌ Elemento não encontrado!');
    }
    
    return isAuthorized;
}

// Verificar e mostrar botão de admin se for deployer/owner
async function checkAndShowAdminButton() {
    if (!currentAccount) {
        return;
    }
    
    const adminBtn = document.getElementById('admin-nav-btn');
    if (!adminBtn) {
        return;
    }
    
    try {
        if (window.AccessControl) {
            const hasAdmin = await window.AccessControl.hasAdminAccess(currentAccount);
            if (hasAdmin) {
                adminBtn.style.display = 'inline-block';
                console.log('✅ Botão de admin mostrado - usuário é deployer/owner');
            } else {
                adminBtn.style.display = 'none';
                console.log('❌ Botão de admin oculto - usuário não é admin');
            }
        } else {
            adminBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar acesso admin:', error);
        adminBtn.style.display = 'none';
    }
};

