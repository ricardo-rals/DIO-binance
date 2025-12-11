/**
 * Script para resetar/limpar o sistema
 * Remove todos os cadastros e dados do localStorage
 * 
 * ATENÇÃO: Isso apagará todos os dados locais!
 * Use apenas para desenvolvimento/testes
 */

function resetSystem() {
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados do sistema (cadastros, controle de acesso, etc).\n\nTem certeza que deseja continuar?')) {
        return;
    }
    
    try {
        // Limpar cadastros
        localStorage.removeItem('dasi_cadastros');
        console.log('✅ Cadastros removidos');
        
        // Limpar controle de acesso (mas manter deployer)
        const accessControl = localStorage.getItem('dasi_access_control');
        if (accessControl) {
            const data = JSON.parse(accessControl);
            // Manter apenas o deployer, remover owners e resetar
            const resetControl = {
                deployer: data.deployer || CONFIG.DEPLOYER_ADDRESS,
                owners: [],
                initialized: true,
                createdAt: Date.now()
            };
            localStorage.setItem('dasi_access_control', JSON.stringify(resetControl));
            console.log('✅ Controle de acesso resetado (deployer mantido)');
        }
        
        // Limpar sessão
        localStorage.removeItem('dasi_wallet_session');
        console.log('✅ Sessão removida');
        
        alert('✅ Sistema resetado com sucesso!\n\n- Todos os cadastros foram removidos\n- Controle de acesso resetado (apenas deployer mantido)\n- Sessão removida\n\nRecarregue a página para aplicar as mudanças.');
        
        // Recarregar página após 2 segundos
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao resetar sistema:', error);
        alert('❌ Erro ao resetar sistema: ' + error.message);
    }
}

// Função para resetar apenas cadastros
function resetCadastros() {
    if (!confirm('Isso irá apagar TODOS os cadastros. Deseja continuar?')) {
        return;
    }
    
    try {
        localStorage.removeItem('dasi_cadastros');
        alert('✅ Cadastros removidos com sucesso!');
        window.location.reload();
    } catch (error) {
        console.error('Erro ao resetar cadastros:', error);
        alert('❌ Erro ao resetar cadastros: ' + error.message);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.resetSystem = resetSystem;
    window.resetCadastros = resetCadastros;
    
    // Adicionar ao console para fácil acesso
    console.log('%c🔧 Funções de Reset Disponíveis:', 'color: #667eea; font-weight: bold;');
    console.log('  - resetSystem() - Reseta todo o sistema');
    console.log('  - resetCadastros() - Reseta apenas os cadastros');
}


