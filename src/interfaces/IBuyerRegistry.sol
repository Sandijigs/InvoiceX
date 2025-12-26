// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBuyerRegistry
 * @notice Interface for BuyerRegistry contract
 */
interface IBuyerRegistry {
    function updateCreditScore(bytes32 buyerHash, uint256 newScore, uint256 newCreditLimit) external;
}
