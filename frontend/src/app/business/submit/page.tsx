'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { InvoiceUploadForm } from '@/components/invoice/InvoiceUploadForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SubmitInvoicePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const {
    isRegistered,
    businessId,
    businessInfo,
    isCheckingRegistration,
    registrationCheckError
  } = useBusinessRegistry()

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/business')
    }
  }, [isConnected, router])

  // Redirect if not registered
  useEffect(() => {
    if (!isCheckingRegistration && !isRegistered) {
      router.push('/business')
    }
  }, [isCheckingRegistration, isRegistered, router])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-slate-900">Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (registrationCheckError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Network Issue</CardTitle>
            <CardDescription className="text-amber-700">
              We're having trouble connecting to the Mantle network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-800">
              Error: {registrationCheckError.message || 'Network timeout'}
            </p>
            <Button
              onClick={() => router.push('/business')}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Go Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-slate-900">Verifying business registration...</p>
                <p className="text-sm text-slate-500">Please wait</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-slate-900">Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check business status - must be VERIFIED (1) or ACTIVE (2)
  const canSubmitInvoices = businessInfo && (businessInfo.status === 1 || businessInfo.status === 2)
  const isPending = businessInfo && businessInfo.status === 0
  const isSuspended = businessInfo && businessInfo.status === 3
  const isBlacklisted = businessInfo && businessInfo.status === 4

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            asChild
            className="mb-4 hover:bg-slate-100"
          >
            <Link href="/business" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Submit New Invoice
              </h1>
              <p className="text-slate-600 mt-1">
                Get instant financing for your outstanding invoices
              </p>
            </div>
            {businessId && (
              <div className="hidden md:block bg-white rounded-lg border border-slate-200 px-4 py-2">
                <p className="text-xs text-slate-500 mb-1">Business ID</p>
                <p className="text-lg font-bold text-slate-900">#{businessId.toString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {isPending && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Business Pending Verification</AlertTitle>
            <AlertDescription className="text-amber-700">
              Your business registration is pending verification. You can submit invoices, but they will be queued until your business is verified.
            </AlertDescription>
          </Alert>
        )}

        {isSuspended && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900">Business Suspended</AlertTitle>
            <AlertDescription className="text-red-700">
              Your business account has been suspended. Please contact support to resolve any issues before submitting new invoices.
            </AlertDescription>
          </Alert>
        )}

        {isBlacklisted && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900">Business Blacklisted</AlertTitle>
            <AlertDescription className="text-red-700">
              Your business account has been blacklisted. You cannot submit invoices. Please contact support immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice Upload Form */}
        {(canSubmitInvoices || isPending) ? (
          <InvoiceUploadForm />
        ) : (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Cannot Submit Invoices</CardTitle>
              <CardDescription>
                Your business status does not allow invoice submissions at this time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-slate-600 mb-6">
                  Please contact support or check your business status on the dashboard.
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                >
                  <Link href="/business">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
