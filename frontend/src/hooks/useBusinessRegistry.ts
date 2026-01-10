import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { BUSINESS_REGISTRY_ABI, Business, BusinessStatus } from '@/lib/abis/BusinessRegistry'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { useMemo } from 'react'

export function useBusinessRegistry() {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

  // Read: Get business ID by owner address
  const { data: businessId, isLoading: isCheckingRegistration, refetch: refetchRegistration, error: registrationCheckError } = useReadContract({
    address: getContractAddress(chainId, 'businessRegistry') as `0x${string}`,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusinessByOwner',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
      staleTime: 30_000, // 30 seconds
      gcTime: 60_000, // 1 minute
    },
  })

  // Check if registered (businessId > 0 means registered)
  const isRegistered = useMemo(() => {
    return businessId !== undefined && businessId > 0n
  }, [businessId])

  // Read: Get full business info
  const { data: businessData, isLoading: isLoadingInfo, refetch: refetchBusinessInfo, error: businessInfoError } = useReadContract({
    address: getContractAddress(chainId, 'businessRegistry') as `0x${string}`,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusiness',
    args: businessId && businessId > 0n ? [businessId] : undefined,
    query: {
      enabled: !!businessId && businessId > 0n,
      retry: 3,
      retryDelay: 1000,
      staleTime: 30_000,
      gcTime: 60_000,
    },
  })

  // Write: Register business
  const {
    writeContract: registerBusiness,
    data: registerHash,
    isPending: isRegistering,
    error: registerError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  const handleRegisterBusiness = async (
    businessHash: `0x${string}`,
    businessURI: string
  ) => {
    if (!address) throw new Error('Wallet not connected')

    registerBusiness({
      address: getContractAddress(chainId, 'businessRegistry') as `0x${string}`,
      abi: BUSINESS_REGISTRY_ABI,
      functionName: 'registerBusiness',
      args: [businessHash, businessURI],
    })
  }

  return {
    // State
    isRegistered,
    businessId,
    businessInfo: businessData as Business | undefined,

    // Loading states
    isCheckingRegistration,
    isLoadingInfo,
    isRegistering: isRegistering || isConfirming,

    // Success states
    isRegistrationConfirmed: isConfirmed,

    // Errors
    registerError,
    registrationCheckError,
    businessInfoError,

    // Actions
    registerBusiness: handleRegisterBusiness,
    refetchRegistration,
    refetchBusinessInfo,
  }
}
