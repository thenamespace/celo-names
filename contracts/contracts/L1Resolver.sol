// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IExtendedResolver} from './resolver/IExtendedResolver.sol';
import {ABIResolver} from './resolver/ABIResolver.sol';
import {AddrResolver} from './resolver/AddrResolver.sol';
import {ContentHashResolver} from './resolver/ContentHashResolver.sol';
import {NameResolver} from './resolver/NameResolver.sol';
import {TextResolver} from './resolver/TextResolver.sol';
import {Multicallable} from './common/Multicallable.sol';
import {InterfaceResolver} from './resolver/InterfaceResolver.sol';
import {IOffchainResolver} from './interfaces/IOffchainResolver.sol';
import {ExtendedResolver} from './resolver/ExtendedResolver.sol';
import {ENSDNSUtils} from './common/ENSDNSUtils.sol';
import {IENSRegistry} from './interfaces/IENSRegistry.sol';
import {INameWrapper} from './interfaces/INameWrapper.sol';

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

/**
 * @title L1Resolver
 * @dev This resolver serves two purposes:
 * 1. Acts as a resolver for storing records for the "parent name" -> celo.eth
 * 2. Uses wildcard resolution for proxying subname resolution requests towards the gateway CCIP server
 */
contract L1Resolver is
  Ownable,
  AddrResolver,
  TextResolver,
  ContentHashResolver,
  ExtendedResolver,
  IOffchainResolver
{
  // ============ State Variables ============

  /// @dev Mapping of signer versions to authorized signers
  mapping(uint32 => mapping(address => bool)) private versionable_signers;

  /// @dev Current version for signer management
  uint32 private signers_version;

  /// @dev Array of CCIP gateway URLs for offchain resolution
  string[] private ccip_gateway_urls;

  /// @dev Root names for this resolver (e.g., _hash("celo.eth") => true)
  /// these will be resolved onchain and the resolver would not try to use CCIP-read
  mapping(bytes32 => bool) root_names;

  /// @dev ENS registry contract
  IENSRegistry immutable ens;

  /// @dev ENS name wrapper contract
  INameWrapper immutable name_wrapper;

  // ============ Events ============

  /// @dev Emitted when signers are updated
  event SignerChanged(address[] signers);

  /// @dev Emitted when offchain gateway URLs are updated
  event OffchainUrlsChanged(string[] urls);

  // ============ Custom Errors ============

  /// @dev Thrown for CCIP offchain lookup requests
  error OffchainLookup(
    address sender,
    string[] urls,
    bytes callData,
    bytes4 callbackFunction,
    bytes extraData
  );

  /// @dev Thrown when signature verification fails
  error InvalidSignature(address signer);

  /// @dev Thrown when signature has expired
  error SignatureExpired(uint64 expires, uint256 currentTime);

  // ============ Constructor ============

  /// @dev Initialize the L1Resolver with signers, gateway URLs, and contracts
  /// @param _signers Array of authorized signer addresses
  /// @param _ccip_gateway_urls Array of CCIP gateway URLs for offchain resolution
  /// @param _root_name Root name for this resolver (e.g., "celo.eth")
  /// @param _name_wrapper Address of the ENS name wrapper contract
  /// @param _ens_registry Address of the ENS registry contract
  constructor(
    address[] memory _signers,
    string[] memory _ccip_gateway_urls,
    string memory _root_name,
    address _name_wrapper,
    address _ens_registry
  ) Ownable(_msgSender()) {
    setSigners(_signers);
    setOffchainGatewayUrls(_ccip_gateway_urls);
    setRootName(_root_name, true);
    name_wrapper = INameWrapper(_name_wrapper);
    ens = IENSRegistry(_ens_registry);
  }

  // ============ Public Functions ============

  /// @dev Main resolution function that handles both onchain and offchain resolution
  /// @param name DNS-encoded name to resolve
  /// @param data ABI encoded data for the underlying resolution function
  /// @return ABI encoded result from the resolution function
  function resolve(
    bytes calldata name,
    bytes calldata data
  ) external view override returns (bytes memory) {
    string memory dns_decoded = ENSDNSUtils.dnsDecode(name);
    if (root_names[_hash(dns_decoded)]) {
      return _resolve(name, data);
    }

    return _resolveOffchain(name, data, ccip_gateway_urls);
  }

  /// @dev Resolves a name using offchain lookup as specified by ENSIP 10
  /// @param name The DNS-encoded name to resolve
  /// @param data The ABI encoded data for the underlying resolution function
  /// @param urls Array of gateway URLs for the offchain lookup
  /// @return The return data, ABI encoded identically to the underlying function
  function _resolveOffchain(
    bytes memory name,
    bytes memory data,
    string[] memory urls
  ) internal view returns (bytes memory) {
    bytes memory callData = abi.encodeWithSelector(
      IExtendedResolver.resolve.selector,
      name,
      data
    );

    revert OffchainLookup(
      address(this),
      urls,
      callData,
      IOffchainResolver.resolveWithProof.selector,
      abi.encode(callData, address(this))
    );
  }

  /// @dev Callback used by CCIP read compatible clients to verify and parse the response
  /// @param response ABI encoded response from the offchain resolver
  /// @param extraData Additional data for verification
  /// @return ABI encoded result from the offchain resolution
  function resolveWithProof(
    bytes calldata response,
    bytes calldata extraData
  ) external view returns (bytes memory) {
    (address signer, bytes memory result) = verify(extraData, response);

    if (!versionable_signers[signers_version][signer]) {
      revert InvalidSignature(signer);
    }

    return result;
  }

  // ============ Internal Functions ============

  /// @dev Generates a hash for signing/verifying CCIP responses
  /// @param target The address the signature is for
  /// @param expires Expiration timestamp for the signature
  /// @param request The original request that was sent
  /// @param result The result field of the response (not including the signature part)
  /// @return The hash to be signed
  function makeSignatureHash(
    address target,
    uint64 expires,
    bytes memory request,
    bytes memory result
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          hex'1900',
          target,
          expires,
          keccak256(request),
          keccak256(result)
        )
      );
  }

  /// @dev Verifies a signed message returned from a callback
  /// @param request The original request that was sent
  /// @param response ABI encoded tuple of (bytes result, uint64 expires, bytes sig)
  /// @return signer The address that signed this message
  /// @return result The result decoded from response
  function verify(
    bytes calldata request,
    bytes calldata response
  ) internal view returns (address, bytes memory) {
    (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(
      response,
      (bytes, uint64, bytes)
    );
    (bytes memory extraData, address sender) = abi.decode(
      request,
      (bytes, address)
    );
    address signer = ECDSA.recover(
      makeSignatureHash(sender, expires, extraData, result),
      sig
    );

    if (expires < block.timestamp) {
      revert SignatureExpired(expires, block.timestamp);
    }

    return (signer, result);
  }

  /// @dev Checks if the caller is authorized to update records for a given node
  /// @param node The ENS node to check authorization for
  /// @return True if the caller is authorized to update records
  function isAuthorisedToUpdateRecords(
    bytes32 node
  ) internal view override returns (bool) {
    return
      ens.owner(node) == _msgSender() ||
      name_wrapper.canModifyName(node, _msgSender());
  }

  function _hash(string memory str) internal pure returns (bytes32) {
    return keccak256(bytes(str));
  }

  // ============ Owner Functions ============

  /// @dev Set authorized signers for offchain resolution
  /// @param _signers Array of signer addresses to authorize
  function setSigners(address[] memory _signers) public onlyOwner {
    signers_version++;
    for (uint i = 0; i < _signers.length; i++) {
      versionable_signers[signers_version][_signers[i]] = true;
    }
    emit SignerChanged(_signers);
  }

  /// @dev Sets root name in mapping
  /// The root names are resolved on current resolver
  /// and do not trigger CCIP-read request
  /// @param _root_name ENS name in string format
  function setRootName(
    string memory _root_name,
    bool enabled
  ) public onlyOwner {
    root_names[_hash(_root_name)] = enabled;
  }

  /// @dev Set CCIP gateway URLs for offchain resolution
  /// @param _ccip_gateway_urls Array of gateway URLs for CCIP requests
  function setOffchainGatewayUrls(
    string[] memory _ccip_gateway_urls
  ) public onlyOwner {
    ccip_gateway_urls = _ccip_gateway_urls;
    emit OffchainUrlsChanged(_ccip_gateway_urls);
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    virtual
    override(AddrResolver, ContentHashResolver, TextResolver, ExtendedResolver)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
