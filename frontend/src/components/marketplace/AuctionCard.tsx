'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Gavel, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'
import { type Auction, AuctionStatus } from '@/lib/abis/InvoiceMarketplace'
import { formatUnits } from 'viem'
import { useInvoice } from '@/hooks/useInvoice'
import { useEffect, useState } from 'react'

interface AuctionCardProps {
  auction: Auction
  onPlaceBid?: () => void
  isLoading?: boolean
}

export function AuctionCard({ auction, onPlaceBid, isLoading }: AuctionCardProps) {
  const { invoice } = useInvoice(auction.invoiceId)
  const [timeLeft, setTimeLeft] = useState('')

  const formatPrice = (price: bigint) => {
    const formatted = formatUnits(price, 6)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(parseFloat(formatted))
  }

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const endTime = Number(auction.endsAt) * 1000
      const now = Date.now()
      const diff = endTime - now

      if (diff <= 0) {
        setTimeLeft('Ended')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auction.endsAt])

  const getStatusBadge = () => {
    switch (auction.status) {
      case AuctionStatus.ACTIVE:
        return <Badge className="bg-green-500">Live</Badge>
      case AuctionStatus.ENDED_WITH_SALE:
        return <Badge className="bg-blue-500">Sold</Badge>
      case AuctionStatus.ENDED_NO_SALE:
        return <Badge>Not Sold</Badge>
      case AuctionStatus.CANCELLED:
        return <Badge>Cancelled</Badge>
      default:
        return null
    }
  }

  const hasBids = auction.highestBid > BigInt(0)
  const reserveMet = auction.highestBid >= auction.reservePrice

  return (
    <Card className="hover:shadow-lg transition-shadow border-emerald-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Invoice #{auction.invoiceId.toString()}</p>
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
            <p className="text-xs text-muted-foreground">
              {hasBids ? 'Current Bid' : 'Starting Price'}
            </p>
            <p className="font-bold text-emerald-600">
              {formatPrice(hasBids ? auction.highestBid : auction.startPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reserve Price</p>
            <p className="font-semibold text-sm">{formatPrice(auction.reservePrice)}</p>
            {reserveMet && hasBids && (
              <Badge className="mt-1 text-xs bg-green-100 text-green-700">
                Reserve Met
              </Badge>
            )}
          </div>
        </div>

        {hasBids && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 p-2 rounded">
            <User className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Highest Bidder</p>
              <p className="font-mono text-xs">
                {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className={timeLeft === 'Ended' ? 'text-red-600' : 'text-muted-foreground'}>
            {timeLeft === 'Ended' ? 'Auction Ended' : `${timeLeft} remaining`}
          </span>
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
        <Link href={`/marketplace/auction/${auction.auctionId}`} className="flex-1">
          <Button variant="outline" className="w-full border-emerald-200 hover:bg-emerald-50">
            <TrendingUp className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
        {auction.status === AuctionStatus.ACTIVE && onPlaceBid && (
          <Button
            onClick={onPlaceBid}
            disabled={isLoading || timeLeft === 'Ended'}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Gavel className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Place Bid'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
