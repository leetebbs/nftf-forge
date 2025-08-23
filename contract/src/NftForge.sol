// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

contract NftForge is ERC721, ERC721URIStorage, AccessControl, ERC2981 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextTokenId;
    uint16 public _numberOfNftsToMint = 1;

    mapping(address => uint256) private _userNftCount;
    mapping(uint256 => address) private _tokenCreators; // Track creator for each token

    event NumberOfNftsToMintUpdated(uint16 newNumberOfNftsToMint);
    event NFTMinted(address indexed to, uint256 tokenId, string uri);
    event RoyaltiesUpdated(uint96 creatorRoyalty);

    uint96 private _creatorRoyalty;  // in basis points (parts per 10,000)

    constructor(
        address defaultAdmin, 
        address minter, 
        uint96 creatorRoyalty
    ) ERC721("AI Forged NFT", "AIFNFT") {
        require(creatorRoyalty <= 1000, "Creator royalty cannot exceed 10%");
        
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter); // Grant role to ai Wallet address
        _creatorRoyalty = creatorRoyalty;
        
        // Set default royalty to the deployer (msg.sender) instead of address(0)
        // This ensures ERC2981 compliance while individual tokens will have their own royalties
        _setDefaultRoyalty(msg.sender, 0); // 0% default royalty, actual royalties are per-token
    }

    /// @notice Returns creator royalty info for a specific token and sale price
    /// @param tokenId The token ID to get royalties for
    /// @param salePrice The sale price to calculate royalties from
    /// @return recipient The royalty recipient (creator)
    /// @return amount The royalty amount in wei
    function getRoyaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address recipient, uint256 amount) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        recipient = _tokenCreators[tokenId];
        amount = (salePrice * _creatorRoyalty) / _feeDenominator();
        
        return (recipient, amount);
    }

    /// @notice Get the creator of a specific token
    /// @param tokenId The token ID
    /// @return The creator address
    function getTokenCreator(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenCreators[tokenId];
    }

    /// @notice Get current creator royalty rate
    /// @return creatorRoyalty The creator royalty in basis points
    function getRoyaltyRate() external view returns (uint96 creatorRoyalty) {
        return _creatorRoyalty;
    }

    /// @notice Update creator royalty rate (only admin)
    /// @param creatorRoyalty New creator royalty in basis points
    function updateRoyalty(uint96 creatorRoyalty) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(creatorRoyalty <= 1000, "Creator royalty cannot exceed 10%");
        
        _creatorRoyalty = creatorRoyalty;
        
        emit RoyaltiesUpdated(creatorRoyalty);
    }

    /**
     * @dev Mints a new NFT to the specified address.
     * @param to The address to mint the NFT to (becomes the creator).
     * @param uri The URI for the NFT metadata.
     * @return tokenId The ID of the minted token.
     */
    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(to != address(0), "Cannot mint to zero address");
        require(_userNftCount[to] < _numberOfNftsToMint, "User has already minted the maximum number of NFTs");
        
        _userNftCount[to]++;
        uint256 tokenId = _nextTokenId++;
        
        // Store the creator (to address) for this token
        _tokenCreators[tokenId] = to;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Set token-specific royalty for ERC2981 compliance
        _setTokenRoyalty(tokenId, to, _creatorRoyalty);
        
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs to different addresses
     * @param recipients Array of addresses to mint to
     * @param uris Array of URIs for each NFT
     */
    function batchMint(address[] memory recipients, string[] memory uris)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256[] memory tokenIds)
    {
        require(recipients.length == uris.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = safeMint(recipients[i], uris[i]);
        }
        
        return tokenIds;
    }

    /**
     * @dev Sets the number of NFTs an address can mint.
     * @param _newNumberOfNftsToMint The new number of NFTs to mint.
     */
    function setNumberOfNftsToMint(uint16 _newNumberOfNftsToMint) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_newNumberOfNftsToMint > 0, "Number of NFTs to mint must be greater than 0");
        _numberOfNftsToMint = _newNumberOfNftsToMint;
        emit NumberOfNftsToMintUpdated(_newNumberOfNftsToMint);
    }

    /**
     * @dev Get the number of NFTs minted by a user
     * @param user The user address
     * @return The number of NFTs minted
     */
    function getUserNftCount(address user) external view returns (uint256) {
        return _userNftCount[user];
    }

    /**
     * @dev Get the deployer address
     * @return The deployer address
     */
    function getDeployer() external view returns (address) {
        return msg.sender;
    }

    // Override required by Solidity for ERC2981 compatibility
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        public
        view
        override
        returns (address, uint256)
    {
        // This will return the token-specific royalty info set during minting
        return super.royaltyInfo(tokenId, salePrice);
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Override _update to maintain creator tracking on transfers
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address previousOwner = super._update(to, tokenId, auth);
        
        // Creator remains the same regardless of transfers
        // _tokenCreators[tokenId] is set during mint and never changes
        
        return previousOwner;
    }
}