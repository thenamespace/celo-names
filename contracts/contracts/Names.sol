// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Names is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to name
    mapping(uint256 => string) private _names;
    
    // Mapping from name to token ID (for uniqueness)
    mapping(string => bool) private _nameExists;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Events
    event NameMinted(address indexed to, uint256 indexed tokenId, string name);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Mints a new NFT with a unique name
     * @param to The address to mint the NFT to
     * @param name The unique name for the NFT
     */
    function mint(address to, string memory name) public onlyOwner {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(!_nameExists[name], "Name already exists");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _names[tokenId] = name;
        _nameExists[name] = true;
        
        _safeMint(to, tokenId);
        
        emit NameMinted(to, tokenId, name);
    }
    
    /**
     * @dev Returns the name associated with a token ID
     * @param tokenId The token ID to query
     * @return The name associated with the token
     */
    function getName(uint256 tokenId) public view returns (string memory) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return _names[tokenId];
    }
    
    /**
     * @dev Checks if a name is available
     * @param name The name to check
     * @return True if the name is available, false otherwise
     */
    function isNameAvailable(string memory name) public view returns (bool) {
        return !_nameExists[name];
    }
    
    /**
     * @dev Returns the total number of tokens minted
     * @return The total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Sets the base URI for metadata
     * @param baseURI The new base URI
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Returns the base URI for metadata
     * @return The base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
