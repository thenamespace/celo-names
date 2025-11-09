// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SelfVerificationRoot} from '@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol';
import {ISelfVerificationRoot} from '@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol';
import {SelfStructs} from '@selfxyz/contracts/contracts/libraries/SelfStructs.sol';
import {SelfUtils} from '@selfxyz/contracts/contracts/libraries/SelfUtils.sol';
import {IIdentityVerificationHubV2} from '@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol';
import {IL2Registry} from './interfaces/IL2Registry.sol';
import {IRegistrarStorage} from './interfaces/IRegistrarStorage.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from './common/StringUtils.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';

/// @title L2 Self Registrar
///
/// @notice Registrar that allows Self verified users to claim subdomains.
///         This contract integrates with Self protocol for identity verification and manages subdomain
///         registration through the L2Registry. Users must complete identity verification before
///         claiming subdomains, with configurable limits and validation rules.
///
/// @author artii.eth (arti@namespace.ninja)
contract L2SelfRegistrar is SelfVerificationRoot, Ownable, ERC721Holder {
    using StringUtils for string;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTANTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Seconds in one year for subdomain expiry calculation.
    uint64 constant ONE_YEAR_SECONDS = 31_536_000;

    /// @notice Minimum subname length.
    uint64 constant MIN_SUBNAME_LENGTH = 3;

    /// @notice Maximum subname length.
    uint64 constant MAX_SUBNAME_LENGTH = 64;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when user has reached maximum allowed claims.
    error MaximumNamesClaimed();

    /// @notice Thrown when label does not meet minimum length requirements.
    error InvalidLabel();

    /// @notice Thrown when a non-verified user tries to claim subnames.
    error NotSelfVerified(address user);

    /// @notice Thrown when an already verified user attempts verification again.
    error VerificationClaimed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a subdomain is successfully claimed.
    ///
    /// @param label The subdomain label that was claimed.
    /// @param node The namehash of the claimed subdomain.
    /// @param owner The address that owns the claimed subdomain.
    event NameClaimed(string label, bytes32 node, address owner);

    /// @notice Emitted when user completed a verification.
    ///
    /// @param user The address of the user who completed verification.
    /// @param verificationId The verification ID from Self protocol.
    /// @param timestamp The timestamp when verification was completed.
    event VerificationCompleted(
        address user,
        uint256 verificationId,
        uint256 timestamp
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Maximum number of names a single user can claim (default: 1 free name per user).
    uint64 private maximumClaim = 1;

    /// @notice Self protocol verification configuration ID.
    bytes32 verificationConfigId;

    /// @notice The registry contract for subdomain management.
    IL2Registry immutable registry;

    /// @notice The storage contract for verification information.
    IRegistrarStorage immutable registrarStorage;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice L2 Self Registrar constructor used to establish the necessary contract configuration.
    ///
    /// @param identityVerificationHubV2Address The address of the Self Identity Verification Hub V2.
    /// @param scopeSeed The scope seed for Self protocol verification.
    /// @param _registry The address of the L2Registry contract.
    /// @param _registrarStorage The address of the RegistrarStorage contract.
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed,
        address _registry,
        address _registrarStorage
    )
        SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed)
        Ownable(_msgSender())
    {
        _initSelfProtocol(identityVerificationHubV2Address);
        registry = IL2Registry(_registry);
        registrarStorage = IRegistrarStorage(_registrarStorage);
    }

    /// @notice Claims a subdomain after successful identity verification.
    ///
    /// @dev Allows verified users to claim a free subdomain. The subdomain is registered for
    ///      one year and minted as an NFT to the specified owner. Optionally executes resolver
    ///      function calls during registration.
    ///
    /// @param label The subdomain label to claim.
    /// @param owner The address that will own the subdomain.
    /// @param resolverData Optional array of resolver function calls to execute.
    ///
    /// Requirements:
    /// - Label must be valid length (3-64 characters).
    /// - User must be verified via Self protocol.
    /// - User must not have exceeded maximum claims limit.
    /// - Name must not have been claimed already.
    function claim(
        string calldata label,
        address owner,
        bytes[] calldata resolverData
    ) external {
        // Validate label length
        uint len = label.strlen();
        if (len < MIN_SUBNAME_LENGTH || len > MAX_SUBNAME_LENGTH) {
            revert InvalidLabel();
        }

        // Check if user is verified via self protocol
        if (!registrarStorage.isVerified(_msgSender())) {
            revert NotSelfVerified(_msgSender());
        }

        // Check if user claimed max amount of free names
        if (registrarStorage.claimCount(_msgSender()) >= maximumClaim) {
            revert MaximumNamesClaimed();
        }

        if (registrarStorage.isBlacklisted(label)) {
            revert IRegistrarStorage.BlacklistedName(label);
        }

        if (
            registrarStorage.whitelistEnabled() &&
            !registrarStorage.isWhitelisted(_msgSender())
        ) {
            revert IRegistrarStorage.NotWhitelisted(_msgSender());
        }

        bytes32 node = registry.nodehash(label);
        registrarStorage.claim(_msgSender(), node);

        // Create the subnode in registry
        uint64 oneYearExpiry = uint64(block.timestamp) + ONE_YEAR_SECONDS;
        registry.createSubnode(label, oneYearExpiry, owner, resolverData);

        emit NameClaimed(label, node, owner);
    }

    /// @notice Returns the verification configuration ID for Self protocol.
    ///
    /// @return The verification configuration ID.
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       OWNER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Updates the Self protocol verification configuration ID.
    ///
    /// @dev Allows the owner to update the verification configuration used by Self protocol.
    ///
    /// @param configId The new verification configuration ID.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    /// @notice Updates the maximum number of names a single user can claim.
    ///
    /// @dev Allows the owner to adjust the claim limit per user.
    ///
    /// @param _maximumClaim The new maximum number of names per user.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function setMaximumClaim(uint64 _maximumClaim) external onlyOwner {
        maximumClaim = _maximumClaim;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Implementation of customVerificationHook for Self protocol integration.
    ///
    /// @dev This function is called by onVerificationSuccess after hub address validation.
    ///      It stores the verification ID and prevents double verification.
    ///
    /// @param output The verification output from the Self hub.
    /// @param userData The user data passed through verification (unused in current implementation).
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        uint256 verificationId = output.nullifier;
        address user = address(uint160(output.userIdentifier));

        // Prevent double verification
        if (
            registrarStorage.isVerified(user) ||
            registrarStorage.claimedVerifications(verificationId)
        ) {
            revert VerificationClaimed();
        }

        registrarStorage.setVerificationId(user, verificationId);
        emit VerificationCompleted(user, verificationId, block.timestamp);
    }

    /// @dev Initializes the Self protocol with verification configuration.
    ///
    /// @param _identityVerificationHubV2Address The address of the Self Identity Verification Hub V2.
    function _initSelfProtocol(
        address _identityVerificationHubV2Address
    ) internal {
        SelfUtils.UnformattedVerificationConfigV2 memory _config = SelfUtils
            .UnformattedVerificationConfigV2(18, new string[](0), false);
        SelfStructs.VerificationConfigV2 memory _verificationConfig = SelfUtils
            .formatVerificationConfigV2(_config);

        verificationConfigId = IIdentityVerificationHubV2(
            _identityVerificationHubV2Address
        ).setVerificationConfigV2(_verificationConfig);
    }
}
