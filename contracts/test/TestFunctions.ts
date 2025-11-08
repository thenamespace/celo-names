/**
 * TestFunctions - Comprehensive list of all public functions for each contract
 * 
 * This file documents all public functions (including view functions) for each contract
 * in the codebase. Functions are organized by contract name.
 */

/**
 * L1Resolver
 * Public functions:
 * - resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory)
 * - resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory)
 * - setSigners(address[] memory _signers) public onlyOwner
 * - setRootName(string memory _root_name, bool enabled) public onlyOwner
 * - setOffchainGatewayUrls(string[] memory _ccip_gateway_urls) public onlyOwner
 * - supportsInterface(bytes4 interfaceId) public view virtual override returns (bool)
 * 
 * Inherited from AddrResolver:
 * - setAddr(bytes32 node, address a) external virtual authorised(node)
 * - setAddr(bytes32 node, uint256 coinType, bytes memory a) public virtual authorised(node)
 * - addr(bytes32 node) public view virtual override returns (address payable)
 * - addr(bytes32 node, uint256 coinType) public view virtual override returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 * 
 * Inherited from TextResolver:
 * - setText(bytes32 node, string calldata key, string calldata value) external virtual authorised(node)
 * - text(bytes32 node, string calldata key) external view virtual override returns (string memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 * 
 * Inherited from ContentHashResolver:
 * - setContenthash(bytes32 node, bytes calldata hash) external virtual authorised(node)
 * - contenthash(bytes32 node) external view virtual override returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 * 
 * Inherited from ExtendedResolver:
 * - resolve(bytes calldata name, bytes calldata data) external view virtual returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * L2Registrar
 * Public functions:
 * - registerERC20(string calldata label, uint64 durationInYears, address owner, bytes[] calldata resolverData, address paymentToken, ERC20Permit calldata permit) public whenNotPaused
 * - register(string calldata label, uint64 durationInYears, address owner, bytes[] calldata resolverData) external payable whenNotPaused
 * - renew(string calldata label, uint64 durationInYears) external payable
 * - renewERC20(string calldata label, uint64 durationInYears, address paymentToken, ERC20Permit calldata permit) external
 * - rentPrice(string calldata label, uint64 durationInYears) public view returns (uint256)
 * - rentPrice(string calldata label, uint64 durationInYears, address paymentToken) public view returns (uint256)
 * - available(string calldata label) external view returns (bool)
 * - pause() external onlyOwner
 * - unpause() external onlyOwner
 * 
 * Inherited from RegistrarTreasury:
 * - setTreasury(address __treasury) external onlyOwner
 * - setEnsTreasury(address __ensTreasury) external onlyOwner
 * - setEnsTreasuryFeePercent(uint16 _feePercent) external onlyOwner
 * 
 * Inherited from RegistrarRules:
 * - configureRules(RegistrarRulesConfig memory _rules, bool _clearPrevious) external onlyOwner
 * - setLabelPrices(uint256[] calldata lengths, uint256[] calldata prices, bool clearPrevious) external onlyOwner
 * - setLabelLengthLimits(uint256 minLength, uint256 maxLength) external onlyOwner
 * - setBasePrice(uint256 _basePrice) external onlyOwner
 * - minLabelLength() public view returns (uint256)
 * - maxLabelLength() public view returns (uint256)
 * - basePrice() public view returns (uint256)
 * 
 * Inherited from RegistrarControl:
 * - setRegistrar(address registrar, bool enabled) public onlyOwner
 * - isRegistrar(address account) public view returns (bool)
 * - registrars(address) public view returns (bool)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 * 
 * Inherited from Pausable:
 * - paused() public view returns (bool)
 */

