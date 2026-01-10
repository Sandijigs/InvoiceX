'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback } from 'react'
import { INVOICE_MARKETPLACE_ABI, type Listing } from '@/lib/abis/InvoiceMarketplace'
import { CONTRACTS } from '@/lib/contracts'
import { parseUnits } from 'viem'

export function useMarketplace() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get active listings
  const {
    data: activeListingIds,
    isLoading: isLoadingListings,
    refetch: refetchActiveListings,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getActiveListings',
  })

  // Get protocol fee
  const { data: protocolFeeBps } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'protocolFeeBps',
  })

  // Write contract hook
  const { writeContract, data: hash, isPending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Create listing
  const createListing = useCallback(
    async (invoiceId: bigint, askPrice: string, minPrice: string, durationDays: number) => {
      try {
        setIsLoading(true)
        setError(null)

        const askPriceBigInt = parseUnits(askPrice, 6) // USDT has 6 decimals
        const minPriceBigInt = parseUnits(minPrice, 6)

        console.log('📝 Creating listing...', {
          invoiceId: invoiceId.toString(),
          askPrice,
          minPrice,
          durationDays,
        })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'createListing',
          args: [invoiceId, askPriceBigInt, minPriceBigInt, BigInt(durationDays)],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error creating listing:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Buy now
  const buyNow = useCallback(
    async (listingId: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('💰 Buying listing...', { listingId: listingId.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'buyNow',
          args: [listingId],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error buying listing:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Cancel listing
  const cancelListing = useCallback(
    async (listingId: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('❌ Cancelling listing...', { listingId: listingId.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'cancelListing',
          args: [listingId],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error cancelling listing:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Update listing
  const updateListing = useCallback(
    async (listingId: bigint, newAskPrice: string, newMinPrice: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const newAskPriceBigInt = parseUnits(newAskPrice, 6)
        const newMinPriceBigInt = parseUnits(newMinPrice, 6)

        console.log('✏️ Updating listing...', {
          listingId: listingId.toString(),
          newAskPrice,
          newMinPrice,
        })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'updateListing',
          args: [listingId, newAskPriceBigInt, newMinPriceBigInt],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error updating listing:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Get seller listings
  const useSellerListings = (sellerAddress?: `0x${string}`) => {
    return useReadContract({
      address: CONTRACTS.InvoiceMarketplace,
      abi: INVOICE_MARKETPLACE_ABI,
      functionName: 'getSellerListings',
      args: sellerAddress ? [sellerAddress] : undefined,
      query: {
        enabled: !!sellerAddress,
      },
    })
  }

  return {
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    hash,

    // Data
    activeListingIds: (activeListingIds as bigint[]) || [],
    protocolFeeBps: (protocolFeeBps as bigint) || BigInt(0),
    isLoadingListings,

    // Actions
    createListing,
    buyNow,
    cancelListing,
    updateListing,
    refetchActiveListings,
    useSellerListings,
  }
}
