const hre = require("hardhat");

/**
 * Script de deploy específico para Ganache
 * Este script assume que o Ganache está rodando na porta 7545
 */
async function main() {
    console.log("🚀 Iniciando deploy dos contratos no Ganache...\n");

    // Obter contas do Ganache
    const accounts = await hre.ethers.getSigners();
    
    if (accounts.length === 0) {
        throw new Error("Nenhuma conta encontrada. Certifique-se de que o Ganache está rodando!");
    }

    const deployer = accounts[0];
    console.log("📝 Fazendo deploy com a conta:", deployer.address);
    
    // No ethers v6, usar provider.getBalance() ao invés de signer.getBalance()
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Saldo da conta:", hre.ethers.formatEther(balance), "ETH\n");

    // Verificar se há saldo suficiente
    if (balance < hre.ethers.parseEther("0.01")) {
        console.warn("⚠️  Aviso: Saldo baixo. Certifique-se de que o Ganache tem ETH suficiente.");
    }

    // Deploy do Token DASI
    console.log("1️⃣ Deployando DASIToken...");
    const DASIToken = await hre.ethers.getContractFactory("DASIToken");
    const token = await DASIToken.deploy(deployer.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ DASIToken deployed para:", tokenAddress);

    // Deploy do DAO
    console.log("\n2️⃣ Deployando DASIDAO...");
    
    // Configurações da DAO
    const QUORUM_PERCENTAGE = 50; // 50% de quórum
    const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 dias em segundos
    
    const DASIDAO = await hre.ethers.getContractFactory("DASIDAO");
    const dao = await DASIDAO.deploy(
        tokenAddress,
        deployer.address,
        QUORUM_PERCENTAGE,
        VOTING_PERIOD
    );
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    console.log("✅ DASIDAO deployed para:", daoAddress);

    // Adicionar o DAO como minter e burner do token
    console.log("\n3️⃣ Configurando permissões...");
    const addMinterTx = await token.addMinter(daoAddress);
    await addMinterTx.wait();
    console.log("✅ DAO adicionado como minter do token");
    
    const addBurnerTx = await token.addBurner(daoAddress);
    await addBurnerTx.wait();
    console.log("✅ DAO adicionado como burner do token");
    
    // Mintear 1 token inicial para o deployer
    console.log("\n4️⃣ Minteando token inicial para o deployer...");
    const initialTokenAmount = hre.ethers.parseEther("1"); // 1 token DASI
    const mintTx = await token.mint(deployer.address, initialTokenAmount);
    await mintTx.wait();
    console.log(`✅ ${hre.ethers.formatEther(initialTokenAmount)} token DASI minteado para o deployer`);
    
    // O deployer já é minter por padrão (passado no construtor)
    // Tokens adicionais serão distribuídos através da interface admin após aprovar cadastros
    console.log("\n5️⃣ Deploy concluído!");
    console.log("   💡 O deployer tem permissão de minter e pode distribuir tokens");
    console.log("   💡 O deployer recebeu 1 token inicial para participar das votações");
    console.log("   💡 Use a interface admin para aprovar cadastros e distribuir tokens");

    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMO DO DEPLOY");
    console.log("=".repeat(60));
    console.log("Rede: Ganache");
    console.log("DASIToken Address:", tokenAddress);
    console.log("DASIDAO Address:", daoAddress);
    console.log("Quórum:", QUORUM_PERCENTAGE + "%");
    console.log("Período de Votação:", VOTING_PERIOD / (24 * 60 * 60), "dias");
    console.log("=".repeat(60));

    console.log("\n📝 IMPORTANTE: Atualize os endereços em frontend/config.js:");
    console.log(`   TOKEN_ADDRESS: "${tokenAddress}"`);
    console.log(`   DAO_ADDRESS: "${daoAddress}"`);

    // Salvar endereços em um arquivo para referência
    const fs = require('fs');
    const deploymentInfo = {
        network: "ganache",
        deployer: deployer.address,
        tokenAddress: tokenAddress,
        daoAddress: daoAddress,
        quorumPercentage: QUORUM_PERCENTAGE,
        votingPeriod: VOTING_PERIOD,
        timestamp: new Date().toISOString(),
        accounts: accounts.slice(0, 5).map(acc => ({
            address: acc.address,
            // Não salvar chaves privadas por segurança
        }))
    };

    fs.writeFileSync(
        './deployment-ganache.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n✅ Informações de deploy salvas em deployment-ganache.json");
    
    // Definir deployer na API backend (se estiver rodando)
    console.log("\n6️⃣ Configurando deployer no backend...");
    try {
        const axios = require('axios');
        const API_URL = 'http://localhost:3000/api/access-control/deployer';
        
        try {
            const response = await axios.post(API_URL, {
                address: deployer.address
            });
            console.log("✅ Deployer definido no backend:", response.data.message);
        } catch (apiError) {
            if (apiError.response && apiError.response.status === 400 && 
                apiError.response.data.error.includes('já definido')) {
                console.log("⚠️  Deployer já estava definido no backend");
            } else {
                console.log("⚠️  Backend não está rodando ou erro ao definir deployer.");
                console.log("   Você pode definir manualmente via API ou interface admin.");
                console.log(`   POST ${API_URL} com body: { "address": "${deployer.address}" }`);
            }
        }
    } catch (error) {
        // Se axios não estiver instalado, apenas avisar
        console.log("⚠️  Não foi possível definir deployer automaticamente.");
        console.log("   Certifique-se de definir o deployer manualmente após iniciar o backend:");
        console.log(`   POST http://localhost:3000/api/access-control/deployer`);
        console.log(`   Body: { "address": "${deployer.address}" }`);
    }
    
    console.log("\n💡 Dica: Use as contas do Ganache para testar a aplicação!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });