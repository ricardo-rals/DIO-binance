const hre = require("hardhat");

async function main() {
    console.log("🚀 Iniciando deploy dos contratos...\n");

    // Obter contas
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Fazendo deploy com a conta:", deployer.address);
    
    // No ethers v6, usar provider.getBalance()
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Saldo da conta:", hre.ethers.formatEther(balance), "ETH\n");

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
    
    // O deployer já é minter por padrão (passado no construtor)
    // Não mintear tokens automaticamente - isso será feito através da interface admin
    // após aprovar cadastros de estudantes
    console.log("\n4️⃣ Deploy concluído!");
    console.log("   💡 O deployer tem permissão de minter e pode distribuir tokens");
    console.log("   💡 Use a interface admin para aprovar cadastros e distribuir tokens");

    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMO DO DEPLOY");
    console.log("=".repeat(60));
    console.log("DASIToken Address:", token.address);
    console.log("DASIDAO Address:", dao.address);
    console.log("Quórum:", QUORUM_PERCENTAGE + "%");
    console.log("Período de Votação:", VOTING_PERIOD / (24 * 60 * 60), "dias");
    console.log("=".repeat(60));

    console.log("\n📝 IMPORTANTE: Atualize os endereços em frontend/config.js:");
    console.log(`   TOKEN_ADDRESS: "${tokenAddress}"`);
    console.log(`   DAO_ADDRESS: "${daoAddress}"`);
    console.log(`   DEPLOYER_ADDRESS: "${deployer.address}"`);

    // Salvar endereços em um arquivo para referência
    const fs = require('fs');
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        tokenAddress: tokenAddress,
        daoAddress: daoAddress,
        quorumPercentage: QUORUM_PERCENTAGE,
        votingPeriod: VOTING_PERIOD,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        './deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n✅ Informações de deploy salvas em deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


