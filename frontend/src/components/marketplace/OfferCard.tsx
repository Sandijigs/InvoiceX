'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle, User } from 'lucide-react'
import { type Offer, OfferStatus } from '@/lib/abis/InvoiceMarketplace'
import { formatUnits } from 'viem'
import { useListing } from '@/hooks/useListing'

interface OfferCardProps {
  offer: Offer
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
  isLoading?: boolean
  userAddress?: string
}

export function OfferCard({ offer, onAccept, onReject, onCancel, isLoading, userAddress }: OfferCardProps) {
  const { listing } = useListing(offer.listingId)

  const formatPrice = (price: bigint) => {
    const formatted = formatUnits(price, 6)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(parseFloat(formatted))
  }

  const getTimeRemaining = () => {
    const expiryTime = Number(offer.expiresAt) * 1000
    const now = Date.now()
    const diff = expiryTime - now

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const getStatusBadge = () => {
    switch (offer.status) {
      case OfferStatus.PENDING:
        return <Badge className="bg-yellow-500">Pending</Badge>
      case OfferStatus.ACCEPTED:
        return <Badge className="bg-green-500">Accepted</Badge>
      case OfferStatus.REJECTED:
        return <Badge variant="destructive">Rejected</Badge>
      case OfferStatus.CANCELLED:
        return <Badge variant="secondary">Cancelled</Badge>
      case OfferStatus.EXPIRED:
        return <Badge variant="secondary">Expired</Badge>
      default:
        return null
    }
  }

  const isSeller = userAddress && listing?.seller.toLowerCase() === userAddress.toLowerCase()
  const isBuyer = userAddress && offer.buyer.toLowerCase() === userAddress.toLowerCase()
  const canAccept = isSeller && offer.status === OfferStatus.PENDING
  const canReject = isSeller && offer.status === OfferStatus.PENDING
  const canCancel = isBuyer && offer.status === OfferStatus.PENDING

  return (
    <Card className="border-emerald-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Offer #{offer.offerId.toString()}</p>
            <h3 className="font-semibold text-lg mt-1">
              Listing #{offer.listingId.toString()}
            </h3>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Offer Price</p>
            <p className="font-bold text-emerald-600">{formatPrice(offer.offerPrice)}</p>
          </div>
          {listing && (
            <div>
              <p className="text-xs text-muted-foreground">Ask Price</p>
              <p className="font-semibold text-sm">{formatPrice(listing.askPrice)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm bg-emerald-50 p-2 rounded">
          <User className="h-4 w-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {isBuyer ? 'Your Offer' : 'From'}
            </p>
            <p className="font-mono text-xs">
              {offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}
            </p>
          </div>
        </div>

        {offer.status === OfferStatus.PENDING && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{getTimeRemaining()} remaining</span>
          </div>
        )}

        <div className="pt-2 border-t space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Offered At</span>
            <span className="font-medium">
              {new Date(Number(offer.offeredAt) * 1000).toLocaleDateString()}
            </span>
          </div>
          {listing && listing.askPrice > BigInt(0) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">% of Ask</span>
              <span className="font-medium">
                {((Number(formatUnits(offer.offerPrice, 6)) /
                  Number(formatUnits(listing.askPrice, 6))) *
                  100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {(canAccept || canReject || canCancel) && (
        <CardFooter className="flex gap-2">
          {canAccept && onAccept && (
            <Button
              onClick={onAccept}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isLoading ? 'Accepting...' : 'Accept'}
            </Button>
          )}
          {canReject && onReject && (
            <Button
              onClick={onReject}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-red-200 hover:bg-red-50 text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              onClick={onCancel}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {isLoading ? 'Cancelling...' : 'Cancel Offer'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
