const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DASI Gov DAO", function () {
  let token, dao;
  let owner, addr1, addr2, addr3;
  let tokenAmount = ethers.utils.parseEther("100");

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy Token
    const DASIToken = await ethers.getContractFactory("DASIToken");
    token = await DASIToken.deploy(owner.address);
    await token.deployed();

    // Deploy DAO
    const DASIDAO = await ethers.getContractFactory("DASIDAO");
    dao = await DASIDAO.deploy(
      token.address,
      owner.address,
      50, // 50% quorum
      7 * 24 * 60 * 60 // 7 days
    );
    await dao.deployed();

    // Add DAO as minter
    await token.addMinter(dao.address);

    // Mint tokens to test addresses
    await token.mint(owner.address, tokenAmount);
    await token.mint(addr1.address, tokenAmount);
    await token.mint(addr2.address, tokenAmount);
  });

  describe("Token Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should mint tokens correctly", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(tokenAmount);
    });
  });

  describe("DAO Deployment", function () {
    it("Should set the right token address", async function () {
      expect(await dao.token()).to.equal(token.address);
    });

    it("Should set quorum to 50%", async function () {
      expect(await dao.quorumPercentage()).to.equal(50);
    });
  });

  describe("Proposals", function () {
    it("Should create a proposal", async function () {
      await expect(dao.createProposal("Test Proposal"))
        .to.emit(dao, "ProposalCreated")
        .withArgs(0, owner.address, "Test Proposal", 
          expect.any(Number), expect.any(Number));
    });

    it("Should not allow creating proposal without tokens", async function () {
      await expect(dao.connect(addr3).createProposal("Test"))
        .to.be.revertedWith("DASIDAO: Must hold tokens to create proposal");
    });

    it("Should allow voting on a proposal", async function () {
      await dao.createProposal("Test Proposal");
      
      // Vote For (1)
      await expect(dao.vote(0, 1))
        .to.emit(dao, "VoteCast")
        .withArgs(0, owner.address, 1, expect.any(Number));
    });

    it("Should not allow voting twice", async function () {
      await dao.createProposal("Test Proposal");
      await dao.vote(0, 1);
      
      await expect(dao.vote(0, 2))
        .to.be.revertedWith("DASIDAO: Already voted");
    });
  });
});


