'use client'

import { useReadContract } from 'wagmi'
import { INVOICE_MARKETPLACE_ABI, type Listing, ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import { CONTRACTS } from '@/lib/contracts'
import { formatUnits } from 'viem'

export function useListing(listingId?: bigint) {
  // Get listing details
  const {
    data: listingData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getListing',
    args: listingId !== undefined ? [listingId] : undefined,
    query: {
      enabled: listingId !== undefined,
    },
  })

  // Parse listing data
  const listing = listingData
    ? {
        listingId: (listingData as any)[0] as bigint,
        invoiceId: (listingData as any)[1] as bigint,
        seller: (listingData as any)[2] as string,
        askPrice: (listingData as any)[3] as bigint,
        minPrice: (listingData as any)[4] as bigint,
        listedAt: (listingData as any)[5] as bigint,
        expiresAt: (listingData as any)[6] as bigint,
        status: (listingData as any)[7] as ListingStatus,
      }
    : null

  // Helper functions for formatting
  const formatPrice = (price: bigint) => formatUnits(price, 6) // USDT has 6 decimals

  const isActive = listing?.status === ListingStatus.ACTIVE
  const isExpired = listing ? Number(listing.expiresAt) * 1000 < Date.now() : false
  const isSold = listing?.status === ListingStatus.SOLD
  const isCancelled = listing?.status === ListingStatus.CANCELLED

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!listing) return null

    const expiryTime = Number(listing.expiresAt) * 1000
    const now = Date.now()
    const diff = expiryTime - now

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes, expired: false }
  }

  return {
    listing,
    isLoading,
    error,
    refetch,

    // Computed properties
    askPriceFormatted: listing ? formatPrice(listing.askPrice) : '0',
    minPriceFormatted: listing ? formatPrice(listing.minPrice) : '0',
    isActive,
    isExpired,
    isSold,
    isCancelled,
    timeRemaining: getTimeRemaining(),

    // Helper to check if user is seller
    isSeller: (address?: string) => {
      if (!listing || !address) return false
      return listing.seller.toLowerCase() === address.toLowerCase()
    },
  }
}

// Hook to fetch multiple listings at once
export function useListings(listingIds: bigint[]) {
  const listings = listingIds.map((id) => useListing(id))

  return {
    listings: listings.map((l) => l.listing).filter((l) => l !== null) as Listing[],
    isLoading: listings.some((l) => l.isLoading),
    error: listings.find((l) => l.error)?.error,
    refetchAll: () => listings.forEach((l) => l.refetch()),
  }
}