/**
 * L2Registry
 * Public functions:
 * - createSubnode(string calldata label, uint64 expiry, address owner, bytes[] calldata resolverData) external onlyRegistrar
 * - createSubnode(string calldata label, bytes32 parentNode, uint64 expiry, address owner, bytes[] calldata resolverData) external onlyRegistrar
 * - setExpiry(bytes32 node, uint256 expiry) external onlyRegistrar
 * - revoke(bytes32 node) external onlyOwner
 * - nameLookup(bytes32 node) external view returns (string memory)
 * - nodehash(string calldata label) public view returns (bytes32)
 * - nodehash(string calldata label, bytes32 parentNode) public pure returns (bytes32)
 * - ownerOf(uint256 tokenId) public view override(ERC721, IL2Registry) returns (address)
 * - transferFrom(address from, address to, uint256 tokenId) public override
 * - supportsInterface(bytes4 interfaceId) public view override(ERC721, L2Resolver) returns (bool)
 * - tokenURI(uint256 tokenId) public view override returns (string memory)
 * - expiries(bytes32) public mapping returns (uint256)
 * - rootNode public immutable returns (bytes32)
 * - metadataUri public returns (string memory)
 * - totalSupply public returns (uint256)
 * 
 * Inherited from L2Resolver:
 * - supportsInterface(bytes4 interfaceId) public view virtual override returns (bool)
 * 
 * Inherited from AddrResolver:
 * - setAddr(bytes32 node, address a) external virtual authorised(node)
 * - setAddr(bytes32 node, uint256 coinType, bytes memory a) public virtual authorised(node)
 * - addr(bytes32 node) public view virtual override returns (address payable)
 * - addr(bytes32 node, uint256 coinType) public view virtual override returns (bytes memory)
 * 
 * Inherited from TextResolver:
 * - setText(bytes32 node, string calldata key, string calldata value) external virtual authorised(node)
 * - text(bytes32 node, string calldata key) external view virtual override returns (string memory)
 * 
 * Inherited from ContentHashResolver:
 * - setContenthash(bytes32 node, bytes calldata hash) external virtual authorised(node)
 * - contenthash(bytes32 node) external view virtual override returns (bytes memory)
 * 
 * Inherited from NameResolver:
 * - setName(bytes32 node, string calldata newName) external virtual authorised(node)
 * - name(bytes32 node) external view virtual override returns (string memory)
 * 
 * Inherited from PubkeyResolver:
 * - setPubkey(bytes32 node, bytes32 x, bytes32 y) external virtual authorised(node)
 * - pubkey(bytes32 node) external view virtual override returns (bytes32 x, bytes32 y)
 * 
 * Inherited from ABIResolver:
 * - setABI(bytes32 node, uint256 contentType, bytes calldata data) external virtual authorised(node)
 * - ABI(bytes32 node, uint256 contentTypes) external view virtual override returns (uint256, bytes memory)
 * 
 * Inherited from InterfaceResolver:
 * - setInterface(bytes32 node, bytes4 interfaceID, address implementer) external virtual authorised(node)
 * - interfaceImplementer(bytes32 node, bytes4 interfaceID) external view virtual override returns (address)
 * 
 * Inherited from ExtendedResolver:
 * - resolve(bytes calldata name, bytes calldata data) external view virtual returns (bytes memory)
 * 
 * Inherited from Multicallable:
 * - multicall(bytes[] calldata data) public override returns (bytes[] memory results)
 * - multicallWithNodeCheck(bytes32 nodehash, bytes[] calldata data) external returns (bytes[] memory results)
 * 
 * Inherited from ERC721:
 * - balanceOf(address owner) public view returns (uint256)
 * - ownerOf(uint256 tokenId) public view returns (address)
 * - safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public
 * - safeTransferFrom(address from, address to, uint256 tokenId) public
 * - transferFrom(address from, address to, uint256 tokenId) public
 * - approve(address to, uint256 tokenId) public
 * - setApprovalForAll(address operator, bool approved) public
 * - getApproved(uint256 tokenId) public view returns (address)
 * - isApprovedForAll(address owner, address operator) public view returns (bool)
 * 
 * Inherited from RegistrarControl:
 * - setRegistrar(address registrar, bool enabled) public onlyOwner
 * - isRegistrar(address account) public view returns (bool)
 * - registrars(address) public view returns (bool)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * L2Resolver
 * Public functions:
 * - supportsInterface(bytes4 interfaceId) public view virtual override returns (bool)
 * 
 * Inherited from AddrResolver:
 * - setAddr(bytes32 node, address a) external virtual authorised(node)
 * - setAddr(bytes32 node, uint256 coinType, bytes memory a) public virtual authorised(node)
 * - addr(bytes32 node) public view virtual override returns (address payable)
 * - addr(bytes32 node, uint256 coinType) public view virtual override returns (bytes memory)
 * 
 * Inherited from TextResolver:
 * - setText(bytes32 node, string calldata key, string calldata value) external virtual authorised(node)
 * - text(bytes32 node, string calldata key) external view virtual override returns (string memory)
 * 
 * Inherited from ContentHashResolver:
 * - setContenthash(bytes32 node, bytes calldata hash) external virtual authorised(node)
 * - contenthash(bytes32 node) external view virtual override returns (bytes memory)
 * 
 * Inherited from NameResolver:
 * - setName(bytes32 node, string calldata newName) external virtual authorised(node)
 * - name(bytes32 node) external view virtual override returns (string memory)
 * 
 * Inherited from PubkeyResolver:
 * - setPubkey(bytes32 node, bytes32 x, bytes32 y) external virtual authorised(node)
 * - pubkey(bytes32 node) external view virtual override returns (bytes32 x, bytes32 y)
 * 
 * Inherited from ABIResolver:
 * - setABI(bytes32 node, uint256 contentType, bytes calldata data) external virtual authorised(node)
 * - ABI(bytes32 node, uint256 contentTypes) external view virtual override returns (uint256, bytes memory)
 * 
 * Inherited from InterfaceResolver:
 * - setInterface(bytes32 node, bytes4 interfaceID, address implementer) external virtual authorised(node)
 * - interfaceImplementer(bytes32 node, bytes4 interfaceID) external view virtual override returns (address)
 * 
 * Inherited from ExtendedResolver:
 * - resolve(bytes calldata name, bytes calldata data) external view virtual returns (bytes memory)
 * 
 * Inherited from Multicallable:
 * - multicall(bytes[] calldata data) public override returns (bytes[] memory results)
 * - multicallWithNodeCheck(bytes32 nodehash, bytes[] calldata data) external returns (bytes[] memory results)
 */

