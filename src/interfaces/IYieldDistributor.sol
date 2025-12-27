// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldDistributor
 * @notice Interface for YieldDistributor contract
 */
interface IYieldDistributor {
    enum PaymentStatus {
        PENDING,
        PAID_ON_TIME,
        PAID_LATE,
        PARTIAL,
        OVERDUE,
        DEFAULTED,
        DISPUTED,
        SETTLED
    }

    struct PaymentSchedule {
        uint256 invoiceId;
        uint256 deploymentId;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 dueDate;
        uint256 paidAmount;
        PaymentStatus status;
        uint256 createdAt;
    }

    function createPaymentSchedule(
        uint256 invoiceId,
        uint256 deploymentId,
        uint256 faceValue,
        uint256 advanceAmount,
        uint256 dueDate
    ) external;

    function recordPayment(
        uint256 invoiceId,
        uint256 amount,
        address payer,
        bytes32 referenceHash
    ) external;

    function markAsDefaulted(uint256 invoiceId) external;
    function getPaymentSchedule(uint256 invoiceId) external view returns (PaymentSchedule memory);
}
