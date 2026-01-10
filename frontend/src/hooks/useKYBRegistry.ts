import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { KYB_REGISTRY_ABI, KYBData } from '@/lib/abis/KYBRegistry'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { useMemo, useEffect } from 'react'

export { KYBStatus } from '@/lib/abis/KYBRegistry'

export function useKYBRegistry() {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

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

  // Check if user has a pending verification request
  const hasPendingRequest = useMemo(() => {
    if (!pendingRequests || !address) return false

    // pendingRequests is an array of request IDs
    // We need to fetch each request to check if it belongs to the user
    // For now, just check if there are any pending requests
    // In production, you'd want to fetch each request and check the businessWallet

    return (pendingRequests as any[]).length > 0
  }, [pendingRequests, address])

  // Determine if user has submitted KYB (even if not yet approved)
  // Check if kybData exists and status is not NONE
  // Also check if error is NOT KYBNotFound (which means KYB exists but there's another error)
  const hasKYB = useMemo(() => {
    // If we have data, check the status
    if (kybData) {
      const status = (kybData as any).status
      return status !== undefined && status !== 0 // 0 = NONE
    }

    // Check if user has a pending request (submitted but not approved)
    if (hasPendingRequest) {
      return true
    }

    // If we have an error but it's not KYBNotFound, it might mean KYB exists but there's another issue
    // Check if the error message contains information about the KYB existing
    if (dataError) {
      const errorMessage = (dataError as any).message || dataError.toString() || ''

      // Check if this is a KYBNotFound error
      const isKYBNotFound = errorMessage.includes('KYBNotFound')

      // If error is not KYBNotFound, assume KYB might exist
      // This handles cases where the contract reverts for other reasons
      if (!isKYBNotFound) {
        return true // Assume KYB exists if it's a different error
      } else {
        // Even if KYBNotFound, check if there are pending requests
        if (hasPendingRequest) {
          return true
        }
      }
    }

    return false
  }, [kybData, dataError, isLoadingData, address, hasPendingRequest])

  // Write: Submit KYB
  const {
    writeContract: submitKYB,
    data: submitHash,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: submitHash,
    query: {
      enabled: !!submitHash,
    },
  })

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
    submitError,
    validityError,
    dataError, // Exporting dataError so components can check the error

    // Actions
    submitKYB: handleSubmitKYB,
    refetchValidity,
    refetchData,
    refetchPending,
  }
}
