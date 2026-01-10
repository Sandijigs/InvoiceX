'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, TrendingUp, ShoppingBag } from 'lucide-react'
import { ListingGrid } from '@/components/marketplace/ListingGrid'
import { useMarketplace } from '@/hooks/useMarketplace'
import { useListings } from '@/hooks/useListing'
import { type Listing, ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import Link from 'next/link'

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { activeListingIds, isLoadingListings, buyNow, isLoading } = useMarketplace()
  const { listings: allListings, isLoading: isLoadingListingData } = useListings(activeListingIds)

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])

  // Filter listings based on search
  useEffect(() => {
    if (!allListings) return

    const filtered = allListings.filter((listing) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          listing.invoiceId.toString().includes(query) ||
          listing.seller.toLowerCase().includes(query)
        )
      }
      return true
    })

    setFilteredListings(filtered)
  }, [allListings, searchQuery])

  const handleBuyNow = async (listingId: bigint) => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    try {
      await buyNow(listingId)
    } catch (error) {
      console.error('Error buying listing:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Invoice Marketplace
            </h1>
            <p className="text-muted-foreground mt-2">
              Trade invoice tokens at discounted rates
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/marketplace/auctions">
              <Button variant="outline" className="border-emerald-200">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Auctions
              </Button>
            </Link>
            <Link href="/marketplace/create">
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Create Listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
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
          <Button variant="outline" className="border-emerald-200">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Listings</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoadingListings ? '...' : activeListingIds.length}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Sellers</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoadingListingData ? '...' : new Set(allListings.map(l => l.seller)).size}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg Discount</p>
          <p className="text-2xl font-bold text-emerald-600">~15%</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Volume (24h)</p>
          <p className="text-2xl font-bold text-emerald-600">$0</p>
        </div>
      </div>

      {/* Listings Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-emerald-50">
          <TabsTrigger value="all">All Listings</TabsTrigger>
          <TabsTrigger value="recent">Recently Listed</TabsTrigger>
          <TabsTrigger value="ending">Ending Soon</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoadingListings || isLoadingListingData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={filteredListings}
              onBuyNow={handleBuyNow}
              isLoading={isLoading}
              emptyMessage="No active listings found. Be the first to list an invoice!"
            />
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {isLoadingListings || isLoadingListingData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={[...filteredListings]
                .sort((a, b) => Number(b.listedAt) - Number(a.listedAt))
                .slice(0, 12)}
              onBuyNow={handleBuyNow}
              isLoading={isLoading}
              emptyMessage="No recent listings"
            />
          )}
        </TabsContent>

        <TabsContent value="ending" className="space-y-4">
          {isLoadingListings || isLoadingListingData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={[...filteredListings]
                .sort((a, b) => Number(a.expiresAt) - Number(b.expiresAt))
                .slice(0, 12)}
              onBuyNow={handleBuyNow}
              isLoading={isLoading}
              emptyMessage="No listings ending soon"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
