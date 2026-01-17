'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Building2, FileText } from 'lucide-react'
import { useState } from 'react'
import { Business, BusinessStatus } from '@/lib/abis/BusinessRegistry'

type PendingBusinessCardProps = {
  business: Business
  businessId: bigint
  onApprove: (businessId: bigint, creditScore: number) => void
  onReject?: (businessId: bigint, reason: string) => void
  isLoading: boolean
}

export function PendingBusinessCard({
  business,
  businessId,
  onApprove,
  onReject,
  isLoading,
}: PendingBusinessCardProps) {
  const [creditScore, setCreditScore] = useState('600')
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  const handleApprove = () => {
    const score = parseInt(creditScore)
    if (score < 0 || score > 1000) {
      alert('Credit score must be between 0 and 1000')
      return
    }
    onApprove(businessId, score)
  }

  const handleReject = () => {
    if (!rejectReason) {
      alert('Please provide a rejection reason')
      return
    }
    if (onReject) {
      onReject(businessId, rejectReason)
    }
  }

  return (
    <Card className="border-orange-100">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Business #{businessId.toString()}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Registered: {new Date(Number(business.registeredAt) * 1000).toLocaleDateString()}
            </p>
          </div>
          <Badge className="bg-orange-500">Pending Review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Business ID</p>
            <p className="font-medium">{businessId.toString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Owner Address</p>
            <p className="font-mono text-xs">{formatAddress(business.owner)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Business Hash</p>
            <p className="font-mono text-xs">{formatHash(business.businessHash)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Credit Score</p>
            <p className="font-medium">{business.creditScore.toString()}</p>
          </div>
        </div>

        {/* Metadata URI */}
        {business.businessURI && (
          <div>
            <p className="text-sm font-medium mb-2">Business Metadata</p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <a
                href={business.businessURI}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline break-all"
              >
                {business.businessURI.length > 60
                  ? `${business.businessURI.slice(0, 60)}...`
                  : business.businessURI}
              </a>
            </div>
          </div>
        )}

        {/* Credit Score Input */}
        <div className="space-y-2">
          <Label htmlFor={`score-${businessId}`}>Initial Credit Score (0-1000)</Label>
          <Input
            id={`score-${businessId}`}
            type="number"
            min="0"
            max="1000"
            value={creditScore}
            onChange={(e) => setCreditScore(e.target.value)}
            disabled={isLoading}
            placeholder="600"
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 600-700 for new businesses
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Approve'}
          </Button>
          <Button
            onClick={() => setShowReject(!showReject)}
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>

        {/* Reject Form */}
        {showReject && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg space-y-3">
            <p className="font-medium text-red-700">Rejection Reason</p>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={isLoading || !rejectReason}
                variant="destructive"
                size="sm"
              >
                Confirm Rejection
              </Button>
              <Button
                onClick={() => {
                  setShowReject(false)
                  setRejectReason('')
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
