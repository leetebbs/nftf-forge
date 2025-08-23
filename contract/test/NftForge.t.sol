// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test, console} from "forge-std/Test.sol";
import {NftForge} from "../src/NftForge.sol";

contract NftForgeTest is Test {
    NftForge public nftForge;
    
    address public admin = makeAddr("admin");
    address public minter = makeAddr("minter");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public unauthorized = makeAddr("unauthorized");
    
    uint96 public constant CREATOR_ROYALTY = 500; // 5%
    uint96 public constant MAX_ROYALTY = 1000; // 10%
    
    string public constant TEST_URI = "https://example.com/token/1";
    string public constant TEST_URI2 = "https://example.com/token/2";
    
    event NumberOfNftsToMintUpdated(uint16 newNumberOfNftsToMint);
    event NFTMinted(address indexed to, uint256 tokenId, string uri);
    event RoyaltiesUpdated(uint96 creatorRoyalty);
    
    function setUp() public {
        vm.prank(admin);
        nftForge = new NftForge(admin, minter, CREATOR_ROYALTY);
    }
    
    // Constructor Tests
    function testConstructor() public view {
        assertEq(nftForge.name(), "AI Forged NFT");
        assertEq(nftForge.symbol(), "AIFNFT");
        assertTrue(nftForge.hasRole(nftForge.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(nftForge.hasRole(nftForge.MINTER_ROLE(), minter));
        assertEq(nftForge.getRoyaltyRate(), CREATOR_ROYALTY);
        assertEq(nftForge._numberOfNftsToMint(), 1);
    }
    
    function testConstructorRevertsOnHighRoyalty() public {
        vm.expectRevert("Creator royalty cannot exceed 10%");
        new NftForge(admin, minter, 1001); // 10.01%
    }
    
    // Access Control Tests
    function testOnlyMinterCanMint() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        assertEq(tokenId, 0);
        assertEq(nftForge.ownerOf(tokenId), user1);
    }
    
    function testUnauthorizedCannotMint() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        nftForge.safeMint(user1, TEST_URI);
    }
    
    function testOnlyAdminCanSetNumberOfNfts() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit NumberOfNftsToMintUpdated(5);
        nftForge.setNumberOfNftsToMint(5);
        assertEq(nftForge._numberOfNftsToMint(), 5);
    }
    
    function testUnauthorizedCannotSetNumberOfNfts() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        nftForge.setNumberOfNftsToMint(5);
    }
    
    function testOnlyAdminCanUpdateRoyalty() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit RoyaltiesUpdated(750);
        nftForge.updateRoyalty(750);
        assertEq(nftForge.getRoyaltyRate(), 750);
    }
    
    function testUnauthorizedCannotUpdateRoyalty() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        nftForge.updateRoyalty(750);
    }
    
    // Minting Tests
    function testSafeMint() public {
        vm.prank(minter);
        vm.expectEmit(true, true, true, true);
        emit NFTMinted(user1, 0, TEST_URI);
        
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        assertEq(tokenId, 0);
        assertEq(nftForge.ownerOf(tokenId), user1);
        assertEq(nftForge.tokenURI(tokenId), TEST_URI);
        assertEq(nftForge.getUserNftCount(user1), 1);
        assertEq(nftForge.getTokenCreator(tokenId), user1);
    }
    
    function testSafeMintRevertsOnZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert("Cannot mint to zero address");
        nftForge.safeMint(address(0), TEST_URI);
    }
    
    function testSafeMintRevertsWhenLimitExceeded() public {
        vm.prank(minter);
        nftForge.safeMint(user1, TEST_URI);
        
        vm.prank(minter);
        vm.expectRevert("User has already minted the maximum number of NFTs");
        nftForge.safeMint(user1, TEST_URI2);
    }
    
    function testSafeMintWithIncreasedLimit() public {
        // Increase limit to 2
        vm.prank(admin);
        nftForge.setNumberOfNftsToMint(2);
        
        vm.prank(minter);
        uint256 tokenId1 = nftForge.safeMint(user1, TEST_URI);
        
        vm.prank(minter);
        uint256 tokenId2 = nftForge.safeMint(user1, TEST_URI2);
        
        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(nftForge.getUserNftCount(user1), 2);
        
        // Third mint should fail
        vm.prank(minter);
        vm.expectRevert("User has already minted the maximum number of NFTs");
        nftForge.safeMint(user1, "https://example.com/token/3");
    }
    
    function testMultipleUsersMinting() public {
        vm.prank(minter);
        uint256 tokenId1 = nftForge.safeMint(user1, TEST_URI);
        
        vm.prank(minter);
        uint256 tokenId2 = nftForge.safeMint(user2, TEST_URI2);
        
        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(nftForge.ownerOf(tokenId1), user1);
        assertEq(nftForge.ownerOf(tokenId2), user2);
        assertEq(nftForge.getUserNftCount(user1), 1);
        assertEq(nftForge.getUserNftCount(user2), 1);
    }
    
    // Batch Minting Tests
    function testBatchMint() public {
        address[] memory recipients = new address[](2);
        recipients[0] = user1;
        recipients[1] = user2;
        
        string[] memory uris = new string[](2);
        uris[0] = TEST_URI;
        uris[1] = TEST_URI2;
        
        vm.prank(minter);
        uint256[] memory tokenIds = nftForge.batchMint(recipients, uris);
        
        assertEq(tokenIds.length, 2);
        assertEq(tokenIds[0], 0);
        assertEq(tokenIds[1], 1);
        assertEq(nftForge.ownerOf(tokenIds[0]), user1);
        assertEq(nftForge.ownerOf(tokenIds[1]), user2);
        assertEq(nftForge.tokenURI(tokenIds[0]), TEST_URI);
        assertEq(nftForge.tokenURI(tokenIds[1]), TEST_URI2);
    }
    
    function testBatchMintRevertsOnArrayLengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = user1;
        recipients[1] = user2;
        
        string[] memory uris = new string[](1);
        uris[0] = TEST_URI;
        
        vm.prank(minter);
        vm.expectRevert("Arrays length mismatch");
        nftForge.batchMint(recipients, uris);
    }
    
    function testBatchMintRevertsOnEmptyArrays() public {
        address[] memory recipients = new address[](0);
        string[] memory uris = new string[](0);
        
        vm.prank(minter);
        vm.expectRevert("Empty arrays");
        nftForge.batchMint(recipients, uris);
    }
    
    function testBatchMintUnauthorized() public {
        address[] memory recipients = new address[](1);
        recipients[0] = user1;
        
        string[] memory uris = new string[](1);
        uris[0] = TEST_URI;
        
        vm.prank(unauthorized);
        vm.expectRevert();
        nftForge.batchMint(recipients, uris);
    }
    
    // Royalty Tests
    function testRoyaltyInfo() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        uint256 salePrice = 1 ether;
        (address recipient, uint256 amount) = nftForge.royaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, user1);
        assertEq(amount, (salePrice * CREATOR_ROYALTY) / 10000); // 5% of 1 ether
    }
    
    function testGetRoyaltyInfo() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        uint256 salePrice = 2 ether;
        (address recipient, uint256 amount) = nftForge.getRoyaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, user1);
        assertEq(amount, (salePrice * CREATOR_ROYALTY) / 10000); // 5% of 2 ether
    }
    
    function testGetRoyaltyInfoRevertsOnNonexistentToken() public {
        vm.expectRevert("Token does not exist");
        nftForge.getRoyaltyInfo(999, 1 ether);
    }
    
    function testGetTokenCreator() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        assertEq(nftForge.getTokenCreator(tokenId), user1);
    }
    
    function testGetTokenCreatorRevertsOnNonexistentToken() public {
        vm.expectRevert("Token does not exist");
        nftForge.getTokenCreator(999);
    }
    
    function testUpdateRoyalty() public {
        uint96 newRoyalty = 750; // 7.5%
        
        vm.prank(admin);
        nftForge.updateRoyalty(newRoyalty);
        
        assertEq(nftForge.getRoyaltyRate(), newRoyalty);
        
        // Test that new tokens get the updated royalty
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        (address recipient, uint256 amount) = nftForge.royaltyInfo(tokenId, 1 ether);
        assertEq(recipient, user1);
        assertEq(amount, (1 ether * newRoyalty) / 10000);
    }
    
    function testUpdateRoyaltyRevertsOnHighValue() public {
        vm.prank(admin);
        vm.expectRevert("Creator royalty cannot exceed 10%");
        nftForge.updateRoyalty(1001); // 10.01%
    }
    
    // Admin Function Tests
    function testSetNumberOfNftsToMintRevertsOnZero() public {
        vm.prank(admin);
        vm.expectRevert("Number of NFTs to mint must be greater than 0");
        nftForge.setNumberOfNftsToMint(0);
    }
    
    // View Function Tests
    function testGetUserNftCount() public {
        assertEq(nftForge.getUserNftCount(user1), 0);
        
        vm.prank(minter);
        nftForge.safeMint(user1, TEST_URI);
        
        assertEq(nftForge.getUserNftCount(user1), 1);
    }
    
    function testGetRoyaltyRate() public view {
        assertEq(nftForge.getRoyaltyRate(), CREATOR_ROYALTY);
    }
    
    // Transfer Tests (Creator should remain the same)
    function testCreatorRemainsAfterTransfer() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        // Transfer token from user1 to user2
        vm.prank(user1);
        nftForge.transferFrom(user1, user2, tokenId);
        
        // Owner should change, but creator should remain the same
        assertEq(nftForge.ownerOf(tokenId), user2);
        assertEq(nftForge.getTokenCreator(tokenId), user1); // Creator should still be user1
        
        // Royalties should still go to the original creator
        (address recipient,) = nftForge.royaltyInfo(tokenId, 1 ether);
        assertEq(recipient, user1);
    }
    
    // Interface Support Tests
    function testSupportsInterface() public view {
        // ERC721
        assertTrue(nftForge.supportsInterface(0x80ac58cd));
        // ERC2981
        assertTrue(nftForge.supportsInterface(0x2a55205a));
        // AccessControl
        assertTrue(nftForge.supportsInterface(0x7965db0b));
    }
    
    // Edge Cases
    function testMintingSequentialTokenIds() public {
        vm.prank(admin);
        nftForge.setNumberOfNftsToMint(3);
        
        vm.prank(minter);
        uint256 tokenId1 = nftForge.safeMint(user1, TEST_URI);
        
        vm.prank(minter);
        uint256 tokenId2 = nftForge.safeMint(user1, TEST_URI2);
        
        vm.prank(minter);
        uint256 tokenId3 = nftForge.safeMint(user2, "https://example.com/token/3");
        
        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);
    }
    
    function testRoyaltyCalculationPrecision() public {
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        // Test with odd sale price to check rounding
        uint256 salePrice = 999 wei;
        (address recipient, uint256 amount) = nftForge.royaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, user1);
        // 999 * 500 / 10000 = 49.95, should round down to 49
        assertEq(amount, 49);
    }
    
    function testZeroRoyalty() public {
        vm.prank(admin);
        nftForge.updateRoyalty(0);
        
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        (, uint256 amount) = nftForge.royaltyInfo(tokenId, 1 ether);
        assertEq(amount, 0);
    }
    
    function testMaxRoyalty() public {
        vm.prank(admin);
        nftForge.updateRoyalty(MAX_ROYALTY); // 10%
        
        vm.prank(minter);
        uint256 tokenId = nftForge.safeMint(user1, TEST_URI);
        
        (, uint256 amount) = nftForge.royaltyInfo(tokenId, 1 ether);
        assertEq(amount, 0.1 ether); // 10% of 1 ether
    }
}