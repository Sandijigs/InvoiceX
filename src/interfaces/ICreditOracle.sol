// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICreditOracle
 * @notice Interface for CreditOracle contract
 */
interface ICreditOracle {
    enum RiskTier {
        TIER_A,
        TIER_B,
        TIER_C,
        REJECTED
    }

    struct CreditAssessment {
        uint256 requestId;
        bytes32 buyerHash;
        uint256 invoiceAmount;
        RiskTier riskTier;
        uint256 riskScore;
        uint256 advanceRate;
        bool approved;
        uint256 assessedAt;
    }

    function requestAssessment(
        uint256 requestId,
        bytes32 buyerHash,
        bytes32 sellerHash,
        uint256 invoiceAmount,
        uint256 paymentTermDays
    ) external returns (uint256 assessmentId);

    function getAssessment(uint256 assessmentId) external view returns (CreditAssessment memory);
    function calculateAdvanceRate(RiskTier tier) external view returns (uint256);
}
