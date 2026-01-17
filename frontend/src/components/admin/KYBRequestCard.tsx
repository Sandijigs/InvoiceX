'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Building2, FileText } from 'lucide-react'
import { useKYBRequest } from '@/hooks/useAdminData'
import { RequestStatus } from '@/lib/abis/KYBRegistry'

type KYBRequestCardProps = {
  requestId: bigint
  onApprove: (requestId: bigint, businessAddress: `0x${string}`) => void
  onReject: (requestId: bigint) => void
  selectedForRejection: boolean
  onSelectForRejection: (requestId: bigint) => void
  rejectReason: string
  onRejectReasonChange: (reason: string) => void
  isLoading: boolean
}

export function KYBRequestCard({
  requestId,
  onApprove,
  onReject,
  selectedForRejection,
  onSelectForRejection,
  rejectReason,
  onRejectReasonChange,
  isLoading,
}: KYBRequestCardProps) {
  const { request, isLoading: isLoadingRequest } = useKYBRequest(requestId)

  if (isLoadingRequest) {
    return (
      <Card className="border-orange-100 animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!request) {
    return null
  }

  const safeBigIntToString = (value: bigint | undefined) => {
    if (!value) return '0'
    try {
      return value.toString()
    } catch (error) {
      console.error('Error converting bigint to string:', error)
      return '0'
    }
  }

  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return 'Unknown'
    try {
      const date = new Date(Number(timestamp) * 1000)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown'
    }
  }

  const formatAddress = (address: string | undefined) => {
    if (!address || address.length < 10) return address || 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className="border-orange-100">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Request #{safeBigIntToString(request.requestId)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted: {formatDate(request.requestedAt)}
            </p>
          </div>
          <Badge className="bg-orange-500">Pending Review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Request ID</p>
            <p className="font-medium">{safeBigIntToString(request.requestId)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Business Wallet</p>
            <p className="font-mono text-xs">{formatAddress(request.businessWallet)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Business Hash</p>
            <p className="font-mono text-xs">{formatAddress(request.businessHash)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Proofs Submitted</p>
            <p className="font-medium">{request.submittedProofs?.length || 0} documents</p>
          </div>
        </div>

        {/* Submitted Proofs */}
        {request.submittedProofs && request.submittedProofs.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Submitted Proof Hashes</p>
            <div className="flex flex-wrap gap-2">
              {request.submittedProofs.map((proof, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 font-mono text-xs">
                  <FileText className="h-3 w-3" />
                  {formatAddress(proof)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => onApprove(request.requestId, request.businessWallet)}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Approve'}
          </Button>
          <Button
            onClick={() => onSelectForRejection(request.requestId)}
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>

        {/* Reject Form */}
        {selectedForRejection && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg space-y-3">
            <p className="font-medium text-red-700">Rejection Reason</p>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => onReject(request.requestId)}
                disabled={isLoading || !rejectReason}
                variant="destructive"
                size="sm"
              >
                Confirm Rejection
              </Button>
              <Button
                onClick={() => {
                  onSelectForRejection(BigInt(0))
                  onRejectReasonChange('')
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
