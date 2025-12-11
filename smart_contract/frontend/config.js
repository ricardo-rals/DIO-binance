// Configuração dos contratos
// IMPORTANTE: Atualize estes endereços após fazer o deploy dos contratos

const CONFIG = {
    // Endereços dos contratos (atualizados após deploy)
    TOKEN_ADDRESS: "0x67eC759C65327793E1bC9041b78b9996fD46AABb", // DASIToken
    DAO_ADDRESS: "0x6149170F44814873bD0387f88f24E9DDFAC9FD90", // DASIDAO
    
    // Controle de Acesso
    DEPLOYER_ADDRESS: "0xF3cA79A01452E14C2790A8298D16dfade24ade8d", // Endereço do deployer (acesso total)
    OWNERS: [
        // Lista de owners/diretores (também têm acesso total)
        // Pode ser gerenciado pelo deployer através da interface admin
    ],
    
    // ABI dos contratos (será gerado automaticamente após compilação)
    // Por enquanto, vamos usar ABIs simplificados
    TOKEN_ABI: [
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function mint(address to, uint256 amount)",
        "function batchMint(address[] calldata recipients, uint256[] calldata amounts)",
        "function burn(uint256 amount)",
        "function burnFrom(address from, uint256 amount)",
        "function authorizedMinters(address) view returns (bool)",
        "function authorizedBurners(address) view returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event TokensBurned(address indexed from, uint256 amount)"
    ],
    
    DAO_ABI: [
        "function createProposal(string memory description) returns (uint256)",
        "function createMultiOptionProposal(string memory description, string[] memory options) returns (uint256)",
        "function vote(uint256 proposalId, uint8 voteType)",
        "function voteMultiOption(uint256 proposalId, uint256 optionIndex)",
        "function executeProposal(uint256 proposalId)",
        "function voteOnProposalApproval(uint256 proposalId, bool approve, address[] calldata approvedUsers)",
        "function getProposal(uint256 proposalId) view returns (uint256 id, address proposer, string memory description, uint256 startTime, uint256 endTime, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, uint256 voterCountFor, uint256 voterCountAgainst, uint256 voterCountAbstain, uint256 voterCount, bool executed, bool exists, bool isMultiOption)",
        "function getMultiOptionProposal(uint256 proposalId) view returns (string[] memory options, uint256[] memory optionVotes, uint256[] memory optionVoterCounts)",
        "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
        "function getVote(uint256 proposalId, address voter) view returns (uint8)",
        "function getProposalStatus(uint256 proposalId) view returns (string memory)",
        "function getProposalApprovalInfo(uint256 proposalId) view returns (bool needsApproval, bool approved, uint256 approvalVotes, uint256 approvalVoterCount, uint256 totalOwners)",
        "function hasOwnerVotedOnApproval(uint256 proposalId, address owner) view returns (bool)",
        "function isOwnerOrDeployer(address account) view returns (bool)",
        "function getOwners() view returns (address[] memory)",
        "function proposalCount() view returns (uint256)",
        "function quorumPercentage() view returns (uint256)",
        "function votingPeriod() view returns (uint256)",
        "function ownerQuorumPercentage() view returns (uint256)",
        "function authorizedProposers(address) view returns (bool)",
        "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startTime, uint256 endTime, bool isMultiOption)",
        "event MultiOptionProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, string[] options, uint256 startTime, uint256 endTime)",
        "event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 vote, uint256 weight)",
        "event MultiOptionVoteCast(uint256 indexed proposalId, address indexed voter, uint256 optionIndex, uint256 weight)",
        "event ProposalExecuted(uint256 indexed proposalId, bool passed)",
        "event ProposalApprovedByOwners(uint256 indexed proposalId, address[] recipients)",
        "event OwnerApprovalVoteCast(uint256 indexed proposalId, address indexed owner, bool approved)"
    ],
    
    // Configuração da rede
    NETWORK: {
        chainId: "0x539", // Ganache/Hardhat local (1337 em hex)
        chainName: "Ganache Local",
        rpcUrls: ["http://127.0.0.1:7545"],
        nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18
        }
    }
};

// Função para atualizar os endereços dos contratos
function updateContractAddresses(tokenAddress, daoAddress) {
    CONFIG.TOKEN_ADDRESS = tokenAddress;
    CONFIG.DAO_ADDRESS = daoAddress;
    console.log("Endereços atualizados:", { tokenAddress, daoAddress });
}

