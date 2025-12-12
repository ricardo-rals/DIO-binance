/**
 * Script para definir o deployer no backend após o deploy
 * Uso: node scripts/setup-deployer.js <endereco-do-deployer>
 */

const axios = require('axios');

async function setupDeployer(deployerAddress) {
    if (!deployerAddress) {
        console.error('❌ Erro: Endereço do deployer não fornecido');
        console.log('Uso: node scripts/setup-deployer.js <endereco-do-deployer>');
        process.exit(1);
    }

    const API_URL = 'http://localhost:3000/api/access-control/deployer';

    try {
        console.log('🔄 Definindo deployer no backend...');
        console.log(`   Endereço: ${deployerAddress}`);
        
        const response = await axios.post(API_URL, {
            address: deployerAddress
        });
        
        console.log('✅ Deployer definido com sucesso!');
        console.log(`   ${response.data.message}`);
        console.log(`   Deployer: ${response.data.deployer}`);
    } catch (error) {
        if (error.response) {
            if (error.response.status === 400 && 
                error.response.data.error.includes('já definido')) {
                console.log('⚠️  Deployer já estava definido no backend');
                console.log(`   Deployer atual: ${deployerAddress}`);
            } else {
                console.error('❌ Erro ao definir deployer:', error.response.data.error);
                process.exit(1);
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Erro: Backend não está rodando!');
            console.error('   Por favor, inicie o servidor backend primeiro:');
            console.error('   npm run backend');
            process.exit(1);
        } else {
            console.error('❌ Erro:', error.message);
            process.exit(1);
        }
    }
}

// Obter endereço dos argumentos da linha de comando
const deployerAddress = process.argv[2];

setupDeployer(deployerAddress);

