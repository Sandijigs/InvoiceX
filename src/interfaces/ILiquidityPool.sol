// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILiquidityPool
 * @notice Interface for LiquidityPool contract
 */
interface ILiquidityPool {
    enum RiskTier {
        TIER_A,
        TIER_B,
        TIER_C
    }

    struct TierInfo {
        uint256 totalDeposited;
        uint256 totalDeployed;
        uint256 totalReturned;
        uint256 totalDefaulted;
        uint256 availableLiquidity;
        uint256 targetAPY;
        uint256 actualAPY;
    }

    function deployLiquidity(
        RiskTier tier,
        uint256 amount,
        uint256 invoiceId,
        uint256 faceValue,
        uint256 dueDate
    ) external returns (uint256 deploymentId);

    function recordReturn(uint256 deploymentId, uint256 amount) external;
    function recordDefault(uint256 deploymentId, uint256 recoveredAmount) external;
    function getAvailableLiquidity(RiskTier tier) external view returns (uint256);
    function getTierInfo(RiskTier tier) external view returns (TierInfo memory);
}
