import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { KYB_REGISTRY_ABI, KYBData } from '@/lib/abis/KYBRegistry'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { useMemo, useEffect, useState } from 'react'

export { KYBStatus } from '@/lib/abis/KYBRegistry'

export function useKYBRegistry() {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

  // Local state to track if user has submitted KYB (stored in localStorage)
  const [localPendingKYB, setLocalPendingKYB] = useState<boolean>(false)

  // Check localStorage for pending KYB status on mount
  useEffect(() => {
    if (address) {
      const storedStatus = localStorage.getItem(`kyb_pending_${address.toLowerCase()}`)
      setLocalPendingKYB(storedStatus === 'true')
    }
  }, [address])

  // Read: Check if KYB is valid (verified and not expired)
  const { data: isValid, isLoading: isCheckingValidity, refetch: refetchValidity, error: validityError } = useReadContract({
    address: getContractAddress(chainId, 'kybRegistry') as `0x${string}`,
    abi: KYB_REGISTRY_ABI,
    functionName: 'isKYBValid',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  })

  // Read: Get full KYB data - always try to fetch if address is available
  const { data: kybData, isLoading: isLoadingData, refetch: refetchData, error: dataError } = useReadContract({
    address: getContractAddress(chainId, 'kybRegistry') as `0x${string}`,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getKYBData',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: false, // Don't retry since KYBNotFound is expected for new users
      retryDelay: 1000,
    },
  })

  // Read: Get pending requests to check if user has submitted but not approved KYB
  const { data: pendingRequests, refetch: refetchPending } = useReadContract({
    address: getContractAddress(chainId, 'kybRegistry') as `0x${string}`,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getPendingRequests',
    query: {
      enabled: true,
      retry: false,
    },
  })

  // We need to fetch individual pending requests to check if they belong to this user
  // This is a workaround since we can't efficiently check all pending requests
  const { data: userPendingRequest } = useReadContract({
    address: getContractAddress(chainId, 'kybRegistry') as `0x${string}`,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getRequest',
    // Try to get a recent request ID - this is a hack for now
    // In production, we'd need a better way to track user's request ID
    args: pendingRequests && pendingRequests[0] ? [pendingRequests[0]] : undefined,
    query: {
      enabled: !!pendingRequests && pendingRequests.length > 0,
      retry: false,
    },
  })

  // Check if user has a pending verification request
  const hasPendingRequest = useMemo(() => {
    if (!userPendingRequest || !address) return false

    // Check if the pending request belongs to this user
    const request = userPendingRequest as any
    if (request && request.businessWallet) {
      return request.businessWallet.toLowerCase() === address.toLowerCase() &&
             request.requestStatus === 0 // 0 = PENDING
    }

    return false
  }, [userPendingRequest, address])

  // Determine if user has submitted KYB (even if not yet approved)
  // Check if kybData exists and status is not NONE
  const hasKYB = useMemo(() => {
    // First check localStorage for pending status (set when user submits KYB)
    if (localPendingKYB) {
      console.log('📋 User has pending KYB (from localStorage)')
      return true
    }

    // Then check if user has a pending request in the contract
    if (hasPendingRequest) {
      console.log('📋 User has pending KYB request (from contract)')
      return true
    }

    // If we have data, check the status
    if (kybData) {
      const status = (kybData as any).status
      // Status 0 = NONE means no KYB submitted
      const hasSubmitted = status !== undefined && status !== 0

      // If KYB is approved, clear the localStorage flag
      if (hasSubmitted && status > 0 && localPendingKYB) {
        localStorage.removeItem(`kyb_pending_${address?.toLowerCase()}`)
        setLocalPendingKYB(false)
      }

      return hasSubmitted
    }

    // If we have an error, check if it's KYBNotFound
    if (dataError) {
      const errorMessage = (dataError as any).message || dataError.toString() || ''

      // If it's KYBNotFound error, user has not submitted KYB
      if (errorMessage.includes('KYBNotFound')) {
        return false
      }

      // For other errors, we can't determine the state
      // Default to false to be safe
      return false
    }

    // No data and no error means still loading or no KYB
    return false
  }, [kybData, dataError, address, hasPendingRequest, localPendingKYB])

  // Write: Submit KYB
  const {
    writeContract: submitKYB,
    data: submitHash,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: txError, error: txErrorDetails } = useWaitForTransactionReceipt({
    hash: submitHash,
    timeout: 60_000, // 60 second timeout
  })

  // Log transaction state for debugging
  useEffect(() => {
    if (submitHash) {
      console.log('📝 KYB Transaction submitted:', submitHash)
      console.log('Transaction status:', {
        isSubmitting,
        isConfirming,
        isConfirmed,
        hasError: txError || !!submitError
      })
    }
  }, [submitHash, isSubmitting, isConfirming, isConfirmed, txError, submitError])

  useEffect(() => {
    if (isConfirmed && address) {
      console.log('✅ KYB Transaction confirmed successfully!')
      // Store in localStorage that this user has pending KYB
      localStorage.setItem(`kyb_pending_${address.toLowerCase()}`, 'true')
      setLocalPendingKYB(true)
    }
  }, [isConfirmed, address])

  useEffect(() => {
    if (txError && txErrorDetails) {
      console.error('❌ KYB Transaction error:', {
        message: txErrorDetails.message,
        name: txErrorDetails.name,
        cause: txErrorDetails.cause
      })
    }
    if (submitError) {
      console.error('❌ KYB Submit error:', {
        message: submitError.message,
        name: submitError.name,
        cause: submitError.cause
      })
    }
  }, [txError, txErrorDetails, submitError])

  // Auto-refetch KYB data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      // Small delay to ensure blockchain state is updated
      const timer = setTimeout(() => {
        refetchData()
        refetchValidity()
        refetchPending()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isConfirmed, refetchData, refetchValidity, refetchPending])

  const handleSubmitKYB = async (
    businessHash: `0x${string}`,
    proofHashes: `0x${string}`[],
    jurisdiction: string, // 2-character country code
    businessType: string
  ) => {
    if (!address) throw new Error('Wallet not connected')

    // Convert jurisdiction string to bytes2 format (2 bytes = 2 characters)
    // Pad to exactly 2 characters if needed
    const jurisdictionStr = jurisdiction.padEnd(2, '\0').slice(0, 2)

    // Convert to hex bytes2 format
    const jurisdictionBytes = `0x${Buffer.from(jurisdictionStr, 'utf-8').toString('hex').padEnd(4, '0').slice(0, 4)}` as `0x${string}`

    submitKYB({
      address: getContractAddress(chainId, 'kybRegistry') as `0x${string}`,
      abi: KYB_REGISTRY_ABI,
      functionName: 'submitKYB',
      args: [businessHash, proofHashes, jurisdictionBytes, businessType],
    })
  }

  return {
    // State
    isValid: !!isValid,
    hasKYB,
    hasPendingRequest,
    kybData: kybData as KYBData | undefined,
    pendingRequests: pendingRequests as bigint[] | undefined,

    // Loading states
    isCheckingValidity,
    isLoadingData,
    isSubmitting: isSubmitting || isConfirming,

    // Success states
    isSubmissionConfirmed: isConfirmed,

    // Errors
    submitError: submitError || txErrorDetails,
    validityError,
    dataError, // Exporting dataError so components can check the error

    // Actions
    submitKYB: handleSubmitKYB,
    refetchValidity,
    refetchData,
    refetchPending,
  }
}
