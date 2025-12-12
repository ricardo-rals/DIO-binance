// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DASIToken.sol";

/**
 * @title DASIDAO
 * @dev Contrato de governança para a DAO DASI Gov
 * Permite criar propostas, votar e executar decisões
 */
contract DASIDAO is Ownable {
    DASIToken public token;
    
    // Estrutura de uma proposta simples (A Favor/Contra/Abster)
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 voterCountFor; // Contagem de votantes a favor
        uint256 voterCountAgainst; // Contagem de votantes contra
        uint256 voterCountAbstain; // Contagem de votantes que se abstiveram
        uint256 voterCount; // Total de votantes
        bool executed;
        bool exists;
        bool isMultiOption; // Se é proposta com múltiplas opções
        bool needsOwnerApproval; // Se precisa de aprovação dos owners
        bool approvedByOwners; // Se foi aprovada pelos owners
        uint256 ownerApprovalVotes; // Votos de owners a favor da aprovação
        uint256 ownerApprovalVoterCount; // Quantidade de owners que votaram
        mapping(address => bool) hasVoted;
        mapping(address => Vote) votes;
        mapping(address => bool) ownerHasVotedOnApproval; // Owners que já votaram na aprovação
    }
    
    // Estrutura para proposta com múltiplas opções
    struct MultiOptionProposal {
        uint256 proposalId;
        string[] options; // Opções de votação (ex: ["Chapa A", "Chapa B"])
        mapping(uint256 => uint256) optionVotes; // optionIndex => total de votos
        mapping(uint256 => uint256) optionVoterCount; // optionIndex => quantidade de votantes
    }
    
    enum Vote {
        None,
        For,
        Against,
        Abstain
    }
    
    // Configurações da DAO
    uint256 public quorumPercentage; // Porcentagem necessária para quórum (ex: 50 = 50%)
    uint256 public votingPeriod; // Período de votação em segundos (padrão: 7 dias)
    uint256 public ownerQuorumPercentage; // Quórum para aprovação de owners (ex: 50 = 50%)
    uint256 public proposalCount;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => MultiOptionProposal) public multiOptionProposals;
    mapping(address => uint256) public lastProposalTime; // Cooldown entre propostas
    mapping(address => bool) public authorizedProposers; // Endereços autorizados a criar propostas com múltiplas opções
    mapping(address => bool) public isOwner; // Verificar se é owner (deployer + owners adicionados)
    address[] public owners; // Lista de owners
    
    uint256 public constant MIN_PROPOSAL_COOLDOWN = 1 days;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startTime,
        uint256 endTime,
        bool isMultiOption
    );
    
    event MultiOptionProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        string[] options,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        Vote vote,
        uint256 weight
    );
    
    event MultiOptionVoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 optionIndex,
        uint256 weight
    );
    
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    event ProposalApprovedByOwners(uint256 indexed proposalId, address[] recipients);
    event OwnerApprovalVoteCast(uint256 indexed proposalId, address indexed owner, bool approved);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    
    constructor(
        address _tokenAddress,
        address initialOwner,
        uint256 _quorumPercentage,
        uint256 _votingPeriod
    ) Ownable(initialOwner) {
        token = DASIToken(_tokenAddress);
        quorumPercentage = _quorumPercentage;
        votingPeriod = _votingPeriod;
        ownerQuorumPercentage = 50; // 50% dos owners precisam aprovar
        
        // Autorizar owners iniciais
        authorizedProposers[initialOwner] = true;
        isOwner[initialOwner] = true;
        owners.push(initialOwner);
    }
    
    /**
     * @dev Adiciona um endereço autorizado a criar propostas com múltiplas opções
     */
    function addAuthorizedProposer(address proposer) external onlyOwner {
        authorizedProposers[proposer] = true;
    }
    
    /**
     * @dev Remove autorização de um endereço
     */
    function removeAuthorizedProposer(address proposer) external onlyOwner {
        authorizedProposers[proposer] = false;
    }
    
    /**
     * @dev Adiciona um owner (apenas deployer pode fazer isso)
     */
    function addOwner(address newOwner) external onlyOwner {
        require(!isOwner[newOwner], "DASIDAO: Already an owner");
        require(newOwner != owner(), "DASIDAO: Deployer is already owner");
        
        isOwner[newOwner] = true;
        owners.push(newOwner);
        authorizedProposers[newOwner] = true;
        
        emit OwnerAdded(newOwner);
    }
    
    /**
     * @dev Remove um owner (apenas deployer pode fazer isso)
     */
    function removeOwner(address ownerToRemove) external onlyOwner {
        require(isOwner[ownerToRemove], "DASIDAO: Not an owner");
        require(ownerToRemove != owner(), "DASIDAO: Cannot remove deployer");
        
        isOwner[ownerToRemove] = false;
        
        // Remover da lista
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == ownerToRemove) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        authorizedProposers[ownerToRemove] = false;
        
        emit OwnerRemoved(ownerToRemove);
    }
    
    /**
     * @dev Retorna a lista de owners
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Verifica se um endereço é owner ou deployer
     */
    function isOwnerOrDeployer(address account) public view returns (bool) {
        return account == owner() || isOwner[account];
    }
    
    /**
     * @dev Cria uma nova proposta
     * @param description Descrição da proposta
     * @return proposalId ID da proposta criada
     */
    function createProposal(string memory description) external returns (uint256) {
        require(
            block.timestamp >= lastProposalTime[msg.sender] + MIN_PROPOSAL_COOLDOWN,
            "DASIDAO: Cooldown period not passed"
        );
        
        // Verificar se precisa de aprovação dos owners
        bool proposerIsOwner = isOwnerOrDeployer(msg.sender);
        
        // Apenas não-owners precisam ter tokens para criar proposta
        // Owners/deployer podem criar sem tokens
        if (!proposerIsOwner) {
            require(token.balanceOf(msg.sender) > 0, "DASIDAO: Must hold tokens to create proposal");
        }
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.exists = true;
        proposal.isMultiOption = false;
        
        proposal.needsOwnerApproval = !proposerIsOwner;
        
        if (proposerIsOwner) {
            // Se é owner/deployer, aprovar automaticamente e iniciar votação
            proposal.approvedByOwners = true;
            proposal.startTime = block.timestamp;
            proposal.endTime = block.timestamp + votingPeriod;
        } else {
            // Se não é owner, precisa de aprovação - não inicia votação ainda
            proposal.approvedByOwners = false;
            proposal.startTime = 0; // Será definido quando aprovada
            proposal.endTime = 0;
        }
        
        lastProposalTime[msg.sender] = block.timestamp;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            proposal.startTime,
            proposal.endTime,
            false
        );
        
        return proposalId;
    }
    
    /**
     * @dev Cria uma proposta com múltiplas opções (apenas para owners/deployer)
     * @param description Descrição da proposta
     * @param options Array de opções para votação (ex: ["Chapa A", "Chapa B"])
     * @return proposalId ID da proposta criada
     */
    function createMultiOptionProposal(
        string memory description,
        string[] memory options
    ) external returns (uint256) {
        require(isOwnerOrDeployer(msg.sender), "DASIDAO: Only owners or deployer can create multi-option proposals");
        require(options.length >= 2, "DASIDAO: Must have at least 2 options");
        require(options.length <= 10, "DASIDAO: Maximum 10 options allowed");
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        MultiOptionProposal storage multiProposal = multiOptionProposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.exists = true;
        proposal.isMultiOption = true;
        
        // Propostas com múltiplas opções são sempre criadas por owners, então não precisam de aprovação
        proposal.needsOwnerApproval = false;
        proposal.approvedByOwners = true;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        
        // Armazenar opções
        for (uint256 i = 0; i < options.length; i++) {
            multiProposal.options.push(options[i]);
            multiProposal.optionVotes[i] = 0;
            multiProposal.optionVoterCount[i] = 0;
        }
        
        emit MultiOptionProposalCreated(
            proposalId,
            msg.sender,
            description,
            options,
            proposal.startTime,
            proposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Vota em uma proposta com múltiplas opções
     * @param proposalId ID da proposta
     * @param optionIndex Índice da opção escolhida (0-based)
     * @notice Cada voto consome 1 token DASI (queimado)
     */
    function voteMultiOption(uint256 proposalId, uint256 optionIndex) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "DASIDAO: Proposal does not exist");
        require(proposal.isMultiOption, "DASIDAO: Not a multi-option proposal");
        require(proposal.approvedByOwners, "DASIDAO: Proposal not approved by owners yet");
        require(block.timestamp >= proposal.startTime, "DASIDAO: Voting not started");
        require(block.timestamp <= proposal.endTime, "DASIDAO: Voting ended");
        require(!proposal.hasVoted[msg.sender], "DASIDAO: Already voted");
        
        MultiOptionProposal storage multiProposal = multiOptionProposals[proposalId];
        require(optionIndex < multiProposal.options.length, "DASIDAO: Invalid option index");
        
        bool voterIsOwner = isOwnerOrDeployer(msg.sender);
        uint256 burnAmount = 1 ether; // 1 token DASI
        
        // Apenas não-owners precisam ter tokens para votar
        if (!voterIsOwner) {
            uint256 weight = token.balanceOf(msg.sender);
            require(weight > 0, "DASIDAO: Must hold tokens to vote");
            require(weight >= burnAmount, "DASIDAO: Insufficient tokens to vote");
        }
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voterCount += 1;
        multiProposal.optionVotes[optionIndex] += burnAmount;
        multiProposal.optionVoterCount[optionIndex] += 1;
        
        // Queimar 1 token apenas se não for owner/deployer
        if (!voterIsOwner) {
            token.burnFrom(msg.sender, burnAmount);
        }
        
        emit MultiOptionVoteCast(proposalId, msg.sender, optionIndex, burnAmount);
    }
    
    /**
     * @dev Vota em uma proposta
     * @param proposalId ID da proposta
     * @param voteType Tipo de voto (1 = For, 2 = Against, 3 = Abstain)
     * @notice Cada voto consome 1 token DASI (queimado), exceto para owners/deployer
     */
    function vote(uint256 proposalId, Vote voteType) external {
        require(voteType != Vote.None, "DASIDAO: Invalid vote type");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "DASIDAO: Proposal does not exist");
        require(proposal.approvedByOwners, "DASIDAO: Proposal not approved by owners yet");
        require(block.timestamp >= proposal.startTime, "DASIDAO: Voting not started");
        require(block.timestamp <= proposal.endTime, "DASIDAO: Voting ended");
        require(!proposal.hasVoted[msg.sender], "DASIDAO: Already voted");
        
        bool voterIsOwner = isOwnerOrDeployer(msg.sender);
        uint256 burnAmount = 1 ether; // 1 token DASI
        
        // Apenas não-owners precisam ter tokens para votar
        if (!voterIsOwner) {
            uint256 weight = token.balanceOf(msg.sender);
            require(weight > 0, "DASIDAO: Must hold tokens to vote");
            require(weight >= burnAmount, "DASIDAO: Insufficient tokens to vote");
        }
        
        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = voteType;
        proposal.voterCount += 1;
        
        // Calcular peso do voto
        if (voteType == Vote.For) {
            proposal.votesFor += burnAmount;
            proposal.voterCountFor += 1;
        } else if (voteType == Vote.Against) {
            proposal.votesAgainst += burnAmount;
            proposal.voterCountAgainst += 1;
        } else if (voteType == Vote.Abstain) {
            proposal.votesAbstain += burnAmount;
            proposal.voterCountAbstain += 1;
        }
        
        // Queimar 1 token apenas se não for owner/deployer
        if (!voterIsOwner) {
            token.burnFrom(msg.sender, burnAmount);
        }
        
        emit VoteCast(proposalId, msg.sender, voteType, burnAmount);
    }
    
    /**
     * @dev Owners votam para aprovar uma proposta pendente
     * @param proposalId ID da proposta
     * @param approve true para aprovar, false para rejeitar
     * @param approvedUsers Lista de endereços aprovados para receber tokens (quando aprovada)
     */
    function voteOnProposalApproval(
        uint256 proposalId,
        bool approve,
        address[] calldata approvedUsers
    ) external {
        require(isOwnerOrDeployer(msg.sender), "DASIDAO: Only owners can vote on approval");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "DASIDAO: Proposal does not exist");
        require(proposal.needsOwnerApproval, "DASIDAO: Proposal does not need approval");
        require(!proposal.approvedByOwners, "DASIDAO: Proposal already approved");
        require(!proposal.ownerHasVotedOnApproval[msg.sender], "DASIDAO: Already voted on this approval");
        
        proposal.ownerHasVotedOnApproval[msg.sender] = true;
        proposal.ownerApprovalVoterCount += 1;
        
        if (approve) {
            proposal.ownerApprovalVotes += 1;
        }
        
        emit OwnerApprovalVoteCast(proposalId, msg.sender, approve);
        
        // Verificar se atingiu quórum
        uint256 totalOwners = owners.length;
        // Se há apenas 1 owner (deployer), precisa de 1 voto. Se há mais, calcula 50%
        uint256 requiredVotes = totalOwners == 1 ? 1 : (totalOwners * ownerQuorumPercentage) / 100;
        
        // Se atingiu quórum e maioria aprova, aprovar a proposta
        // Para 1 owner: precisa de 1 voto a favor
        // Para múltiplos: precisa de quórum E maioria a favor
        bool quorumReached = proposal.ownerApprovalVotes >= requiredVotes;
        bool majorityApproves = proposal.ownerApprovalVotes > (proposal.ownerApprovalVoterCount - proposal.ownerApprovalVotes);
        
        if (quorumReached && (totalOwners == 1 || majorityApproves)) {
            
            proposal.approvedByOwners = true;
            proposal.startTime = block.timestamp;
            proposal.endTime = block.timestamp + votingPeriod;
            
            // Distribuir tokens automaticamente para todos os usuários aprovados
            // Se não houver usuários aprovados, apenas aprova a proposta sem distribuir tokens
            if (approvedUsers.length > 0) {
                uint256[] memory amounts = new uint256[](approvedUsers.length);
                for (uint256 i = 0; i < approvedUsers.length; i++) {
                    amounts[i] = 1 ether; // 1 token DASI
                }
                
                // Verificar se o contrato DAO tem permissão de minter
                require(token.authorizedMinters(address(this)), "DASIDAO: DAO not authorized to mint");
                
                // Distribuir tokens
                token.batchMint(approvedUsers, amounts);
                
                emit ProposalApprovedByOwners(proposalId, approvedUsers);
            } else {
                // Aprovar proposta mesmo sem usuários para distribuir tokens
                emit ProposalApprovedByOwners(proposalId, new address[](0));
            }
        }
    }
    
    /**
     * @dev Executa uma proposta aprovada
     * @param proposalId ID da proposta
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "DASIDAO: Proposal does not exist");
        require(block.timestamp > proposal.endTime, "DASIDAO: Voting still in progress");
        require(!proposal.executed, "DASIDAO: Proposal already executed");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
        uint256 totalSupply = token.totalSupply();
        uint256 quorum = (totalSupply * quorumPercentage) / 100;
        
        require(totalVotes >= quorum, "DASIDAO: Quorum not reached");
        
        bool passed = proposal.votesFor > proposal.votesAgainst;
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId, passed);
    }
    
    /**
     * @dev Retorna os detalhes básicos de uma proposta
     */
    function getProposalBasic(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool exists,
        bool isMultiOption
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.exists,
            proposal.isMultiOption
        );
    }
    
    /**
     * @dev Retorna os dados de votação de uma proposta
     */
    function getProposalVotes(uint256 proposalId) external view returns (
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        uint256 voterCountFor,
        uint256 voterCountAgainst,
        uint256 voterCountAbstain,
        uint256 voterCount
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.votesAbstain,
            proposal.voterCountFor,
            proposal.voterCountAgainst,
            proposal.voterCountAbstain,
            proposal.voterCount
        );
    }
    
    /**
     * @dev Retorna os detalhes completos de uma proposta (compatibilidade)
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        uint256 voterCountFor,
        uint256 voterCountAgainst,
        uint256 voterCountAbstain,
        uint256 voterCount,
        bool executed,
        bool exists,
        bool isMultiOption
    ) {
        Proposal storage p = proposals[proposalId];
        id = p.id;
        proposer = p.proposer;
        description = p.description;
        startTime = p.startTime;
        endTime = p.endTime;
        votesFor = p.votesFor;
        votesAgainst = p.votesAgainst;
        votesAbstain = p.votesAbstain;
        voterCountFor = p.voterCountFor;
        voterCountAgainst = p.voterCountAgainst;
        voterCountAbstain = p.voterCountAbstain;
        voterCount = p.voterCount;
        executed = p.executed;
        exists = p.exists;
        isMultiOption = p.isMultiOption;
    }
    
    /**
     * @dev Retorna as opções de uma proposta com múltiplas opções
     */
    function getMultiOptionProposal(uint256 proposalId) external view returns (
        string[] memory options,
        uint256[] memory optionVotes,
        uint256[] memory optionVoterCounts
    ) {
        require(proposals[proposalId].isMultiOption, "DASIDAO: Not a multi-option proposal");
        MultiOptionProposal storage multiProposal = multiOptionProposals[proposalId];
        
        uint256 optionsCount = multiProposal.options.length;
        uint256[] memory votes = new uint256[](optionsCount);
        uint256[] memory voterCounts = new uint256[](optionsCount);
        
        for (uint256 i = 0; i < optionsCount; i++) {
            votes[i] = multiProposal.optionVotes[i];
            voterCounts[i] = multiProposal.optionVoterCount[i];
        }
        
        return (multiProposal.options, votes, voterCounts);
    }
    
    /**
     * @dev Verifica se um endereço já votou em uma proposta
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Retorna o voto de um endereço em uma proposta
     */
    function getVote(uint256 proposalId, address voter) external view returns (Vote) {
        return proposals[proposalId].votes[voter];
    }
    
    /**
     * @dev Atualiza a porcentagem de quórum (apenas owner)
     */
    function setQuorumPercentage(uint256 _quorumPercentage) external onlyOwner {
        require(_quorumPercentage > 0 && _quorumPercentage <= 100, "DASIDAO: Invalid quorum percentage");
        quorumPercentage = _quorumPercentage;
    }
    
    /**
     * @dev Atualiza o período de votação (apenas owner)
     */
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        require(_votingPeriod > 0, "DASIDAO: Invalid voting period");
        votingPeriod = _votingPeriod;
    }
    
    /**
     * @dev Retorna o status de uma proposta
     */
    function getProposalStatus(uint256 proposalId) external view returns (string memory) {
        Proposal storage proposal = proposals[proposalId];
        if (!proposal.exists) return "DoesNotExist";
        if (proposal.executed) return "Executed";
        if (proposal.needsOwnerApproval && !proposal.approvedByOwners) return "PendingApproval";
        if (block.timestamp < proposal.startTime) return "Pending";
        if (block.timestamp <= proposal.endTime) return "Active";
        return "Ended";
    }
    
    /**
     * @dev Retorna informações de aprovação de uma proposta
     */
    function getProposalApprovalInfo(uint256 proposalId) external view returns (
        bool needsApproval,
        bool approved,
        uint256 approvalVotes,
        uint256 approvalVoterCount,
        uint256 totalOwners
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.needsOwnerApproval,
            proposal.approvedByOwners,
            proposal.ownerApprovalVotes,
            proposal.ownerApprovalVoterCount,
            owners.length
        );
    }
    
    /**
     * @dev Verifica se um owner já votou na aprovação de uma proposta
     */
    function hasOwnerVotedOnApproval(uint256 proposalId, address owner) external view returns (bool) {
        return proposals[proposalId].ownerHasVotedOnApproval[owner];
    }
    
    /**
     * @dev Atualiza o quórum de aprovação de owners (apenas owner)
     */
    function setOwnerQuorumPercentage(uint256 _ownerQuorumPercentage) external onlyOwner {
        require(_ownerQuorumPercentage > 0 && _ownerQuorumPercentage <= 100, "DASIDAO: Invalid quorum percentage");
        ownerQuorumPercentage = _ownerQuorumPercentage;
    }
}

