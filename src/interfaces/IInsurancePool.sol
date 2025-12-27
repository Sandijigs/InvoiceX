// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IInsurancePool
 * @notice Interface for InsurancePool contract (optional, for future implementation)
 */
interface IInsurancePool {
    function fileClaim(
        uint256 invoiceId,
        uint256 lossAmount,
        bytes32 evidenceHash
    ) external returns (uint256 claimId);

    function isInvoiceCovered(uint256 invoiceId) external view returns (bool);
}
