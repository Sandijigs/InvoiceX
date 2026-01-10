import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { LIQUIDITY_POOL_ABI, Pool, RiskTier } from '@/lib/abis/LiquidityPool'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { useEffect } from 'react'

export { RiskTier } from '@/lib/abis/LiquidityPool'

export function useLiquidityPool(tier: RiskTier) {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

  // Read: Get pool data
  const { data: poolData, isLoading: isLoadingPool, refetch: refetchPool } = useReadContract({
    address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'getPool',
    args: [tier],
    query: {
      enabled: true,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Read: Get stablecoin address
  const { data: stablecoinAddress } = useReadContract({
    address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'stablecoin',
  })

  // Write: Deposit
  const {
    writeContract: depositWrite,
    data: depositHash,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract()

  const { isLoading: isConfirmingDeposit, isSuccess: isDepositConfirmed } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    })

  // Write: Withdraw
  const {
    writeContract: withdrawWrite,
    data: withdrawHash,
    isPending: isWithdrawing,
    error: withdrawError,
  } = useWriteContract()

  const { isLoading: isConfirmingWithdraw, isSuccess: isWithdrawConfirmed } =
    useWaitForTransactionReceipt({
      hash: withdrawHash,
    })

  // Write: Claim Yield
  const {
    writeContract: claimYieldWrite,
    data: claimYieldHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract()

  const { isLoading: isConfirmingClaim, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimYieldHash,
  })

  // Write: Compound Yield
  const {
    writeContract: compoundYieldWrite,
    data: compoundHash,
    isPending: isCompounding,
    error: compoundError,
  } = useWriteContract()

  const { isLoading: isConfirmingCompound, isSuccess: isCompoundConfirmed } =
    useWaitForTransactionReceipt({
      hash: compoundHash,
    })

  // Auto-refetch pool data after successful transactions
  useEffect(() => {
    if (isDepositConfirmed || isWithdrawConfirmed || isClaimConfirmed || isCompoundConfirmed) {
      const timer = setTimeout(() => {
        refetchPool()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isDepositConfirmed, isWithdrawConfirmed, isClaimConfirmed, isCompoundConfirmed, refetchPool])

  const handleDeposit = async (amount: bigint) => {
    if (!address) throw new Error('Wallet not connected')

    depositWrite({
      address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'deposit',
      args: [tier, amount],
    })
  }

  const handleWithdraw = async (shares: bigint) => {
    if (!address) throw new Error('Wallet not connected')

    withdrawWrite({
      address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'withdraw',
      args: [tier, shares],
    })
  }

  const handleClaimYield = async () => {
    if (!address) throw new Error('Wallet not connected')

    claimYieldWrite({
      address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'claimYield',
      args: [tier],
    })
  }

  const handleCompoundYield = async () => {
    if (!address) throw new Error('Wallet not connected')

    compoundYieldWrite({
      address: getContractAddress(chainId, 'liquidityPool') as `0x${string}`,
      abi: LIQUIDITY_POOL_ABI,
      functionName: 'compoundYield',
      args: [tier],
    })
  }

  return {
    // State
    poolData: poolData as Pool | undefined,
    stablecoinAddress: stablecoinAddress as `0x${string}` | undefined,

    // Loading states
    isLoadingPool,
    isDepositing: isDepositing || isConfirmingDeposit,
    isWithdrawing: isWithdrawing || isConfirmingWithdraw,
    isClaiming: isClaiming || isConfirmingClaim,
    isCompounding: isCompounding || isConfirmingCompound,

    // Success states
    isDepositConfirmed,
    isWithdrawConfirmed,
    isClaimConfirmed,
    isCompoundConfirmed,

    // Errors
    depositError,
    withdrawError,
    claimError,
    compoundError,

    // Actions
    deposit: handleDeposit,
    withdraw: handleWithdraw,
    claimYield: handleClaimYield,
    compoundYield: handleCompoundYield,
    refetchPool,
  }
}
