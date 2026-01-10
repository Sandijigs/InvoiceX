'use client'

import { useAccount } from 'wagmi'
import { useMarketplace } from '@/hooks/useMarketplace'
import { useListings } from '@/hooks/useListing'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus } from 'lucide-react'
import { ListingGrid } from '@/components/marketplace/ListingGrid'
import { ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function MyListingsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { useSellerListings } = useMarketplace()
  const { data: listingIds, isLoading } = useSellerListings(address)
  const { listings } = useListings((listingIds as bigint[]) || [])

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to view your listings
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const activeListings = listings.filter((l) => l.status === ListingStatus.ACTIVE)
  const soldListings = listings.filter((l) => l.status === ListingStatus.SOLD)
  const inactiveListings = listings.filter(
    (l) => l.status === ListingStatus.CANCELLED || l.status === ListingStatus.EXPIRED
  )

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              My Listings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your invoice listings
            </p>
          </div>
          <Link href="/marketplace/create">
            <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Listings</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : activeListings.length}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Sold</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : soldListings.length}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Listings</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : listings.length}
          </p>
        </div>
      </div>

      {/* Listings Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-emerald-50">
          <TabsTrigger value="active">
            Active ({activeListings.length})
          </TabsTrigger>
          <TabsTrigger value="sold">
            Sold ({soldListings.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveListings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={activeListings}
              emptyMessage="You don't have any active listings. Create one to get started!"
            />
          )}
        </TabsContent>

        <TabsContent value="sold">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading sold listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={soldListings}
              emptyMessage="You haven't sold any listings yet"
            />
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading inactive listings...</p>
            </div>
          ) : (
            <ListingGrid
              listings={inactiveListings}
              emptyMessage="No cancelled or expired listings"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
