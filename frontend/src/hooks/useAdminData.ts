'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback, useEffect } from 'react'
import { CONTRACTS } from '@/lib/contracts'
import { KYB_REGISTRY_ABI, type VerificationRequest, RequestStatus } from '@/lib/abis/KYBRegistry'
import { BUSINESS_REGISTRY_ABI } from '@/lib/abis/BusinessRegistry'
import { CREDIT_ORACLE_ABI } from '@/lib/abis/CreditOracle'

// Hook for fetching pending KYB requests
export function useKYBRequests() {
  // Get pending request IDs - always fetch fresh data, no caching
  const { data: pendingIds, isLoading: isLoadingIds, refetch: refetchIds, error } = useReadContract({
    address: CONTRACTS.kybRegistry,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getPendingRequests',
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache
    },
  })

  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('🔍 useKYBRequests Hook:', {
      contract: CONTRACTS.kybRegistry,
      pendingIds,
      pendingIdsType: typeof pendingIds,
      pendingIdsArray: Array.isArray(pendingIds),
      count: pendingIds ? (pendingIds as any).length : 0,
      isLoading: isLoadingIds,
      error: error ? (error as any).message : null
    })
  }, [pendingIds, isLoadingIds, error])

  // Fetch details for each pending request
  const fetchRequestDetails = useCallback(async () => {
    if (!pendingIds || pendingIds.length === 0) {
      setRequests([])
      return
    }

    setIsLoadingRequests(true)
    // In a real app, we'd batch these calls or use multicall
    // For now, we'll just return the IDs and let the component handle individual fetches
    setIsLoadingRequests(false)
  }, [pendingIds])

  return {
    pendingIds: pendingIds as bigint[] | undefined,
    requests,
    isLoading: isLoadingIds || isLoadingRequests,
    refetch: refetchIds,
    fetchRequestDetails,
  }
}

// Hook for fetching a single KYB request
export function useKYBRequest(requestId: bigint | undefined) {
  const { data: requestData, isLoading, refetch } = useReadContract({
    address: CONTRACTS.kybRegistry,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getVerificationRequest',
    args: requestId ? [requestId] : undefined,
    query: {
      enabled: !!requestId,
    },
  })

  // Debug logging
  if (requestData) {
    console.log('Raw KYB request data:', requestData)
  }

  const request = requestData
    ? {
        requestId: (requestData as any).requestId as bigint,
        businessWallet: (requestData as any).businessWallet as `0x${string}`,
        businessHash: (requestData as any).businessHash as `0x${string}`,
        submittedProofs: (requestData as any).submittedProofs as `0x${string}`[],
        requestedAt: (requestData as any).requestedAt as bigint,
        requestStatus: (requestData as any).requestStatus as RequestStatus,
        rejectionReason: (requestData as any).rejectionReason as string,
      }
    : null

  return {
    request,
    isLoading,
    refetch,
  }
}