/**
 * L2SelfRegistrar
 * Public functions:
 * - claim(string calldata label, address owner, bytes[] calldata resolverData) external
 * - getConfigId(bytes32 destinationChainId, bytes32 userIdentifier, bytes memory userDefinedData) public view override returns (bytes32)
 * - setConfigId(bytes32 configId) external onlyOwner
 * - setMaximumClaim(uint64 _maximumClaim) external onlyOwner
 * 
 * Inherited from SelfVerificationRoot:
 * - onVerificationSuccess(bytes memory output, bytes memory userData) external
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * RegistrarControl
 * Public functions:
 * - setRegistrar(address registrar, bool enabled) public onlyOwner
 * - isRegistrar(address account) public view returns (bool)
 * - registrars(address) public view returns (bool)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * RegistrarStorage
 * Public functions:
 * - setVerificationId(address user, uint256 verificationId) external onlyRegistrar
 * - claim(address user, bytes32 namehash) external onlyRegistrar
 * - isVerified(address user) external view returns (bool)
 * - isBlacklisted(string calldata label) external view returns (bool)
 * - isWhitelisted(address user) external view returns (bool)
 * - setWhitelist(address[] calldata users, bool enabled, bool clearEntries) external onlyOwner
 * - setWhitelistEnabled(bool enabled) external onlyOwner
 * - setBlacklist(bytes32[] calldata labelhashes, bool enabled, bool clearEntries) external onlyOwner
 * - deleteVerification(address user, uint256 verificationId) external onlyOwner
 * - verificationIds(address) public mapping returns (uint256)
 * - claimedVerifications(uint256) public mapping returns (bool)
 * - claimed(address) public mapping returns (uint256)
 * - names(bytes32) public mapping returns (bool)
 * - whitelistEnabled() public view returns (bool)
 * 
 * Inherited from RegistrarControl:
 * - setRegistrar(address registrar, bool enabled) public onlyOwner
 * - isRegistrar(address account) public view returns (bool)
 * - registrars(address) public view returns (bool)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * NativePayments
 * Public functions:
 * (Abstract contract - no direct public functions, only internal functions)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * RegistrarRules
 * Public functions:
 * - configureRules(RegistrarRulesConfig memory _rules, bool _clearPrevious) external onlyOwner
 * - setLabelPrices(uint256[] calldata lengths, uint256[] calldata prices, bool clearPrevious) external onlyOwner
 * - setLabelLengthLimits(uint256 minLength, uint256 maxLength) external onlyOwner
 * - setBasePrice(uint256 _basePrice) external onlyOwner
 * - minLabelLength() public view returns (uint256)
 * - maxLabelLength() public view returns (uint256)
 * - basePrice() public view returns (uint256)
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * RegistrarTreasury
 * Public functions:
 * - setTreasury(address __treasury) external onlyOwner
 * - setEnsTreasury(address __ensTreasury) external onlyOwner
 * - setEnsTreasuryFeePercent(uint16 _feePercent) external onlyOwner
 * 
 * Inherited from NativePayments:
 * (No direct public functions)
 * 
 * Inherited from StableERC20Payments:
 * - modifyApprovedTokens(address[] calldata tokens, bool enabled, bool clearPreviousEntries) public onlyOwner
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * StableERC20Payments
 * Public functions:
 * - modifyApprovedTokens(address[] calldata tokens, bool enabled, bool clearPreviousEntries) public onlyOwner
 * 
 * Inherited from Ownable:
 * - owner() public view returns (address)
 * - transferOwnership(address newOwner) public onlyOwner
 * - renounceOwnership() public onlyOwner
 */

