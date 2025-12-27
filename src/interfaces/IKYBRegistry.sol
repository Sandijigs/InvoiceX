// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKYBRegistry
 * @notice Interface for KYBRegistry contract
 */
interface IKYBRegistry {
    enum KYBStatus {
        NOT_STARTED,
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED
    }

    struct KYBData {
        uint256 businessId;
        KYBStatus status;
        uint256 approvedAt;
        uint256 expiresAt;
        bytes32 verificationHash;
        address verifier;
    }

    function getKYBData(uint256 businessId) external view returns (KYBData memory);
    function isKYBValid(uint256 businessId) external view returns (bool);
    function hasValidKYB(uint256 businessId) external view returns (bool);
}
