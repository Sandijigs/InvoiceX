'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback } from 'react'
import { INVOICE_MARKETPLACE_ABI, type Auction, AuctionStatus } from '@/lib/abis/InvoiceMarketplace'
import { CONTRACTS } from '@/lib/contracts'
import { parseUnits, formatUnits } from 'viem'

export function useAuction(auctionId?: bigint) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get auction details
  const {
    data: auctionData,
    isLoading: isLoadingAuction,
    error: auctionError,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getAuction',
    args: auctionId !== undefined ? [auctionId] : undefined,
    query: {
      enabled: auctionId !== undefined,
    },
  })

  // Parse auction data
  const auction = auctionData
    ? {
        auctionId: (auctionData as any)[0] as bigint,
        invoiceId: (auctionData as any)[1] as bigint,
        seller: (auctionData as any)[2] as string,
        startPrice: (auctionData as any)[3] as bigint,
        reservePrice: (auctionData as any)[4] as bigint,
        highestBid: (auctionData as any)[5] as bigint,
        highestBidder: (auctionData as any)[6] as string,
        startedAt: (auctionData as any)[7] as bigint,
        endsAt: (auctionData as any)[8] as bigint,
        status: (auctionData as any)[9] as AuctionStatus,
      }
    : null

  // Write contract hook
  const { writeContract, data: hash, isPending } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Create auction
  const createAuction = useCallback(
    async (invoiceId: bigint, startPrice: string, reservePrice: string, durationDays: number) => {
      try {
        setIsLoading(true)
        setError(null)

        const startPriceBigInt = parseUnits(startPrice, 6)
        const reservePriceBigInt = parseUnits(reservePrice, 6)

        console.log('🔨 Creating auction...', {
          invoiceId: invoiceId.toString(),
          startPrice,
          reservePrice,
          durationDays,
        })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'createAuction',
          args: [invoiceId, startPriceBigInt, reservePriceBigInt, BigInt(durationDays)],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error creating auction:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Place bid
  const placeBid = useCallback(
    async (auctionIdArg: bigint, bidAmount: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const bidAmountBigInt = parseUnits(bidAmount, 6)

        console.log('💰 Placing bid...', {
          auctionId: auctionIdArg.toString(),
          bidAmount,
        })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'placeBid',
          args: [auctionIdArg, bidAmountBigInt],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error placing bid:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // End auction
  const endAuction = useCallback(
    async (auctionIdArg: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🏁 Ending auction...', { auctionId: auctionIdArg.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'endAuction',
          args: [auctionIdArg],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error ending auction:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Cancel auction
  const cancelAuction = useCallback(
    async (auctionIdArg: bigint) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('❌ Cancelling auction...', { auctionId: auctionIdArg.toString() })

        writeContract({
          address: CONTRACTS.InvoiceMarketplace,
          abi: INVOICE_MARKETPLACE_ABI,
          functionName: 'cancelAuction',
          args: [auctionIdArg],
        })
      } catch (err) {
        const error = err as Error
        console.error('Error cancelling auction:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  // Helper functions
  const formatPrice = (price: bigint) => formatUnits(price, 6)

  const isActive = auction?.status === AuctionStatus.ACTIVE
  const hasEnded =
    auction?.status === AuctionStatus.ENDED_WITH_SALE ||
    auction?.status === AuctionStatus.ENDED_NO_SALE
  const isCancelled = auction?.status === AuctionStatus.CANCELLED
  const hasExpired = auction ? Number(auction.endsAt) * 1000 < Date.now() : false
  const hasBids = auction ? auction.highestBid > BigInt(0) : false
  const reserveMet = auction ? auction.highestBid >= auction.reservePrice : false

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!auction) return null

    const endTime = Number(auction.endsAt) * 1000
    const now = Date.now()
    const diff = endTime - now

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds, expired: false }
  }

  return {
    auction,
    isLoading: isLoading || isLoadingAuction || isPending || isConfirming,
    isSuccess,
    error: error || auctionError,
    hash,
    refetch,

    // Actions
    createAuction,
    placeBid,
    endAuction,
    cancelAuction,

    // Computed properties
    startPriceFormatted: auction ? formatPrice(auction.startPrice) : '0',
    reservePriceFormatted: auction ? formatPrice(auction.reservePrice) : '0',
    highestBidFormatted: auction ? formatPrice(auction.highestBid) : '0',
    isActive,
    hasEnded,
    isCancelled,
    hasExpired,
    hasBids,
    reserveMet,
    timeRemaining: getTimeRemaining(),

    // Helper to check if user is seller or highest bidder
    isSeller: (address?: string) => {
      if (!auction || !address) return false
      return auction.seller.toLowerCase() === address.toLowerCase()
    },
    isHighestBidder: (address?: string) => {
      if (!auction || !address || !hasBids) return false
      return auction.highestBidder.toLowerCase() === address.toLowerCase()
    },
  }
}

// Hook to get active auctions
export function useActiveAuctions() {
  const {
    data: auctionIds,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceMarketplace,
    abi: INVOICE_MARKETPLACE_ABI,
    functionName: 'getActiveAuctions',
  })

  return {
    auctionIds: (auctionIds as bigint[]) || [],
    isLoading,
    refetch,
  }
}
