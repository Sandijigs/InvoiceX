'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ShoppingCart, Tag, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { type Listing, ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import { formatUnits } from 'viem'
import { useInvoice } from '@/hooks/useInvoice'

interface ListingCardProps {
  listing: Listing
  onBuyNow?: () => void
  isLoading?: boolean
}

export function ListingCard({ listing, onBuyNow, isLoading }: ListingCardProps) {
  const { invoice } = useInvoice(listing.invoiceId)

  const formatPrice = (price: bigint) => {
    const formatted = formatUnits(price, 6)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(parseFloat(formatted))
  }

  const getTimeRemaining = () => {
    const expiryTime = Number(listing.expiresAt) * 1000
    const now = Date.now()
    const diff = expiryTime - now

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const getStatusBadge = () => {
    switch (listing.status) {
      case ListingStatus.ACTIVE:
        return <Badge className="bg-green-500">Active</Badge>
      case ListingStatus.SOLD:
        return <Badge className="bg-blue-500">Sold</Badge>
      case ListingStatus.CANCELLED:
        return <Badge>Cancelled</Badge>
      case ListingStatus.EXPIRED:
        return <Badge>Expired</Badge>
      default:
        return null
    }
  }

  const discount = listing.askPrice > BigInt(0)
    ? ((Number(invoice?.amount || 0) - Number(formatUnits(listing.askPrice, 6))) /
        Number(invoice?.amount || 1)) *
      100
    : 0

  return (
    <Card className="hover:shadow-lg transition-shadow border-emerald-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Invoice #{listing.invoiceId.toString()}</p>
            <h3 className="font-semibold text-lg mt-1">
              {invoice?.businessName || 'Loading...'}
            </h3>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Ask Price</p>
            <p className="font-bold text-emerald-600">{formatPrice(listing.askPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Min Price</p>
            <p className="font-semibold text-sm">{formatPrice(listing.minPrice)}</p>
          </div>
        </div>

        {invoice && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-600 font-medium">
              {discount.toFixed(1)}% discount
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{getTimeRemaining()} remaining</span>
        </div>

        {invoice && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Face Value</span>
              <span className="font-medium">${invoice.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">
                {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link href={`/marketplace/listing/${listing.listingId}`} className="flex-1">
          <Button variant="outline" className="w-full border-emerald-200 hover:bg-emerald-50">
            <Tag className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
        {listing.status === ListingStatus.ACTIVE && onBuyNow && (
          <Button
            onClick={onBuyNow}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Buy Now'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
