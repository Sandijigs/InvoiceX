'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useUserInvoices, useInvoice } from '@/hooks/useInvoice'
import { useMarketplace } from '@/hooks/useMarketplace'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function CreateListingPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { invoiceIds } = useUserInvoices(address)
  const { createListing, isLoading, isSuccess, hash } = useMarketplace()

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [askPrice, setAskPrice] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [duration, setDuration] = useState('30')

  const { invoice } = useInvoice(selectedInvoiceId ? BigInt(selectedInvoiceId) : undefined)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      alert('Please connect your wallet')
      return
    }

    if (!selectedInvoiceId || !askPrice || !minPrice || !duration) {
      alert('Please fill in all fields')
      return
    }

    if (parseFloat(minPrice) > parseFloat(askPrice)) {
      alert('Minimum price cannot be greater than ask price')
      return
    }

    await createListing(
      BigInt(selectedInvoiceId),
      askPrice,
      minPrice,
      parseInt(duration)
    )
  }

  const calculateDiscount = () => {
    if (!invoice || !askPrice) return 0
    return ((invoice.amount - parseFloat(askPrice)) / invoice.amount) * 100
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to create a listing
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isSuccess && hash) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
              Listing Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your invoice has been listed on the marketplace.
            </p>
            <div className="flex gap-3">
              <Link href="/marketplace" className="flex-1">
                <Button variant="outline" className="w-full">
                  View Marketplace
                </Button>
              </Link>
              <Link href="/marketplace/my-listings" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-600">
                  My Listings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
          Create Listing
        </h1>
        <p className="text-muted-foreground mt-2">
          List your invoice token for sale on the marketplace
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
            <CardDescription>
              Set your pricing and duration for the listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select Invoice */}
            <div className="space-y-2">
              <Label>Select Invoice</Label>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice to list" />
                </SelectTrigger>
                <SelectContent>
                  {invoiceIds.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No invoices available
                    </div>
                  ) : (
                    invoiceIds.map((id) => (
                      <SelectItem key={id.toString()} value={id.toString()}>
                        Invoice #{id.toString()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {invoiceIds.length === 0 && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have any invoices yet. Create an invoice first to list it on the marketplace.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Invoice Preview */}
            {invoice && (
              <div className="bg-emerald-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Face Value</p>
                    <p className="font-medium">${invoice.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{invoice.statusText}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium">{invoice.dueDate}</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="askPrice">Ask Price ($)</Label>
                <Input
                  id="askPrice"
                  type="number"
                  step="0.01"
                  value={askPrice}
                  onChange={(e) => setAskPrice(e.target.value)}
                  placeholder="Enter your asking price"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The price you want to sell for
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPrice">Minimum Price ($)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Enter minimum acceptable price"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Lowest offer you'll accept
                </p>
              </div>
            </div>

            {/* Discount Display */}
            {invoice && askPrice && (
              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                <p className="text-green-700">
                  <span className="font-semibold">Discount: </span>
                  {calculateDiscount().toFixed(2)}% off face value
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Listing Duration (days)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long your listing will be active
              </p>
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedInvoiceId || !askPrice || !minPrice}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create Listing'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
