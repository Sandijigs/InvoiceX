'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState, useCallback } from 'react'
import { INSURANCE_POOL_ABI, type PoolMetrics, type StakerPosition, CoverageTier } from '@/lib/abis/InsurancePool'
import { CONTRACTS } from '@/lib/contracts'
import { parseUnits, formatUnits } from 'viem'

export function useInsurancePool() {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get pool metrics
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useReadContract({
    address: CONTRACTS.InsurancePool,
    abi: INSURANCE_POOL_ABI,
    functionName: 'getPoolMetrics',
  })

  // Parse pool metrics
  const poolMetrics = metricsData
    ? {
        totalStaked: (metricsData as any)[0] as bigint,
        totalShares: (metricsData as any)[1] as bigint,
        totalPremiumsCollected: (metricsData as any)[2] as bigint,
        totalClaimsPaid: (metricsData as any)[3] as bigint,
        activeCoverageCount: (metricsData as any)[4] as bigint,
        activeCoverageAmount: (metricsData as any)[5] as bigint,
        availableCapital: (metricsData as any)[6] as bigint,
        reserveRatio: (metricsData as any)[7] as bigint,
        currentAPY: (metricsData as any)[8] as bigint,
      }
    : null

  // Get user staker position
  const {
    data: stakerData,
    isLoading: isLoadingStaker,
    refetch: refetchStaker,
  } = useReadContract({
    address: CONTRACTS.InsurancePool,
    abi: INSURANCE_POOL_ABI,
    functionName: 'getStakerPosition',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Parse staker position
  const stakerPosition = stakerData
    ? {
        stakedAmount: (stakerData as any)[0] as bigint,
        shares: (stakerData as any)[1] as bigint,
        stakedAt: (stakerData as any)[2] as bigint,
        lockEndTime: (stakerData as any)[3] as bigint,
        pendingYield: (stakerData as any)[4] as bigint,
        totalYieldClaimed: (stakerData as any)[5] as bigint,
      }
    : null

  // Write contract hook
  const { writeContract, data: hash, isPending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Stake tokens
  const stake = useCallback(
    async (amount: string, lockDays: number) => {
      try {
        setIsLoading(true)
        setError(null)

        const amountBigInt = parseUnits(amount, 6) // USDT has 6 decimals

        console.log('💰 Staking...', { amount, lockDays })

        writeContract({
          address: CONTRACTS.InsurancePool,
          abi: INSURANCE_POOL_ABI,
          functionName: 'stake',
          args: [amountBigInt, BigInt(lockDays)],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error staking:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Unstake tokens
  const unstake = useCallback(
    async (shares: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('💸 Unstaking...', { shares: shares.toString() })

        writeContract({
          address: CONTRACTS.InsurancePool,
          abi: INSURANCE_POOL_ABI,
          functionName: 'unstake',
          args: [shares],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error unstaking:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Claim staking yield
  const claimYield = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('🎁 Claiming yield...')

      writeContract({
        address: CONTRACTS.InsurancePool,
        abi: INSURANCE_POOL_ABI,
        functionName: 'claimStakingYield',
      })
    } catch (err) {
      const error = err as Error
      console.error('Error claiming yield:', error)
      setError(error)
      setIsLoading(false)
    }
  }, [writeContract])

  // Purchase coverage
  const purchaseCoverage = useCallback(
    async (invoiceId: bigint, tier: CoverageTier) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🛡️ Purchasing coverage...', { invoiceId: invoiceId.toString(), tier })

        writeContract({
          address: CONTRACTS.InsurancePool,
          abi: INSURANCE_POOL_ABI,
          functionName: 'purchaseCoverage',
          args: [invoiceId, tier],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error purchasing coverage:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Helper functions
  const formatAmount = (amount: bigint) => formatUnits(amount, 6)

  const calculateAPY = () => {
    if (!poolMetrics) return '0'
    // APY is stored in basis points (10000 = 100%)
    return (Number(poolMetrics.currentAPY) / 100).toFixed(2)
  }

  const isLocked = () => {
    if (!stakerPosition) return false
    return Number(stakerPosition.lockEndTime) * 1000 > Date.now()
  }

  const getLockTimeRemaining = () => {
    if (!stakerPosition) return null
    const lockEndTime = Number(stakerPosition.lockEndTime) * 1000
    const now = Date.now()
    const diff = lockEndTime - now

    if (diff <= 0) return { days: 0, hours: 0, unlocked: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    return { days, hours, unlocked: false }
  }

  return {
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    hash,

    // Data
    poolMetrics,
    stakerPosition,
    isLoadingMetrics,
    isLoadingStaker,

    // Actions
    stake,
    unstake,
    claimYield,
    purchaseCoverage,
    refetchMetrics,
    refetchStaker,

    // Computed
    apy: calculateAPY(),
    isLocked: isLocked(),
    lockTimeRemaining: getLockTimeRemaining(),
    hasStaked: stakerPosition ? stakerPosition.stakedAmount > BigInt(0) : false,
    hasPendingYield: stakerPosition ? stakerPosition.pendingYield > BigInt(0) : false,
  }
}
