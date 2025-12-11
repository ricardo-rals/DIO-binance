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
let signature = null;
let signedMessage = null;

// Elementos do DOM
const connectBtn = document.getElementById('connect-wallet-btn');
const disconnectBtn = document.getElementById('disconnect-wallet-btn');
const accountDisplay = document.getElementById('account-display');
const balanceDisplay = document.getElementById('token-balance');
const balanceAmount = document.getElementById('balance-amount');
const cadastroSection = document.getElementById('cadastro-section');
const cadastroForm = document.getElementById('cadastro-form');
const walletAddressInput = document.getElementById('wallet-address');
const fillAddressBtn = document.getElementById('fill-address-btn');
const signatureSection = document.getElementById('signature-section');
const messageToSign = document.getElementById('message-to-sign');
const signMessageBtn = document.getElementById('sign-message-btn');
const signatureStatus = document.getElementById('signature-status');
const submitBtn = document.getElementById('submit-cadastro-btn');
const cadastroStatusDiv = document.getElementById('cadastro-status');
const statusSection = document.getElementById('status-section');
const statusInfo = document.getElementById('cadastro-status-info');

// Inicialização
window.addEventListener('load', async () => {
    // Inicializar sistema de controle de acesso
    if (window.AccessControl) {
        window.AccessControl.init();
    }
    
    // Verificar se já está conectado - se estiver, bloquear acesso
    const session = window.SessionManager ? window.SessionManager.load() : null;
    if (session && session.account) {
        // Verificar se a conta ainda está conectada no MetaMask
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0 && accounts[0].toLowerCase() === session.account.toLowerCase()) {
                    // Usuário já está conectado, redirecionar para index
                    alert('Você já está conectado! A página de cadastro só é acessível para usuários não conectados.');
                    window.location.href = 'index.html';
                    return;
                }
            } catch (error) {
                console.error('Erro ao verificar conta:', error);
            }
        }
    }
    
    await checkConnection();
    await loadCadastroStatus();
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
        
        // Solicitar acesso à conta
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            alert('Nenhuma conta encontrada no MetaMask!');
            return;
        }

        currentAccount = accounts[0];
        
        // Configurar provider e signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Salvar sessão
        if (window.SessionManager) {
            window.SessionManager.save(currentAccount, 'ganache');
        }
        
        // Atualizar UI
        accountDisplay.textContent = `Conectado: ${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        
        // O formulário já está visível, apenas preencher endereço automaticamente
        walletAddressInput.value = currentAccount;
        
        // Verificar se já está cadastrado no localStorage primeiro
        await checkExistingCadastro();
        
        // Carregar saldo de tokens
        const balance = await loadTokenBalance();
        
        // Atualizar mensagem para assinatura
        updateMessageToSign();
        
        // Verificar se já tem cadastro no localStorage
        const cadastros = getCadastros();
        const existingCadastro = cadastros.find(c => 
            c.endereco.toLowerCase() === currentAccount.toLowerCase()
        );
        
        // Se já tem tokens E não tem cadastro no localStorage, mostrar aviso
        // (pode ser que tenha tokens de antes do reset)
        if (balance && parseFloat(balance) > 0 && !existingCadastro) {
            // Remover aviso anterior se existir
            const existingWarning = cadastroSection.querySelector('.token-warning');
            if (existingWarning) {
                existingWarning.remove();
            }
            
            // Mostrar aviso no topo, mas ainda permitir acesso ao formulário
            const warningDiv = document.createElement('div');
            warningDiv.className = 'token-warning';
            warningDiv.style.cssText = 'background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;';
            warningDiv.innerHTML = `
                <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Você possui tokens DASI na blockchain</h4>
                <p style="color: #856404; margin: 0;">
                    Você possui <strong>${balance} DASI</strong> na blockchain, mas não há cadastro registrado no sistema.
                    Isso pode acontecer após um reset do sistema. Você pode fazer um novo cadastro abaixo.
                </p>
            `;
            cadastroSection.insertBefore(warningDiv, cadastroForm);
        }
        
    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        alert('Erro ao conectar carteira: ' + error.message);
    }
}

// Desconectar carteira
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
    provider = null;
    signer = null;
    signature = null;
    signedMessage = null;
    
    accountDisplay.textContent = 'Não conectado';
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    balanceDisplay.style.display = 'none';
    // O formulário permanece visível mesmo quando desconectado
    statusSection.style.display = 'none';
    
    // Remover aviso de tokens se existir
    const warningDiv = cadastroSection.querySelector('.token-warning');
    if (warningDiv) {
        warningDiv.remove();
    }
    
    // Limpar formulário
    cadastroForm.reset();
    walletAddressInput.value = '';
    signatureSection.style.display = 'none';
    submitBtn.disabled = true;
}

// Preencher endereço automaticamente
fillAddressBtn.addEventListener('click', () => {
    if (currentAccount) {
        walletAddressInput.value = currentAccount;
        updateMessageToSign();
    } else {
        alert('Conecte sua carteira primeiro!');
    }
});

// Carregar saldo de tokens
async function loadTokenBalance() {
    if (!currentAccount) return null;
    
    try {
        const tokenContract = new ethers.Contract(
            CONFIG.TOKEN_ADDRESS,
            CONFIG.TOKEN_ABI,
            provider
        );
        
        const balance = await tokenContract.balanceOf(currentAccount);
        const balanceFormatted = ethers.utils.formatEther(balance);
        
        balanceAmount.textContent = balanceFormatted;
        balanceDisplay.style.display = 'block';
        
        return balanceFormatted;
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
        return null;
    }
}

// Atualizar mensagem para assinatura
function updateMessageToSign() {
    const matricula = document.getElementById('matricula').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const address = walletAddressInput.value.trim();
    
    if (matricula && nome && address && ethers.utils.isAddress(address)) {
        const message = `Eu sou ${nome} (Matrícula: ${matricula}) e controlo esta carteira: ${address}`;
        messageToSign.textContent = message;
        signedMessage = message;
        signatureSection.style.display = 'block';
    } else {
        signatureSection.style.display = 'none';
        signedMessage = null;
        signature = null;
    }
}

// Listener para atualizar mensagem quando campos mudarem
document.getElementById('matricula').addEventListener('input', updateMessageToSign);
document.getElementById('nome').addEventListener('input', updateMessageToSign);
walletAddressInput.addEventListener('input', updateMessageToSign);

// Assinar mensagem
signMessageBtn.addEventListener('click', async () => {
    if (!signer || !signedMessage) {
        alert('Preencha todos os campos primeiro!');
        return;
    }
    
    try {
        signatureStatus.innerHTML = '<span style="color: #667eea;">⏳ Assinando mensagem...</span>';
        signMessageBtn.disabled = true;
        
        // Assinar mensagem
        signature = await signer.signMessage(signedMessage);
        
        signatureStatus.innerHTML = '<span style="color: #48bb78;">✅ Mensagem assinada com sucesso!</span>';
        signMessageBtn.disabled = false;
        submitBtn.disabled = false;
        
        console.log('Assinatura:', signature);
    } catch (error) {
        console.error('Erro ao assinar mensagem:', error);
        signatureStatus.innerHTML = '<span style="color: #f56565;">❌ Erro ao assinar: ' + error.message + '</span>';
        signMessageBtn.disabled = false;
    }
});

// Verificar assinatura
function verifySignature(message, signature, address) {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        return false;
    }
}

// Verificar se já está cadastrado
async function checkExistingCadastro() {
    if (!currentAccount) return;
    
    const cadastros = getCadastros();
    const existing = cadastros.find(c => 
        c.endereco.toLowerCase() === currentAccount.toLowerCase()
    );
    
    if (existing) {
        statusSection.style.display = 'block';
        statusInfo.innerHTML = `
            <div style="background: #e6fffa; padding: 20px; border-radius: 8px; border-left: 4px solid #38b2ac;">
                <h3>✅ Você já está cadastrado!</h3>
                <p><strong>Matrícula:</strong> ${existing.matricula}</p>
                <p><strong>Nome:</strong> ${existing.nome}</p>
                <p><strong>Endereço:</strong> ${existing.endereco}</p>
                <p><strong>Status:</strong> ${existing.tokensDistribuidos ? '✅ Tokens já distribuídos' : '⏳ Aguardando distribuição de tokens'}</p>
                <p><strong>Data do Cadastro:</strong> ${new Date(existing.timestamp).toLocaleString('pt-BR')}</p>
            </div>
        `;
    }
}

// Obter cadastros do localStorage (usando AccessControl se disponível)
function getCadastros() {
    if (window.AccessControl) {
        return window.AccessControl.getCadastros();
    }
    try {
        const cadastros = localStorage.getItem('dasi_cadastros');
        return cadastros ? JSON.parse(cadastros) : [];
    } catch (error) {
        console.error('Erro ao ler cadastros:', error);
        return [];
    }
}

// Salvar cadastro
function saveCadastro(cadastro) {
    const cadastros = getCadastros();
    
    // Verificar se já existe
    const exists = cadastros.some(c => 
        c.matricula === cadastro.matricula || 
        c.endereco.toLowerCase() === cadastro.endereco.toLowerCase()
    );
    
    if (exists) {
        throw new Error('Matrícula ou endereço já cadastrado!');
    }
    
    cadastros.push(cadastro);
    
    // Salvar usando AccessControl se disponível
    if (window.AccessControl) {
        window.AccessControl.saveCadastros(cadastros);
    } else {
        localStorage.setItem('dasi_cadastros', JSON.stringify(cadastros));
    }
    
    return cadastros.length - 1; // Retorna o índice
}

// Submeter formulário
cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentAccount || !signer) {
        alert('Conecte sua carteira primeiro!');
        return;
    }
    
    if (!signature || !signedMessage) {
        alert('Assine a mensagem primeiro!');
        return;
    }
    
    const matricula = document.getElementById('matricula').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const endereco = walletAddressInput.value.trim();
    
    // Validações
    if (!matricula || !nome || !endereco) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    if (!ethers.utils.isAddress(endereco)) {
        alert('Endereço de carteira inválido!');
        return;
    }
    
    if (endereco.toLowerCase() !== currentAccount.toLowerCase()) {
        alert('O endereço deve corresponder à carteira conectada!');
        return;
    }
    
    // Verificar assinatura
    if (!verifySignature(signedMessage, signature, endereco)) {
        alert('Assinatura inválida! Por favor, assine novamente.');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        
        // Criar objeto de cadastro
        const cadastro = {
            matricula: matricula,
            nome: nome,
            email: email || '',
            endereco: endereco,
            assinatura: signature,
            mensagem: signedMessage,
            timestamp: Date.now(),
            status: 'pendente', // Status inicial: pendente de aprovação
            tokensDistribuidos: false,
            dataDistribuicao: null,
            aprovadoPor: null,
            dataAprovacao: null,
            rejeitadoPor: null,
            dataRejeicao: null,
            motivoRejeicao: null
        };
        
        // Salvar no localStorage
        saveCadastro(cadastro);
        
        // Mostrar sucesso
        cadastroStatusDiv.style.display = 'block';
        cadastroStatusDiv.innerHTML = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #856404; margin-bottom: 10px;">✅ Cadastro realizado com sucesso!</h3>
                <p style="color: #856404;">
                    Seus dados foram registrados e estão <strong>aguardando aprovação</strong> pela administração.
                </p>
                <p style="color: #856404; margin-top: 10px; font-size: 0.9em;">
                    Após a aprovação, você receberá 1 token DASI para participar das votações.
                </p>
                <p style="color: #856404; margin-top: 10px; font-size: 0.9em;">
                    <strong>Status:</strong> Pendente de aprovação
                </p>
            </div>
        `;
        
        // Limpar formulário
        cadastroForm.reset();
        signature = null;
        signedMessage = null;
        signatureSection.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviar Cadastro';
        
        // Recarregar status
        await loadCadastroStatus();
        
    } catch (error) {
        console.error('Erro ao salvar cadastro:', error);
        alert('Erro ao salvar cadastro: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Cadastro';
    }
});

