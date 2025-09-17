// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AddrResolver} from "../libs/resolver/AddrResolver.sol";
import {ContentHashResolver} from "../libs/resolver/ContentHashResolver.sol";
import {TextResolver} from "../libs/resolver/TextResolver.sol";
import {Multicallable} from "../libs/Multicallable.sol";
import {InterfaceResolver} from "../libs/resolver/InterfaceResolver.sol";
import {PubkeyResolver} from "../libs/resolver/PubkeyResolver.sol";
import {NameResolver} from "../libs/resolver/NameResolver.sol";
import {ABIResolver} from "../libs/resolver/ABIResolver.sol";
import {ExtendedResolver} from "../libs/resolver/ExtendedResolver.sol";

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
