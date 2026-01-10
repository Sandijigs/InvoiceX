'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useListing } from '@/hooks/useListing'
import { useInvoice } from '@/hooks/useInvoice'
import { useMarketplace } from '@/hooks/useMarketplace'
import { useOffers, useListingOffers } from '@/hooks/useOffers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  ShoppingCart,
  Tag,
  Clock,
  Building2,
  Calendar,
  DollarSign,
  TrendingDown,
  AlertCircle,
} from 'lucide-react'
import { useState } from 'react'
import { OfferCard } from '@/components/marketplace/OfferCard'
import { ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import Link from 'next/link'

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listingId = BigInt(params.id as string)
  const { address, isConnected } = useAccount()

  const { listing, isLoading: isLoadingListing, isSeller } = useListing(listingId)
  const { invoice } = useInvoice(listing?.invoiceId)
  const { buyNow, cancelListing, updateListing, isLoading: isProcessing } = useMarketplace()
  const { makeOffer, acceptOffer, rejectOffer, isLoading: isOfferProcessing } = useOffers()
  const { offerIds } = useListingOffers(listingId)

  const [offerPrice, setOfferPrice] = useState('')
  const [offerValidity, setOfferValidity] = useState('7')
  const [newAskPrice, setNewAskPrice] = useState('')
  const [newMinPrice, setNewMinPrice] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  const handleBuyNow = async () => {
    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }
    await buyNow(listingId)
  }

  const handleMakeOffer = async () => {
    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }
    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      alert('Please enter a valid offer price')
      return
    }
    await makeOffer(listingId, offerPrice, parseInt(offerValidity))
    setOfferPrice('')
  }

  const handleUpdateListing = async () => {
    if (!newAskPrice || !newMinPrice) {
      alert('Please enter both prices')
      return
    }
    await updateListing(listingId, newAskPrice, newMinPrice)
    setIsEditMode(false)
  }

  const handleCancelListing = async () => {
    if (!confirm('Are you sure you want to cancel this listing?')) return
    await cancelListing(listingId)
  }

  if (isLoadingListing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center text-muted-foreground">Loading listing...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center text-muted-foreground">Listing not found</p>
      </div>
    )
  }

  const discount = listing.askPrice > BigInt(0) && invoice
    ? ((Number(invoice.amount) - parseFloat(listing.askPriceFormatted)) / Number(invoice.amount)) * 100
    : 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Invoice #{listing.invoiceId.toString()}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {invoice?.businessName || 'Loading...'}
                  </p>
                </div>
                <Badge
                  className={
                    listing.status === ListingStatus.ACTIVE
                      ? 'bg-green-500'
                      : listing.status === ListingStatus.SOLD
                      ? 'bg-blue-500'
                      : 'bg-gray-500'
                  }
                >
                  {ListingStatus[listing.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Ask Price</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${listing.askPriceFormatted}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Minimum Price</p>
                  <p className="text-2xl font-bold">${listing.minPriceFormatted}</p>
                </div>
              </div>

              {invoice && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded">
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-semibold">
                    {discount.toFixed(2)}% discount from face value
                  </span>
                </div>
              )}

              {/* Time Remaining */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {listing.isExpired
                    ? 'Listing expired'
                    : listing.timeRemaining
                    ? `${listing.timeRemaining.days}d ${listing.timeRemaining.hours}h ${listing.timeRemaining.minutes}m remaining`
                    : 'Loading...'}
                </span>
              </div>

              <Separator />

              {/* Invoice Details */}
              {invoice && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Face Value</p>
                      <p className="font-medium">${invoice.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Buyer</p>
                      <p className="font-mono text-xs">
                        {invoice.buyer.slice(0, 6)}...{invoice.buyer.slice(-4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{invoice.statusText}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offers Section */}
          {offerIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Offers ({offerIds.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offerIds.map((offerId) => (
                  <OfferCard
                    key={offerId.toString()}
                    offer={{ offerId } as any}
                    onAccept={() => acceptOffer(offerId)}
                    onReject={() => rejectOffer(offerId)}
                    isLoading={isOfferProcessing}
                    userAddress={address}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seller Controls */}
          {isSeller(address) && listing.status === ListingStatus.ACTIVE && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seller Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditMode ? (
                  <>
                    <Button
                      onClick={() => setIsEditMode(true)}
                      className="w-full"
                      variant="outline"
                    >
                      Update Prices
                    </Button>
                    <Button
                      onClick={handleCancelListing}
                      variant="destructive"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      Cancel Listing
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>New Ask Price ($)</Label>
                      <Input
                        type="number"
                        value={newAskPrice}
                        onChange={(e) => setNewAskPrice(e.target.value)}
                        placeholder={listing.askPriceFormatted}
                      />
                    </div>
                    <div>
                      <Label>New Min Price ($)</Label>
                      <Input
                        type="number"
                        value={newMinPrice}
                        onChange={(e) => setNewMinPrice(e.target.value)}
                        placeholder={listing.minPriceFormatted}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateListing} disabled={isProcessing} className="flex-1">
                        Update
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditMode(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Buy Now */}
          {!isSeller(address) && listing.status === ListingStatus.ACTIVE && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Purchase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleBuyNow}
                  disabled={!isConnected || isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : `Buy Now for $${listing.askPriceFormatted}`}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Make an Offer</h4>
                  <div>
                    <Label>Offer Price ($)</Label>
                    <Input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="Enter your offer"
                    />
                  </div>
                  <div>
                    <Label>Valid for (days)</Label>
                    <Input
                      type="number"
                      value={offerValidity}
                      onChange={(e) => setOfferValidity(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleMakeOffer}
                    disabled={!isConnected || isOfferProcessing || !offerPrice}
                    variant="outline"
                    className="w-full border-emerald-200"
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    {isOfferProcessing ? 'Submitting...' : 'Submit Offer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm break-all">{listing.seller}</p>
              <Link href={`/marketplace/seller/${listing.seller}`}>
                <Button variant="link" className="p-0 h-auto text-emerald-600">
                  View seller's listings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