// Carregar status do cadastro
async function loadCadastroStatus() {
    if (!currentAccount) return;
    
    const cadastros = getCadastros();
    const meuCadastro = cadastros.find(c => 
        c.endereco.toLowerCase() === currentAccount.toLowerCase()
    );
    
    if (meuCadastro) {
        statusSection.style.display = 'block';
        statusInfo.innerHTML = `
            <div style="background: #e6fffa; padding: 20px; border-radius: 8px; border-left: 4px solid #38b2ac;">
                <h3>📋 Seu Cadastro</h3>
                <div style="margin-top: 15px;">
                    <p><strong>Matrícula:</strong> ${meuCadastro.matricula}</p>
                    <p><strong>Nome:</strong> ${meuCadastro.nome}</p>
                    <p><strong>Email:</strong> ${meuCadastro.email || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> ${meuCadastro.endereco}</p>
                    <p><strong>Status:</strong> 
                        ${meuCadastro.tokensDistribuidos ? 
                            '<span style="color: #48bb78;">✅ Tokens distribuídos</span>' : 
                            '<span style="color: #f59e0b;">⏳ Aguardando distribuição</span>'
                        }
                    </p>
                    <p><strong>Data do Cadastro:</strong> ${new Date(meuCadastro.timestamp).toLocaleString('pt-BR')}</p>
                    ${meuCadastro.dataDistribuicao ? 
                        `<p><strong>Data da Distribuição:</strong> ${new Date(meuCadastro.dataDistribuicao).toLocaleString('pt-BR')}</p>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }
}

// Detectar mudança de conta no MetaMask
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (!autoReconnectEnabled) {
            // Se foi desconectado manualmente, limpar sessão
            if (window.SessionManager) window.SessionManager.clear();
            return;
        }
        
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount) {
            // Conta mudou, atualizar sessão
            if (window.SessionManager) {
                window.SessionManager.save(accounts[0], 'ganache');
            }
            // Só reconectar se já estava conectado
            connectWallet();
        }
    });
}

