// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBusinessRegistry
 * @notice Interface for BusinessRegistry contract
 */
interface IBusinessRegistry {
    enum VerificationStatus {
        PENDING,
        VERIFIED,
        REJECTED,
        SUSPENDED
    }

    struct BusinessData {
        uint256 businessId;
        address owner;
        string businessName;
        bytes32 taxIdHash;
        bytes32 registrationHash;
        VerificationStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 totalInvoicesFactored;
        uint256 totalValueFactored;
        uint256 activeInvoices;
        uint256 defaultCount;
    }

    function getBusinessIdByAddress(address owner) external view returns (uint256);
    function getBusinessData(uint256 businessId) external view returns (BusinessData memory);
    function isVerified(uint256 businessId) external view returns (bool);
    function updateStats(uint256 businessId, uint256 invoiceValue, bool isNewInvoice) external;
    function recordDefault(uint256 businessId) external;
}
