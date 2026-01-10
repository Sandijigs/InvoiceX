'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, ArrowLeft, Gavel } from 'lucide-react'
import { AuctionGrid } from '@/components/marketplace/AuctionGrid'
import { useActiveAuctions, useAuction } from '@/hooks/useAuction'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuctionsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { auctionIds, isLoading } = useActiveAuctions()

  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all auctions (simplified - in production you'd paginate)
  const auctions = auctionIds.map((id) => {
    const { auction } = useAuction(id)
    return auction
  }).filter((a) => a !== null)

  const filteredAuctions = auctions.filter((auction) => {
    if (searchQuery && auction) {
      const query = searchQuery.toLowerCase()
      return (
        auction.invoiceId.toString().includes(query) ||
        auction.seller.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Active Auctions
            </h1>
            <p className="text-muted-foreground mt-2">
              Bid on invoice tokens and win at the best price
            </p>
          </div>
          <Link href="/marketplace/create-auction">
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              <Gavel className="mr-2 h-4 w-4" />
              Create Auction
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice ID or seller address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="border-orange-200">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-orange-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Auctions</p>
          <p className="text-2xl font-bold text-orange-600">
            {isLoading ? '...' : auctionIds.length}
          </p>
        </div>
        <div className="bg-white border border-orange-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Bids</p>
          <p className="text-2xl font-bold text-orange-600">
            {auctions.filter((a) => a && a.highestBid > BigInt(0)).length}
          </p>
        </div>
        <div className="bg-white border border-orange-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Ending Soon</p>
          <p className="text-2xl font-bold text-orange-600">
            {auctions.filter((a) => {
              if (!a) return false
              const timeLeft = Number(a.endsAt) * 1000 - Date.now()
              return timeLeft < 24 * 60 * 60 * 1000 && timeLeft > 0
            }).length}
          </p>
        </div>
        <div className="bg-white border border-orange-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Reserve Met</p>
          <p className="text-2xl font-bold text-orange-600">
            {auctions.filter((a) => a && a.highestBid >= a.reservePrice).length}
          </p>
        </div>
      </div>

      {/* Auctions Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading auctions...</p>
        </div>
      ) : (
        <AuctionGrid
          auctions={filteredAuctions as any}
          emptyMessage="No active auctions found. Be the first to create one!"
        />
      )}
    </div>
  )
}
