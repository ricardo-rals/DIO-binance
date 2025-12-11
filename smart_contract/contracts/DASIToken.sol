// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DASIToken
 * @dev Token ERC-20 para governança da DAO DASI Gov
 * 1 token = 1 voto
 */
contract DASIToken is ERC20, Ownable {
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedBurners; // Endereços autorizados a queimar tokens
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BurnerAdded(address indexed burner);
    event BurnerRemoved(address indexed burner);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor(address initialOwner) ERC20("DASI Governance Token", "DASI") Ownable(initialOwner) {
        // Inicialmente, o owner pode mintear tokens
        authorizedMinters[initialOwner] = true;
    }
    
    /**
     * @dev Adiciona um endereço autorizado para queimar tokens
     */
    function addBurner(address burner) external onlyOwner {
        authorizedBurners[burner] = true;
        emit BurnerAdded(burner);
    }
    
    /**
     * @dev Remove autorização de um endereço para queimar tokens
     */
    function removeBurner(address burner) external onlyOwner {
        authorizedBurners[burner] = false;
        emit BurnerRemoved(burner);
    }
    
    /**
     * @dev Queima tokens de um endereço (apenas burners autorizados)
     * @param from Endereço de onde os tokens serão queimados
     * @param amount Quantidade de tokens a serem queimados
     */
    function burnFrom(address from, uint256 amount) external {
        require(authorizedBurners[msg.sender], "DASIToken: Not authorized to burn");
        require(balanceOf(from) >= amount, "DASIToken: Insufficient balance to burn");
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    /**
     * @dev Queima tokens do próprio endereço
     * @param amount Quantidade de tokens a serem queimados
     */
    function burn(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "DASIToken: Insufficient balance to burn");
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Adiciona um endereço autorizado para mintear tokens
     */
    function addMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove autorização de um endereço para mintear tokens
     */
    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Minteia tokens para um endereço (apenas minters autorizados)
     * @param to Endereço que receberá os tokens
     * @param amount Quantidade de tokens a serem minteados
     */
    function mint(address to, uint256 amount) external {
        require(authorizedMinters[msg.sender], "DASIToken: Not authorized to mint");
        _mint(to, amount);
    }
    
    /**
     * @dev Minteia tokens para múltiplos endereços
     * @param recipients Array de endereços que receberão os tokens
     * @param amounts Array de quantidades (deve ter o mesmo tamanho de recipients)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(authorizedMinters[msg.sender], "DASIToken: Not authorized to mint");
        require(recipients.length == amounts.length, "DASIToken: Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}


