'use client'

import { useReadContract } from 'wagmi'
import { useState, useEffect } from 'react'
import { CONTRACTS } from '@/lib/contracts'
import { BUSINESS_REGISTRY_ABI, type Business, BusinessStatus } from '@/lib/abis/BusinessRegistry'

// Hook to fetch a specific business
export function useBusinessById(businessId: bigint | undefined) {
  const { data: businessData, isLoading, refetch } = useReadContract({
    address: CONTRACTS.businessRegistry,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusiness',
    args: businessId ? [businessId] : undefined,
    query: {
      enabled: !!businessId && businessId > 0n,
    },
  })

  const business = businessData ? (businessData as Business) : null

  return {
    business,
    isLoading,
    refetch,
  }
}

// Hook to fetch multiple businesses in a range
export function useBusinessList(startId: number = 1, count: number = 10) {
  const [businesses, setBusinesses] = useState<(Business & { id: bigint })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function fetchBusinesses() {
      setIsLoading(true)
      const fetchedBusinesses: (Business & { id: bigint })[] = []

      // Try to fetch businesses from startId to startId+count
      for (let i = startId; i < startId + count; i++) {
        try {
          // This is a workaround - in production, you'd use a subgraph or backend
          // For now, we'll just check the first 10 IDs
          const response = await fetch(`/api/business/${i}`)
          if (response.ok) {
            const business = await response.json()
            fetchedBusinesses.push({ ...business, id: BigInt(i) })
          }
        } catch (error) {
          // Business doesn't exist, skip
          console.log(`Business ${i} not found`)
        }
      }

      setBusinesses(fetchedBusinesses)
      setPendingCount(fetchedBusinesses.filter(b => b.status === BusinessStatus.PENDING).length)
      setIsLoading(false)
    }

    fetchBusinesses()
  }, [startId, count])

  return {
    businesses,
    pendingBusinesses: businesses.filter(b => b.status === BusinessStatus.PENDING),
    pendingCount,
    isLoading,
  }
}

// Simpler hook - just returns mock data for now since we can't efficiently query all businesses
export function usePendingBusinesses() {
  // In production, this would query a subgraph or backend API
  // For now, we'll return empty and let users search by ID
  const [pendingIds] = useState<bigint[]>([])

  return {
    pendingIds,
    pendingCount: pendingIds.length,
    isLoading: false,
  }
}
