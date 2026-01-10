import { useAccount, useReadContract } from 'wagmi'
import { LIQUIDITY_POOL_ABI, UserPosition, RiskTier } from '@/lib/abis/LiquidityPool'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { useMemo } from 'react'

export function useUserPosition(tier: RiskTier) {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

  // Read: Get user position
  const { data: positionData, isLoading, refetch } = useReadContract({
    address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'getUserPosition',
    args: address ? [address, tier] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Read: Calculate current share value
  const { data: shareValue } = useReadContract({
    address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'calculateShareValue',
    args: positionData && (positionData as any).shares > BigInt(0) ? [tier, (positionData as any).shares] : undefined,
    query: {
      enabled: !!positionData && (positionData as any).shares > BigInt(0),
      refetchInterval: 10000,
    },
  })

  // Calculate position metrics
  const metrics = useMemo(() => {
    if (!positionData) {
      return {
        hasPosition: false,
        shares: BigInt(0),
        currentValue: BigInt(0),
        depositedValue: BigInt(0),
        totalEarned: BigInt(0),
        pendingYield: BigInt(0),
        totalYieldClaimed: BigInt(0),
        profitLoss: BigInt(0),
        profitLossPercentage: 0,
      }
    }

    const position = positionData as UserPosition
    // Use shareValue if available, otherwise fallback to depositedValue (for newly deposited positions)
    const currentValue = (shareValue as bigint) || position.depositedValue || BigInt(0)

    // Calculate earnings: (current value - deposited) + total yield claimed
    const totalEarned = currentValue > position.depositedValue
      ? (currentValue - position.depositedValue) + position.totalYieldClaimed
      : position.totalYieldClaimed

    const profitLoss = totalEarned
    const profitLossPercentage =
      position.depositedValue > BigInt(0)
        ? Number((profitLoss * BigInt(10000)) / position.depositedValue) / 100
        : 0

    return {
      hasPosition: position.shares > BigInt(0),
      shares: position.shares,
      currentValue,
      depositedValue: position.depositedValue,
      totalEarned,
      pendingYield: position.pendingYield,
      totalYieldClaimed: position.totalYieldClaimed,
      profitLoss,
      profitLossPercentage,
    }
  }, [positionData, shareValue])

  return {
    // State
    positionData: positionData as UserPosition | undefined,
    metrics,

    // Loading states
    isLoading,

    // Actions
    refetch,
  }
}

// Hook to get all user positions across all tiers
export function useAllUserPositions() {
  const tierA = useUserPosition(RiskTier.TIER_A)
  const tierB = useUserPosition(RiskTier.TIER_B)
  const tierC = useUserPosition(RiskTier.TIER_C)

  const totalMetrics = useMemo(() => {
    const totalCurrentValue =
      tierA.metrics.currentValue + tierB.metrics.currentValue + tierC.metrics.currentValue
    const totalDeposited =
      tierA.metrics.depositedValue + tierB.metrics.depositedValue + tierC.metrics.depositedValue
    const totalPendingYield =
      tierA.metrics.pendingYield + tierB.metrics.pendingYield + tierC.metrics.pendingYield
    const totalEarned = tierA.metrics.totalEarned + tierB.metrics.totalEarned + tierC.metrics.totalEarned
    const totalProfitLoss = tierA.metrics.profitLoss + tierB.metrics.profitLoss + tierC.metrics.profitLoss
    const totalProfitLossPercentage =
      totalDeposited > BigInt(0)
        ? Number((totalProfitLoss * BigInt(10000)) / totalDeposited) / 100
        : 0

    return {
      totalCurrentValue,
      totalDeposited,
      totalPendingYield,
      totalEarned,
      totalProfitLoss,
      totalProfitLossPercentage,
      hasAnyPosition: tierA.metrics.hasPosition || tierB.metrics.hasPosition || tierC.metrics.hasPosition,
    }
  }, [tierA.metrics, tierB.metrics, tierC.metrics])

  return {
    tierA,
    tierB,
    tierC,
    totalMetrics,
    isLoading: tierA.isLoading || tierB.isLoading || tierC.isLoading,
    refetchAll: () => {
      tierA.refetch()
      tierB.refetch()
      tierC.refetch()
    },
  }
}
