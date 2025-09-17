// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AddrResolver} from "../common/resolver/AddrResolver.sol";
import {ContentHashResolver} from "../common/resolver/ContentHashResolver.sol";
import {TextResolver} from "../common/resolver/TextResolver.sol";
import {Multicallable} from "../common/Multicallable.sol";
import {InterfaceResolver} from "../common/resolver/InterfaceResolver.sol";
import {PubkeyResolver} from "../common/resolver/PubkeyResolver.sol";
import {NameResolver} from "../common/resolver/NameResolver.sol";
import {ABIResolver} from "../common/resolver/ABIResolver.sol";
import {ExtendedResolver} from "../common/resolver/ExtendedResolver.sol";

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its
 * address.
 */
abstract contract L2Resolver is
    AddrResolver,
    ContentHashResolver,
    TextResolver,
    InterfaceResolver,
    PubkeyResolver,
    NameResolver,
    ABIResolver,
    ExtendedResolver,
    Multicallable
{

    function supportsInterface(
        bytes4 interfaceID
    )
        public
        view
        virtual
        override(
            AddrResolver,
            ContentHashResolver,
            TextResolver,
            ABIResolver,
            InterfaceResolver,
            PubkeyResolver,
            NameResolver,
            Multicallable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceID);
    }
}
