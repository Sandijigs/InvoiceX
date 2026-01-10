'use client'

import { useAccount } from 'wagmi'
import { useBuyerOffers, useOffers } from '@/hooks/useOffers'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { OfferCard } from '@/components/marketplace/OfferCard'
import { OfferStatus } from '@/lib/abis/InvoiceMarketplace'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function MyOffersPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { offerIds, isLoading } = useBuyerOffers(address)
  const { cancelOffer, isLoading: isProcessing } = useOffers()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to view your offers
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Fetch all offers
  const offers = offerIds.map((id) => {
    const { offer } = useOffers(id)
    return offer
  }).filter((o) => o !== null)

  const pendingOffers = offers.filter((o) => o && o.status === OfferStatus.PENDING)
  const acceptedOffers = offers.filter((o) => o && o.status === OfferStatus.ACCEPTED)
  const otherOffers = offers.filter(
    (o) =>
      o &&
      (o.status === OfferStatus.REJECTED ||
        o.status === OfferStatus.CANCELLED ||
        o.status === OfferStatus.EXPIRED)
  )

  const handleCancelOffer = async (offerId: bigint) => {
    if (!confirm('Are you sure you want to cancel this offer?')) return
    await cancelOffer(offerId)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
          My Offers
        </h1>
        <p className="text-muted-foreground mt-2">
          Track and manage your offers on marketplace listings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending Offers</p>
          <p className="text-2xl font-bold text-yellow-600">
            {isLoading ? '...' : pendingOffers.length}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Accepted Offers</p>
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : acceptedOffers.length}
          </p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Offers</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : offers.length}
          </p>
        </div>
      </div>

      {/* Offers Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-emerald-50">
          <TabsTrigger value="pending">
            Pending ({pendingOffers.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedOffers.length})
          </TabsTrigger>
          <TabsTrigger value="other">
            Other ({otherOffers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your offers...</p>
            </div>
          ) : pendingOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You don't have any pending offers
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingOffers.map((offer) => (
                <OfferCard
                  key={offer!.offerId.toString()}
                  offer={offer!}
                  onCancel={() => handleCancelOffer(offer!.offerId)}
                  isLoading={isProcessing}
                  userAddress={address}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading accepted offers...</p>
            </div>
          ) : acceptedOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No offers have been accepted yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedOffers.map((offer) => (
                <OfferCard
                  key={offer!.offerId.toString()}
                  offer={offer!}
                  userAddress={address}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading offers...</p>
            </div>
          ) : otherOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No rejected, cancelled, or expired offers
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherOffers.map((offer) => (
                <OfferCard
                  key={offer!.offerId.toString()}
                  offer={offer!}
                  userAddress={address}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
