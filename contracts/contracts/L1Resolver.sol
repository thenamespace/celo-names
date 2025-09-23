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
import {ENS} from '@ensdomains/ens-contracts/contracts/registry/ENS.sol';
import {INameWrapper} from '@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IOffchainResolver} from './interfaces/IOffchainResolver.sol';
import {ExtendedResolver} from "./resolver/ExtendedResolver.sol";
import {ENSDNSUtils} from "./common/ENSDNSUtils.sol";

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

// This resolver serves two pupropses
// 1. It will act as a resolver for storing records for "parent name" -> celo.eth
// 2. It will use wildcard resolution for proxying subname resolution requests
// towards the gateway ccip server
contract L1Resolver is
  Ownable,
  AddrResolver,
  TextResolver,
  ContentHashResolver,
  ExtendedResolver,
  IOffchainResolver
{
  mapping(uint32 => mapping(address => bool)) private versionable_signers;
  uint32 private signers_version;
  string[] private ccip_gateway_urls;
  string private root_name;

  event SignerChanged(address[] signers);
  event OffchainUrlsChanged(string[] urls);

  ENS immutable ens = ENS(address(0));

  error OffchainLookup(
    address sender,
    string[] urls,
    bytes callData,
    bytes4 callbackFunction,
    bytes extraData
  );

  constructor(
    address[] memory _signers,
    string[] memory _ccip_gateway_urls,
    string memory _root_name
  ) Ownable(_msgSender()) {
    setSigners(_signers);
    setOffchainGatewayUrls(_ccip_gateway_urls);
    root_name = _root_name;
  }

  function resolve(
    bytes calldata name,
    bytes calldata data
  ) external view override returns (bytes memory) {

    string memory dns_decoded = ENSDNSUtils.dnsDecode(name);
    if (dns_decoded == root_name) {
      return _resolve(name, data);
    }

    return _resolveOffchain(name, data, ccip_gateway_urls);
  }

  // Resolves a name, as specified by ENSIP 10.
  // @param name The DNS-encoded name to resolve.
  // @param data The ABI encoded data for the underlying resolution function (Eg, addr(bytes32), text(bytes32,string), etc).
  // @return The return data, ABI encoded identically to the underlying function.
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

  /**
   * Callback used by CCIP read compatible clients to verify and parse the response.
   */
  function resolveWithProof(
    bytes calldata response,
    bytes calldata extraData
  ) external view returns (bytes memory) {
    (address signer, bytes memory result) = verify(extraData, response);

    require(
      versionable_signers[signers_version][signer],
      'Signature: Invalid signature'
    );

    return result;
  }

  /**
   * @dev Generates a hash for signing/verifying.
   * @param target: The address the signature is for.
   * @param request: The original request that was sent.
   * @param result: The `result` field of the response (not including the signature part).
   */
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

  /**
   * @dev Verifies a signed message returned from a callback.
   * @param request: The original request that was sent.
   * @param response: An ABI encoded tuple of `(bytes result, uint64 expires, bytes sig)`, where `result` is the data to return
   *        to the caller, and `sig` is the (r,s,v) encoded message signature.
   * @return signer: The address that signed this message.
   * @return result: The `result` decoded from `response`.
   */
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
    require(expires >= block.timestamp, 'SignatureVerifier: Signature expired');
    return (signer, result);
  }

  function isAuthorisedToUpdateRecords(
    bytes32 node
  ) internal view override returns (bool) {
    return true;
  }

  function setSigners(address[] memory _signers) public onlyOwner {
    signers_version++;
    for (uint i = 0; i < _signers.length; i++) {
      versionable_signers[signers_version][_signers[i]] = true;
    }
    emit SignerChanged(_signers);
  }

  function setOffchainGatewayUrls(
    string[] memory _ccip_gateway_urls
  ) public onlyOwner {
    ccip_gateway_urls = _ccip_gateway_urls;
    emit OffchainUrlsChanged(_ccip_gateway_urls);
  }

  /**
   * @dev Returns true if this contract implements the interface defined by `interfaceId`
   * @param interfaceId The interface identifier to check
   * @return supported True if the interface is supported
   */
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