// Hook for admin actions
export function useAdminActions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError: txError, error: txErrorDetails } = useWaitForTransactionReceipt({
    hash,
    timeout: 60000, // 60 second timeout
  })

  // Log transaction hash when available
  useEffect(() => {
    if (hash) {
      console.log('🎯 Transaction hash received:', hash)
      console.log('🔗 View on explorer: https://sepolia.mantlescan.xyz/tx/' + hash)
      console.log('📊 Transaction status:', {
        isPending,
        isConfirming,
        isSuccess,
        txError,
        hash: hash
      })
    }
  }, [hash, isPending, isConfirming, isSuccess, txError])

  // Log transaction confirmation
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('✅ Admin action transaction CONFIRMED ON BLOCKCHAIN!')
      console.log('✅ Transaction hash:', hash)
      console.log('✅ The transaction has been successfully mined.')
      console.log('🔄 You may need to refresh the page to see the updated status.')
    }
  }, [isSuccess, hash])

  // Log transaction errors
  useEffect(() => {
    if (txError && txErrorDetails) {
      console.error('❌ Admin action transaction error:', txErrorDetails)
    }
  }, [txError, txErrorDetails])

  useEffect(() => {
    if (writeError) {
      console.error('❌ Admin action write error:', writeError)
    }
  }, [writeError])

  // Verify business (approve KYB)
  const verifyBusiness = useCallback(
    async (businessId: bigint, zkProofHash: `0x${string}`, initialCreditScore: number) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('✅ Verifying business...', {
          businessId: businessId.toString(),
          initialCreditScore,
          contractAddress: CONTRACTS.businessRegistry,
          zkProofHash
        })

        writeContract({
          address: CONTRACTS.businessRegistry,
          abi: BUSINESS_REGISTRY_ABI,
          functionName: 'verifyBusiness',
          args: [businessId, zkProofHash, BigInt(initialCreditScore)],
        })

        console.log('📝 Business verification transaction submitted')
      } catch (err) {
        const error = err as Error
        console.error('❌ Error verifying business:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Update buyer assessment (Oracle function)
  // Simplified version that creates a basic assessment with just the credit score
  const setCreditScore = useCallback(
    async (buyerHash: `0x${string}`, score: number) => {
      try {
        setIsLoading(true)
        setError(null)

        if (score < 0 || score > 1000) {
          throw new Error('Credit score must be between 0 and 1000')
        }

        console.log('📊 Updating buyer assessment...', { buyerHash, score })

        // Create a basic assessment structure
        const now = Math.floor(Date.now() / 1000)
        const validityPeriod = 30 * 24 * 60 * 60 // 30 days

        // Determine risk tier based on score
        let tier = 2 // TIER_C (default)
        if (score >= 750) tier = 0 // TIER_A
        else if (score >= 600) tier = 1 // TIER_B
        else if (score >= 400) tier = 2 // TIER_C
        else tier = 3 // REJECTED

        const assessment = {
          buyerHash,
          creditScore: BigInt(score),
          creditLimit: BigInt(score * 1000), // Simple calculation: score * 1000 USDT
          defaultProbability: BigInt(Math.max(0, 100 - score / 10)), // Inverse relationship
          recommendedAdvanceRate: BigInt(Math.min(80, score / 10)), // Up to 80%
          confidenceScore: BigInt(85), // Default confidence
          assignedTier: tier,
          riskFactors: [],
          assessedAt: BigInt(now),
          validUntil: BigInt(now + validityPeriod),
          isValid: true,
        }

        writeContract({
          address: CONTRACTS.creditOracle,
          abi: CREDIT_ORACLE_ABI,
          functionName: 'updateBuyerAssessment',
          args: [buyerHash, assessment],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error updating buyer assessment:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Pause system (SuperAdmin only)
  const pauseSystem = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('⏸️  Pausing system...')

      writeContract({
        address: CONTRACTS.invoiceXCore,
        abi: [
          {
            type: 'function',
            name: 'pause',
            stateMutability: 'nonpayable',
            inputs: [],
            outputs: [],
          },
        ] as const,
        functionName: 'pause',
      })
    } catch (err) {
      const error = err as Error
      console.error('Error pausing system:', error)
      setError(error)
      setIsLoading(false)
    }
  }, [writeContract])

  // Unpause system (SuperAdmin only)
  const unpauseSystem = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('▶️  Unpausing system...')

      writeContract({
        address: CONTRACTS.invoiceXCore,
        abi: [
          {
            type: 'function',
            name: 'unpause',
            stateMutability: 'nonpayable',
            inputs: [],
            outputs: [],
          },
        ] as const,
        functionName: 'unpause',
      })
    } catch (err) {
      const error = err as Error
      console.error('Error unpausing system:', error)
      setError(error)
      setIsLoading(false)
    }
  }, [writeContract])

  // Approve KYB verification (KYB Verifier role)
  const approveKYB = useCallback(
    async (requestId: bigint, level: number = 2, validityDays: number = 365) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('✅ Approving KYB request...', {
          requestId: requestId.toString(),
          level,
          validityDays,
          contractAddress: CONTRACTS.kybRegistry
        })

        // Default flags - all proofs verified
        const flags = {
          businessRegistration: true,
          revenueThreshold: true,
          operatingHistory: true,
          bankAccountVerified: true,
          noLiens: true,
          goodStanding: true,
        }

        writeContract({
          address: CONTRACTS.kybRegistry,
          abi: KYB_REGISTRY_ABI,
          functionName: 'approveKYB',
          args: [requestId, level, flags, BigInt(validityDays)],
        })

        console.log('📝 KYB approval transaction submitted')
      } catch (err) {
        const error = err as Error
        console.error('❌ Error approving KYB:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Reject KYB verification (KYB Verifier role)
  const rejectKYB = useCallback(
    async (requestId: bigint, reason: string) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('❌ Rejecting KYB request...', {
          requestId: requestId.toString(),
          reason,
          contractAddress: CONTRACTS.kybRegistry,
          abi: 'KYB_REGISTRY_ABI',
          functionName: 'rejectKYB'
        })

        console.log('📝 About to call writeContract...')

        // writeContract doesn't return a hash directly in wagmi v2
        // It triggers the transaction and the hash will be available in the hook's data
        await writeContract({
          address: CONTRACTS.kybRegistry,
          abi: KYB_REGISTRY_ABI,
          functionName: 'rejectKYB',
          args: [requestId, reason],
        })

        console.log('✅ Transaction request sent to wallet!')
        console.log('⏳ Check wallet for approval prompt...')

        // The hash will be available through the hook's data field after wallet approval
        // We can't return it here since it's not immediately available
      } catch (err) {
        const error = err as Error
        console.error('❌ Error rejecting KYB:', error)
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
        setError(error)
        setIsLoading(false)
        throw error // Re-throw to let the caller handle it
      }
    },
    [writeContract]
  )

  return {
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: txError || !!writeError,
    error: error || writeError,
    hash,

    // Actions
    verifyBusiness,
    setCreditScore,
    pauseSystem,
    unpauseSystem,
    approveKYB,
    rejectKYB,
  }
}

// Hook to check if system is paused
export function useSystemStatus() {
  const { data: isPaused, isLoading, refetch } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: [
      {
        type: 'function',
        name: 'paused',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const,
    functionName: 'paused',
  })

  return {
    isPaused: !!isPaused,
    isLoading,
    refetch,
  }
}

// Hook to get system stats
export function useSystemStats() {
  // In a real implementation, we'd fetch actual stats from events or storage
  // For now, we'll return placeholder data structure
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalInvoices: 0,
    totalVolume: BigInt(0),
    activeInvoices: 0,
  })

  return {
    stats,
    isLoading: false,
  }
}
