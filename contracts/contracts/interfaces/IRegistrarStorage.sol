// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISelfStorage
 * @dev Interface for SelfStorage contract
 * @notice Centralized storage for Self-verification based registrars
 */
interface IRegistrarStorage {
    // ============ Custom Errors ============

    /// @dev Thrown when caller tries to claim already claimed verification Id
    error VerificationIdClaimed(uint256 id);

    // ============ Events ============

    /// @dev Emitted when a verification is deleted by the owner
    event VerificationDeleted(address user, uint256 verificationId);

    /// @dev Emitted when blacklist gets updated
    event BlacklistChanged(bytes32[] labels, bool enabled, uint8 version);

    /// @dev Emitted when whitelist gets updated
    event WhitelistEntriesUpdated(address[] users, bool enabled, uint8 version);

    /// @dev Emitted when whitelist gets enabled or disabled
    event WhitelistChanged(bool enabled);

    /// @dev Thrown when user is not whitelisted
    error NotWhitelisted(address);

    /// @dev Thown when label is blacklisted
    error BlacklistedName(string);

    // ============ External Functions ============

    /**
     * @notice Sets the verification ID for a user
     * @param user The address of the user
     * @param verificationId The verification ID to associate with the user
     */
    function setVerificationId(
        address user,
        uint256 verificationId
    ) external;

    /**
     * @notice Increments the claim count for a user
     * @param user The address of the user who is claiming a name
     * @param namehash namehash of claimed name
     */
    function claim(address user, bytes32 namehash) external;

    /**
     * @notice Removes an existing verification
     * @param user The address of the user whose verification is being removed
     * @param verificationId The verification ID to remove
     */
    function deleteVerification(address user, uint256 verificationId) external;

    // ============ View Functions ============

    /**
     * @notice Gets the verification ID for a user
     * @param user The address of the user
     * @return The verification ID associated with the user
     */
    function verificationIds(address user) external view returns (uint256);

    /**
     * @notice Gets the number of names claimed by a user
     * @param user The address of the user
     * @return The number of names claimed by the user
     */
    function claimCount(address user) external view returns (uint256);

    /**
     * @notice Checks if a verification ID has been claimed
     * @param verificationId The verification ID to check
     * @return True if the verification ID has been claimed, false otherwise
     */
    function claimedVerifications(uint256 verificationId) external view returns (bool);

    /**
     * @notice Checks if a name has been claimed via self protocol
     * @param namehash The namehash of the name to check
     * @return True if the name has been claimed, false otherwise
     */
    function verifiedNames(bytes32 namehash) external view returns (bool);

    /**
     * @notice Checks if a user has completed verification
     * @param user The address of the user
     * @return True if the user has a verification ID assigned, false otherwise
     */
    function isVerified(address user) external view returns (bool);

    function isWhitelisted(address user) external view returns (bool);

    function isBlacklisted(string calldata label) external view returns (bool);

    function whitelistEnabled() external view returns(bool);

    function isClaimedViaSelf(
    address user,
    bytes32 nodehash
  ) external view returns (bool);
}

