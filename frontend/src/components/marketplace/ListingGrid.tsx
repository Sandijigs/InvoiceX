'use client'

import { type Listing } from '@/lib/abis/InvoiceMarketplace'
import { ListingCard } from './ListingCard'

interface ListingGridProps {
  listings: Listing[]
  onBuyNow?: (listingId: bigint) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function ListingGrid({ listings, onBuyNow, isLoading, emptyMessage }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage || 'No listings available'}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <ListingCard
          key={listing.listingId.toString()}
          listing={listing}
          onBuyNow={onBuyNow ? () => onBuyNow(listing.listingId) : undefined}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
