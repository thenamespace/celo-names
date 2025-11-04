// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IVersionableResolver} from "./IVersionableResolver.sol";

abstract contract ResolverBase is ERC165, IVersionableResolver {
    mapping(bytes32 => uint64) public recordVersions;
    // constant used as a version for expired names
    uint64 constant MAX_UINT64 = type(uint64).max;

    function isAuthorizedToUpdateRecords(
        bytes32 node
    ) internal view virtual returns (bool);

    function _isExpired(bytes32 node) internal virtual view returns (bool);

    modifier authorised(bytes32 node) {
        require(isAuthorizedToUpdateRecords(node), "Not authorized");
        _;
    }

    /**
     * Increments the record version associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     */
    function clearRecords(bytes32 node) public virtual authorised(node) {
        _clearRecords(node);
        emit VersionChanged(node, recordVersions[node]);
    }

    function _clearRecords(bytes32 node) internal {
        recordVersions[node]++;
    }

    function expiredNodeVersion() internal pure returns(uint64) {
        return MAX_UINT64;
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual override returns (bool) {
        return
            interfaceID == type(IVersionableResolver).interfaceId ||
            super.supportsInterface(interfaceID);
    }
}
