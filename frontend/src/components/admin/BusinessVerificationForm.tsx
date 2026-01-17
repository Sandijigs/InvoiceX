'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/lib/contracts'
import { BUSINESS_REGISTRY_ABI, type Business, BusinessStatus } from '@/lib/abis/BusinessRegistry'
import { useAdminActions } from '@/hooks/useAdminData'

export function BusinessVerificationForm() {
  const [businessId, setBusinessId] = useState('')
  const [creditScore, setCreditScore] = useState('600')
  const { verifyBusiness, isLoading, isSuccess } = useAdminActions()

  // Fetch business info when ID is entered
  const { data: businessData, isLoading: isLoadingBusiness } = useReadContract({
    address: CONTRACTS.businessRegistry,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusiness',
    args: businessId ? [BigInt(businessId)] : undefined,
    query: {
      enabled: !!businessId && businessId !== '0',
    },
  })

  const business = businessData as Business | undefined

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessId || !creditScore) {
      alert('Please fill in all fields')
      return
    }

    const score = parseInt(creditScore)
    if (score < 0 || score > 1000) {
      alert('Credit score must be between 0 and 1000')
      return
    }

    const defaultZkProofHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

    await verifyBusiness(BigInt(businessId), defaultZkProofHash, score)
  }

  // Clear form on success
  useEffect(() => {
    if (isSuccess) {
      setBusinessId('')
      setCreditScore('600')
    }
  }, [isSuccess])

  const getStatusBadge = (status: BusinessStatus) => {
    const statusMap = {
      [BusinessStatus.PENDING]: { text: 'Pending', color: 'bg-orange-100 text-orange-700' },
      [BusinessStatus.VERIFIED]: { text: 'Verified', color: 'bg-blue-100 text-blue-700' },
      [BusinessStatus.ACTIVE]: { text: 'Active', color: 'bg-green-100 text-green-700' },
      [BusinessStatus.SUSPENDED]: { text: 'Suspended', color: 'bg-red-100 text-red-700' },
      [BusinessStatus.BLACKLISTED]: { text: 'Blacklisted', color: 'bg-gray-100 text-gray-700' },
    }
    const info = statusMap[status]
    return (
      <span className={`px-2 py-1 rounded text-sm font-medium ${info.color}`}>
        {info.text}
      </span>
    )
  }

  return (
    <Card className="border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Verify Business Registration
        </CardTitle>
        <CardDescription>
          Enter a business ID to view details and verify the registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-6">
          {/* Business ID Input */}
          <div className="space-y-2">
            <Label htmlFor="businessId">Business ID</Label>
            <Input
              id="businessId"
              type="number"
              min="1"
              placeholder="Enter business ID (e.g., 1, 2, 3...)"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Business IDs are assigned sequentially starting from 1
            </p>
          </div>

          {/* Business Details (if found) */}
          {businessId && !isLoadingBusiness && business && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-900">Business Details</h4>
                {getStatusBadge(business.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Owner Address</p>
                  <p className="font-mono text-xs">{business.owner}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Business Hash</p>
                  <p className="font-mono text-xs">
                    {business.businessHash.slice(0, 10)}...{business.businessHash.slice(-8)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Current Credit Score</p>
                  <p className="font-medium">{business.creditScore.toString()}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Registered At</p>
                  <p className="font-medium">
                    {new Date(Number(business.registeredAt) * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {business.businessURI && (
                <div>
                  <p className="text-blue-600 font-medium text-sm">Metadata URI</p>
                  <a
                    href={business.businessURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline break-all"
                  >
                    {business.businessURI}
                  </a>
                </div>
              )}

              {business.status === BusinessStatus.PENDING && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    This business is pending verification. Review the details and set an initial credit score to approve.
                  </AlertDescription>
                </Alert>
              )}

              {business.status !== BusinessStatus.PENDING && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    This business has already been verified.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Loading state */}
          {businessId && isLoadingBusiness && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Loading business details...</p>
            </div>
          )}

          {/* Not found state */}
          {businessId && !isLoadingBusiness && !business && businessId !== '0' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Business ID {businessId} not found. Please check the ID and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Credit Score Input (only show if business is pending) */}
          {business && business.status === BusinessStatus.PENDING && (
            <div className="space-y-2">
              <Label htmlFor="creditScore">Initial Credit Score (0-1000)</Label>
              <Input
                id="creditScore"
                type="number"
                min="0"
                max="1000"
                placeholder="600"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 600-700 for new businesses with good documentation
              </p>
            </div>
          )}

          {/* Submit Button */}
          {business && business.status === BusinessStatus.PENDING && (
            <Button
              type="submit"
              disabled={isLoading || !businessId || !creditScore}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {isLoading ? 'Verifying...' : 'Verify Business'}
            </Button>
          )}

          {/* Success Message */}
          {isSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Business verified successfully! The business can now submit invoices.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
