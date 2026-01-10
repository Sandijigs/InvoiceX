import { useMemo } from 'react'
import { Pool, RiskTier } from '@/lib/abis/LiquidityPool'
import { useLiquidityPool } from './useLiquidityPool'

export function usePoolMetrics(tier: RiskTier) {
  const { poolData, isLoadingPool } = useLiquidityPool(tier)

  const metrics = useMemo(() => {
    if (!poolData) {
      return {
        totalValueLocked: BigInt(0),
        availableLiquidity: BigInt(0),
        deployedLiquidity: BigInt(0),
        utilizationRate: 0,
        targetAPY: 0,
        actualAPY: 0,
        totalYieldEarned: BigInt(0),
        totalLosses: BigInt(0),
        netYield: BigInt(0),
        poolCapacity: BigInt(0),
        remainingCapacity: BigInt(0),
        capacityUtilization: 0,
        isAcceptingDeposits: false,
      }
    }

    const pool = poolData as Pool
    const totalValueLocked = pool.totalDeposits
    const utilizationRate =
      totalValueLocked > BigInt(0)
        ? Number((pool.deployedLiquidity * BigInt(10000)) / totalValueLocked) / 100
        : 0

    // Calculate actual APY based on yield earned
    // This is a simplified calculation - in production, you'd want historical data
    const actualAPY = Number(pool.targetAPY) / 100 // Convert from basis points

    const netYield = pool.totalYieldEarned - pool.totalLosses
    const remainingCapacity = pool.maxPoolSize - totalValueLocked
    const capacityUtilization =
      pool.maxPoolSize > BigInt(0)
        ? Number((totalValueLocked * BigInt(10000)) / pool.maxPoolSize) / 100
        : 0

    return {
      totalValueLocked,
      availableLiquidity: pool.availableLiquidity,
      deployedLiquidity: pool.deployedLiquidity,
      utilizationRate,
      targetAPY: Number(pool.targetAPY) / 100,
      actualAPY,
      totalYieldEarned: pool.totalYieldEarned,
      totalLosses: pool.totalLosses,
      netYield,
      poolCapacity: pool.maxPoolSize,
      remainingCapacity,
      capacityUtilization,
      isAcceptingDeposits: pool.acceptingDeposits,
      minDeposit: pool.minDeposit,
      maxDeposit: pool.maxDeposit,
    }
  }, [poolData])

  return {
    metrics,
    poolData,
    isLoading: isLoadingPool,
  }
}

// Get tier information
export function getTierInfo(tier: RiskTier) {
  switch (tier) {
    case RiskTier.TIER_A:
      return {
        name: 'Tier A',
        description: 'Low Risk',
        apyRange: '8-12%',
        riskLevel: 'Low',
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-600',
        icon: '🛡️',
      }
    case RiskTier.TIER_B:
      return {
        name: 'Tier B',
        description: 'Medium Risk',
        apyRange: '15-20%',
        riskLevel: 'Medium',
        color: 'amber',
        gradient: 'from-amber-500 to-orange-600',
        icon: '⚖️',
      }
    case RiskTier.TIER_C:
      return {
        name: 'Tier C',
        description: 'Higher Risk',
        apyRange: '22-30%',
        riskLevel: 'Higher',
        color: 'rose',
        gradient: 'from-rose-500 to-red-600',
        icon: '🚀',
      }
  }
}
