require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true // Resolve problemas de "Stack too deep"
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337, // Ganache padrão usa 1337, ajuste se necessário
      // Se GANACHE_PRIVATE_KEYS não estiver definido, o Hardhat usará as contas do Ganache automaticamente
      accounts: process.env.GANACHE_PRIVATE_KEYS 
        ? process.env.GANACHE_PRIVATE_KEYS.split(',').map(key => key.trim())
        : undefined // undefined permite que o Hardhat use as contas do Ganache automaticamente
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

