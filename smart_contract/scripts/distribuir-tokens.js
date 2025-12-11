const hre = require("hardhat");

/**
 * Script para distribuir tokens DASI para estudantes cadastrados
 * 
 * ⚠️ NOTA: A interface admin (admin.html) é a forma recomendada para distribuir tokens.
 * Este script é uma alternativa para distribuição via linha de comando.
 * 
 * IMPORTANTE: A conta utilizada deve ser deployer ou owner (ter permissão de minter).
 * 
 * Uso:
 *   npx hardhat run scripts/distribuir-tokens.js --network ganache
 */

const fs = require('fs');
const path = require('path');

// Configuração - ATUALIZE COM OS ENDEREÇOS CORRETOS
const TOKEN_ADDRESS = "0x0C36468a7C177C7Cb09A5407b2AAA8D6c8150E4C"; // Atualize com o endereço do DASIToken
const TOKENS_POR_ESTUDANTE = "1"; // 1 token por estudante

// Caminho do arquivo de cadastros (simulado - em produção seria um banco de dados)
// NOTA: Os cadastros são salvos no localStorage do navegador. Para usar este script,
// você precisaria exportar os cadastros do localStorage para um arquivo JSON.
const CADASTROS_FILE = path.join(__dirname, '../frontend/cadastros.json');

async function main() {
    console.log("🚀 Iniciando distribuição de tokens...\n");
    console.log("⚠️  NOTA: A interface admin (admin.html) é a forma recomendada.\n");
    
    // Obter signer
    const [signer] = await hre.ethers.getSigners();
    console.log("📝 Conta utilizada:", signer.address);
    
    // Verificar se tem permissão de minter
    const tokenABI = [
        "function authorizedMinters(address) view returns (bool)",
        "function batchMint(address[] calldata recipients, uint256[] calldata amounts) external",
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
    ];
    
    const token = new hre.ethers.Contract(TOKEN_ADDRESS, tokenABI, signer);
    
    try {
        const isMinter = await token.authorizedMinters(signer.address);
        if (!isMinter) {
            console.error("❌ Erro: Conta não tem permissão de minter!");
            console.error("   Apenas deployer ou owners podem distribuir tokens.");
            console.error("   Use a interface admin (admin.html) para distribuir tokens.\n");
            process.exit(1);
        }
        console.log("✅ Conta tem permissão de minter\n");
    } catch (error) {
        console.error("❌ Erro ao verificar permissões:", error.message);
        process.exit(1);
    }
    
    
    // Ler cadastros
    let cadastros = [];
    
    // Tentar ler do localStorage (via arquivo JSON simulado)
    // Em produção, isso viria de um banco de dados
    try {
        if (fs.existsSync(CADASTROS_FILE)) {
            const data = fs.readFileSync(CADASTROS_FILE, 'utf8');
            cadastros = JSON.parse(data);
        } else {
            console.log("⚠️  Arquivo de cadastros não encontrado.");
            console.log("💡 Dica: Os cadastros são salvos no localStorage do navegador.");
            console.log("   Use a interface admin (admin.html) para distribuir tokens.\n");
            
            // Exemplo de uso manual
            console.log("Exemplo de uso manual:");
            console.log("const enderecos = ['0x...', '0x...'];");
            console.log("const amounts = enderecos.map(() => ethers.parseEther('1'));");
            console.log("await token.batchMint(enderecos, amounts);\n");
            return;
        }
    } catch (error) {
        console.error("❌ Erro ao ler cadastros:", error.message);
        return;
    }
    
    if (cadastros.length === 0) {
        console.log("ℹ️  Nenhum cadastro encontrado.");
        return;
    }
    
    // Filtrar apenas os que estão aprovados e ainda não receberam tokens
    const pendentes = cadastros.filter(c => 
        c.status === 'aprovado' && !c.tokensDistribuidos
    );
    
    if (pendentes.length === 0) {
        const aprovados = cadastros.filter(c => c.status === 'aprovado');
        const comTokens = aprovados.filter(c => c.tokensDistribuidos);
        
        if (aprovados.length === 0) {
            console.log("ℹ️  Nenhum cadastro aprovado encontrado.");
            console.log("   Aprove os cadastros primeiro na interface admin.\n");
        } else if (comTokens.length === aprovados.length) {
            console.log("✅ Todos os cadastros aprovados já receberam tokens!");
        } else {
            console.log("ℹ️  Nenhum cadastro aprovado pendente de distribuição.");
        }
        return;
    }
    
    console.log(`📊 Total de cadastros: ${cadastros.length}`);
    console.log(`⏳ Aguardando distribuição: ${pendentes.length}`);
    console.log(`✅ Já distribuídos: ${cadastros.length - pendentes.length}\n`);
    
    // Preparar dados para distribuição
    const enderecos = pendentes.map(c => c.endereco);
    const amounts = enderecos.map(() => hre.ethers.parseEther(TOKENS_POR_ESTUDANTE));
    
    console.log("📋 Endereços que receberão tokens:");
    enderecos.forEach((endereco, i) => {
        const cadastro = pendentes[i];
        console.log(`   ${i + 1}. ${cadastro.nome} (${cadastro.matricula}): ${endereco}`);
    });
    console.log();
    
    // Verificar saldo do contrato (se necessário)
    const totalNecessario = amounts.reduce((acc, val) => acc.add(val), hre.ethers.BigNumber.from(0));
    console.log(`💰 Total de tokens a distribuir: ${hre.ethers.formatEther(totalNecessario)} DASI\n`);
    
    // Confirmar
    console.log("⚠️  ATENÇÃO: Esta operação irá mintear tokens para os endereços acima.");
    console.log("Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n");
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Distribuir
    try {
        console.log("⏳ Enviando transação de distribuição...");
        const tx = await token.batchMint(enderecos, amounts);
        console.log("   Hash da transação:", tx.hash);
        
        console.log("⏳ Aguardando confirmação...");
        await tx.wait();
        
        console.log("✅ Tokens distribuídos com sucesso!\n");
        
        // Atualizar cadastros
        pendentes.forEach(cadastro => {
            cadastro.tokensDistribuidos = true;
            cadastro.dataDistribuicao = Date.now();
        });
        
        // Salvar de volta (se o arquivo existir)
        if (fs.existsSync(CADASTROS_FILE)) {
            fs.writeFileSync(CADASTROS_FILE, JSON.stringify(cadastros, null, 2));
            console.log("✅ Cadastros atualizados no arquivo.");
        }
        
        // Verificar saldos
        console.log("\n📊 Verificando saldos distribuídos:");
        for (let i = 0; i < enderecos.length; i++) {
            const balance = await token.balanceOf(enderecos[i]);
            const cadastro = pendentes[i];
            console.log(`   ${cadastro.nome}: ${hre.ethers.formatEther(balance)} DASI`);
        }
        
    } catch (error) {
        console.error("\n❌ Erro ao distribuir tokens:", error);
        if (error.message.includes('Not authorized')) {
            console.error("   Verifique se a conta tem permissão de minter no contrato DASIToken.");
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Erro:", error);
        process.exit(1);
    });


