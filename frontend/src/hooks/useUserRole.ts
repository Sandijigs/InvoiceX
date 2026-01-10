import { useAccount } from 'wagmi'
import { useBusinessRegistry } from './useBusinessRegistry'
import { useAllUserPositions } from './useUserPosition'
import { useMemo } from 'react'

export type UserRole = 'business' | 'investor' | 'both' | 'none'

export function useUserRole() {
  const { address, isConnected } = useAccount()
  const { isRegistered: isBusiness, isCheckingRegistration } = useBusinessRegistry()
  const { totalMetrics, isLoading: isLoadingPositions } = useAllUserPositions()

  const role = useMemo<UserRole>(() => {
    if (!isConnected || !address) return 'none'

    const hasInvestorPosition = totalMetrics.hasAnyPosition

    if (isBusiness && hasInvestorPosition) return 'both'
    if (isBusiness) return 'business'
    if (hasInvestorPosition) return 'investor'

    return 'none'
  }, [isConnected, address, isBusiness, totalMetrics.hasAnyPosition])

  const isLoading = isCheckingRegistration || isLoadingPositions

  return {
    role,
    isBusiness,
    isInvestor: totalMetrics.hasAnyPosition,
    isBoth: role === 'both',
    isNewUser: role === 'none',
    isLoading,
  }
}
