// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IInvoiceToken
 * @notice Interface for tokenized invoice NFTs
 */
interface IInvoiceToken {
    enum InvoiceStatus {
        PENDING_VERIFICATION,
        VERIFIED,
        FUNDED,
        PAYMENT_RECEIVED,
        SETTLED,
        LATE,
        DEFAULTED,
        DISPUTED,
        CANCELLED
    }

    enum RiskTier {
        TIER_A,
        TIER_B,
        TIER_C,
        REJECTED
    }

    struct InvoiceData {
        uint256 invoiceId;
        address seller;
        bytes32 buyerHash;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 discountAmount;
        uint256 issuedAt;
        uint256 dueDate;
        uint256 fundedAt;
        uint256 riskScore;
        RiskTier riskTier;
        bytes32 documentHash;
        string invoiceNumber;
        InvoiceStatus status;
    }

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed seller,
        bytes32 indexed buyerHash,
        uint256 faceValue,
        uint256 dueDate
    );

    function createInvoice(
        address seller,
        bytes32 buyerHash,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 documentHash,
        string calldata invoiceNumber
    ) external returns (uint256 invoiceId);

    function getInvoice(uint256 invoiceId) external view returns (InvoiceData memory);
}