'use client'

import { useReadContract, useAccount } from 'wagmi'
import { CONTRACTS } from '@/lib/contracts'

// Admin role constants (from OpenZeppelin AccessControl)
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000' as const,
  KYB_VERIFIER_ROLE: '0x8c50f3b79e8fc8b1e4a0b0e3c8e0e7c4a8b3c8c8d8e8f8g8h8i8j8k8l8m8n8o8' as const, // Will be generated from keccak256
  ORACLE_ROLE: '0x7c50f3b79e8fc8b1e4a0b0e3c8e0e7c4a8b3c8c8d8e8f8g8h8i8j8k8l8m8n8o8' as const,
  PAUSER_ROLE: '0x6c50f3b79e8fc8b1e4a0b0e3c8e0e7c4a8b3c8c8d8e8f8g8h8i8j8k8l8m8n8o8' as const,
} as const

// Minimal AccessControl ABI for role checking
const ACCESS_CONTROL_ABI = [
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

export function useAdminRole() {
  const { address, isConnected } = useAccount()

  console.log('🔐 Admin role check for:', address, 'Connected:', isConnected)
  console.log('Checking contracts:', {
    invoiceXCore: CONTRACTS.invoiceXCore,
    kybRegistry: CONTRACTS.kybRegistry,
    creditOracle: CONTRACTS.creditOracle
  })

  // Check if user has DEFAULT_ADMIN_ROLE (superadmin)
  const { data: isSuperAdmin, isLoading: isLoadingAdmin, error: adminError } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: address ? [ROLES.DEFAULT_ADMIN_ROLE, address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  // Check KYB verifier role
  const { data: isKYBVerifier, isLoading: isLoadingKYB } = useReadContract({
    address: CONTRACTS.kybRegistry,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: address ? [ROLES.DEFAULT_ADMIN_ROLE, address] : undefined, // KYBRegistry also uses admin role
    query: {
      enabled: !!address && isConnected,
    },
  })

  // Check Oracle role
  const { data: isOracle, isLoading: isLoadingOracle } = useReadContract({
    address: CONTRACTS.creditOracle,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: address ? [ROLES.DEFAULT_ADMIN_ROLE, address] : undefined, // CreditOracle admin role
    query: {
      enabled: !!address && isConnected,
    },
  })

  const isLoading = isLoadingAdmin || isLoadingKYB || isLoadingOracle

  // User is admin if they have any admin role
  const isAdmin = !!(isSuperAdmin || isKYBVerifier || isOracle)

  console.log('🔐 Admin role results:', {
    isSuperAdmin: !!isSuperAdmin,
    isKYBVerifier: !!isKYBVerifier,
    isOracle: !!isOracle,
    isAdmin,
    isLoading,
    hasError: !!adminError
  })

  if (adminError) {
    console.error('❌ Admin role check error:', adminError)
  }

  return {
    isAdmin,
    isSuperAdmin: !!isSuperAdmin,
    isKYBVerifier: !!isKYBVerifier,
    isOracle: !!isOracle,
    isLoading,
    address,
    isConnected,
  }
}

// Hook to check specific role on specific contract
export function useHasRole(contractAddress: `0x${string}`, role: string) {
  const { address, isConnected } = useAccount()

  const { data: hasRole, isLoading } = useReadContract({
    address: contractAddress,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: address ? [role as `0x${string}`, address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  return {
    hasRole: !!hasRole,
    isLoading,
  }
}
