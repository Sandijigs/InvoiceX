'use client'

import { type Auction } from '@/lib/abis/InvoiceMarketplace'
import { AuctionCard } from './AuctionCard'

interface AuctionGridProps {
  auctions: Auction[]
  onPlaceBid?: (auctionId: bigint) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function AuctionGrid({ auctions, onPlaceBid, isLoading, emptyMessage }: AuctionGridProps) {
  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage || 'No auctions available'}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.auctionId.toString()}
          auction={auction}
          onPlaceBid={onPlaceBid ? () => onPlaceBid(auction.auctionId) : undefined}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
