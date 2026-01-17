'use client'

import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { useKYBRegistry } from '@/hooks/useKYBRegistry'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DiagnosticPage() {
  const { address, isConnected } = useAccount()
  const { isRegistered, businessId, businessInfo, isCheckingRegistration } = useBusinessRegistry()
  const { isValid: isKYBValid, hasKYB, kybData, isCheckingValidity, isLoadingData } = useKYBRegistry()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Please Connect Wallet</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const checks = [
    {
      name: 'Wallet Connected',
      status: isConnected ? 'pass' : 'fail',
      message: isConnected ? `Connected: ${address}` : 'Not connected',
      loading: false,
    },
    {
      name: 'Business Registered',
      status: isCheckingRegistration ? 'loading' : (isRegistered ? 'pass' : 'fail'),
      message: isRegistered ? `Business ID: ${businessId?.toString()}` : 'Not registered',
      loading: isCheckingRegistration,
    },
    {
      name: 'Business Verified',
      status: isCheckingRegistration ? 'loading' : (businessInfo && businessInfo.status >= 1 ? 'pass' : 'fail'),
      message: businessInfo ? `Status: ${['Pending', 'Verified', 'Active', 'Suspended', 'Blacklisted'][businessInfo.status]}` : 'No business info',
      loading: isCheckingRegistration,
    },
    {
      name: 'KYB Submitted',
      status: isLoadingData ? 'loading' : (hasKYB ? 'pass' : 'fail'),
      message: hasKYB ? 'KYB data exists' : 'No KYB submitted',
      loading: isLoadingData,
    },
    {
      name: 'KYB Valid',
      status: isCheckingValidity ? 'loading' : (isKYBValid ? 'pass' : 'fail'),
      message: isKYBValid ? 'KYB is valid and not expired' : 'KYB not valid or expired',
      loading: isCheckingValidity,
    },
  ]

  const allPassed = checks.every(check => check.status === 'pass')

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invoice Submission Diagnostic</CardTitle>
          <p className="text-sm text-muted-foreground">
            Check if your account meets all requirements to submit invoices
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {checks.map((check, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : check.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : check.status === 'fail' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-semibold">{check.name}</p>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                </div>
              </div>
              <div>
                {check.status === 'pass' && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                    PASS
                  </span>
                )}
                {check.status === 'fail' && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                    FAIL
                  </span>
                )}
                {check.loading && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    CHECKING...
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 rounded-lg bg-slate-50 border">
            <h3 className="font-semibold mb-2">Summary</h3>
            {allPassed ? (
              <div className="space-y-2">
                <p className="text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All checks passed! You can submit invoices.
                </p>
                <Button asChild className="w-full mt-4">
                  <Link href="/business/submit">Submit Invoice</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Some requirements are not met. Please resolve the issues above.
                </p>
                {!isRegistered && (
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link href="/business">Register Business</Link>
                  </Button>
                )}
                {isRegistered && !hasKYB && (
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link href="/business">Submit KYB Verification</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {kybData && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold mb-2">KYB Details</h3>
              <div className="text-sm space-y-1">
                <p>Status: {['None', 'Pending', 'Verified', 'Rejected'][kybData.status || 0]}</p>
                <p>Level: {kybData.level}</p>
                <p>Verified At: {kybData.verifiedAt > 0 ? new Date(Number(kybData.verifiedAt) * 1000).toLocaleDateString() : 'Not verified'}</p>
                <p>Expires At: {kybData.expiresAt > 0 ? new Date(Number(kybData.expiresAt) * 1000).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          )}

          {businessInfo && (
            <div className="mt-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h3 className="font-semibold mb-2">Business Details</h3>
              <div className="text-sm space-y-1">
                <p>Business ID: {businessId?.toString()}</p>
                <p>Owner: {businessInfo.owner}</p>
                <p>Status: {['Pending', 'Verified', 'Active', 'Suspended', 'Blacklisted'][businessInfo.status]}</p>
                <p>Credit Score: {businessInfo.creditScore.toString()}</p>
                <p>Registered At: {new Date(Number(businessInfo.registeredAt) * 1000).toLocaleDateString()}</p>
                <p>Verified At: {businessInfo.verifiedAt > 0 ? new Date(Number(businessInfo.verifiedAt) * 1000).toLocaleDateString() : 'Not verified'}</p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <Button asChild variant="ghost" className="w-full">
              <Link href="/business">Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
