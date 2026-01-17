'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback } from 'react'
import { INVOICE_MARKETPLACE_ABI, type Offer, OfferStatus } from '@/lib/abis/InvoiceMarketplace'
import { CONTRACTS } from '@/lib/contracts'
import { parseUnits, formatUnits } from 'viem'

export function useOffers(offerId?: bigint) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get offer details
  const {
    data: offerData,
    isLoading: isLoadingOffer,
    error: offerError,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getOffer',
    args: offerId !== undefined ? [offerId] : undefined,
    query: {
      enabled: offerId !== undefined,
    },
  })

  // Parse offer data
  const offer = offerData
    ? {
        offerId: (offerData as any)[0] as bigint,
        listingId: (offerData as any)[1] as bigint,
        buyer: (offerData as any)[2] as string,
        offerPrice: (offerData as any)[3] as bigint,
        offeredAt: (offerData as any)[4] as bigint,
        expiresAt: (offerData as any)[5] as bigint,
        status: (offerData as any)[6] as OfferStatus,
      }
    : null

  // Write contract hook
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Make offer
  const makeOffer = useCallback(
    async (listingId: bigint, offerPrice: string, validityDays: number) => {
      try {
        setIsLoading(true)
        setError(null)

        const offerPriceBigInt = parseUnits(offerPrice, 6)

        console.log('💵 Making offer...', {
          listingId: listingId.toString(),
          offerPrice,
          validityDays,
        })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'makeOffer',
          args: [listingId, offerPriceBigInt, BigInt(validityDays)],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error making offer:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Accept offer
  const acceptOffer = useCallback(
    async (offerIdArg: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('✅ Accepting offer...', { offerId: offerIdArg.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'acceptOffer',
          args: [offerIdArg],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error accepting offer:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Reject offer
  const rejectOffer = useCallback(
    async (offerIdArg: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('❌ Rejecting offer...', { offerId: offerIdArg.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'rejectOffer',
          args: [offerIdArg],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error rejecting offer:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Cancel offer
  const cancelOffer = useCallback(
    async (offerIdArg: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🚫 Cancelling offer...', { offerId: offerIdArg.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'cancelOffer',
          args: [offerIdArg],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error cancelling offer:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Helper functions
  const formatPrice = (price: bigint) => formatUnits(price, 6)

  const isPending = offer?.status === OfferStatus.PENDING
  const isAccepted = offer?.status === OfferStatus.ACCEPTED
  const isRejected = offer?.status === OfferStatus.REJECTED
  const isCancelled = offer?.status === OfferStatus.CANCELLED
  const isExpired =
    offer?.status === OfferStatus.EXPIRED || (offer ? Number(offer.expiresAt) * 1000 < Date.now() : false)

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!offer) return null

    const expiryTime = Number(offer.expiresAt) * 1000
    const now = Date.now()
    const diff = expiryTime - now

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes, expired: false }
  }

  return {
    offer,
    isLoading: isLoading || isLoadingOffer || isPending || isConfirming,
    isSuccess,
    error: error || offerError,
    hash,
    refetch,

    // Actions
    makeOffer,
    acceptOffer,
    rejectOffer,
    cancelOffer,

    // Computed properties
    offerPriceFormatted: offer ? formatPrice(offer.offerPrice) : '0',
    isPending,
    isAccepted,
    isRejected,
    isCancelled,
    isExpired,
    timeRemaining: getTimeRemaining(),

    // Helper to check if user is buyer
    isBuyer: (address?: string) => {
      if (!offer || !address) return false
      return offer.buyer.toLowerCase() === address.toLowerCase()
    },
  }
}

// Hook to get listing offers
export function useListingOffers(listingId?: bigint) {
  const {
    data: offerIds,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getListingOffers',
    args: listingId !== undefined ? [listingId] : undefined,
    query: {
      enabled: listingId !== undefined,
    },
  })

  return {
    offerIds: (offerIds as bigint[]) || [],
    isLoading,
    refetch,
  }
}

// Hook to get buyer offers
export function useBuyerOffers(buyerAddress?: `0x${string}`) {
  const {
    data: offerIds,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getBuyerOffers',
    args: buyerAddress ? [buyerAddress] : undefined,
    query: {
      enabled: !!buyerAddress,
    },
  })

  return {
    offerIds: (offerIds as bigint[]) || [],
    isLoading,
    refetch,
  }
}