/**
 * AddrResolver
 * Public functions:
 * - setAddr(bytes32 node, address a) external virtual authorised(node)
 * - setAddr(bytes32 node, uint256 coinType, bytes memory a) public virtual authorised(node)
 * - addr(bytes32 node) public view virtual override returns (address payable)
 * - addr(bytes32 node, uint256 coinType) public view virtual override returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * TextResolver
 * Public functions:
 * - setText(bytes32 node, string calldata key, string calldata value) external virtual authorised(node)
 * - text(bytes32 node, string calldata key) external view virtual override returns (string memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * ContentHashResolver
 * Public functions:
 * - setContenthash(bytes32 node, bytes calldata hash) external virtual authorised(node)
 * - contenthash(bytes32 node) external view virtual override returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * NameResolver
 * Public functions:
 * - setName(bytes32 node, string calldata newName) external virtual authorised(node)
 * - name(bytes32 node) external view virtual override returns (string memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * PubkeyResolver
 * Public functions:
 * - setPubkey(bytes32 node, bytes32 x, bytes32 y) external virtual authorised(node)
 * - pubkey(bytes32 node) external view virtual override returns (bytes32 x, bytes32 y)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * ABIResolver
 * Public functions:
 * - setABI(bytes32 node, uint256 contentType, bytes calldata data) external virtual authorised(node)
 * - ABI(bytes32 node, uint256 contentTypes) external view virtual override returns (uint256, bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * InterfaceResolver
 * Public functions:
 * - setInterface(bytes32 node, bytes4 interfaceID, address implementer) external virtual authorised(node)
 * - interfaceImplementer(bytes32 node, bytes4 interfaceID) external view virtual override returns (address)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * ExtendedResolver
 * Public functions:
 * - resolve(bytes calldata name, bytes calldata data) external view virtual returns (bytes memory)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

/**
 * Multicallable
 * Public functions:
 * - multicall(bytes[] calldata data) public override returns (bytes[] memory results)
 * - multicallWithNodeCheck(bytes32 nodehash, bytes[] calldata data) external returns (bytes[] memory results)
 * - supportsInterface(bytes4 interfaceID) public view virtual override returns (bool)
 */

