'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { useKYBRegistry, KYBStatus } from '@/hooks/useKYBRegistry'
import { KYBSubmissionForm } from '@/components/business/KYBSubmissionForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function KYBSubmissionPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isRegistered, isCheckingRegistration } = useBusinessRegistry()
  const { hasKYB, kybData, isLoadingData } = useKYBRegistry()

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>
              Please connect your wallet to submit KYB verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              Go to Home
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
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-slate-900">Checking registration status...</p>
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
        <Card className="max-w-md w-full mx-4 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Business Not Registered</CardTitle>
            <CardDescription className="text-amber-700">
              You need to register your business before submitting KYB verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/business')}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Go to Business Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if KYB already exists
  if (!isLoadingData && hasKYB && kybData) {
    const status = kybData.status
    const isPending = status === KYBStatus.PENDING
    const isVerified = status === KYBStatus.VERIFIED

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-4">
        <Card className={`max-w-2xl w-full ${
          isVerified ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' :
          isPending ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' :
          'border-slate-200'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  isVerified ? 'bg-emerald-100' :
                  isPending ? 'bg-amber-100' :
                  'bg-slate-100'
                }`}>
                  {isVerified ? (
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                  ) : isPending ? (
                    <Clock className="w-7 h-7 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-7 h-7 text-slate-600" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">KYB Already Submitted</CardTitle>
                  <CardDescription>
                    You have already submitted your KYB verification
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${
                isVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                isPending ? 'bg-amber-100 text-amber-800 border-amber-300' :
                'bg-slate-100 text-slate-800 border-slate-300'
              } border`}>
                {isVerified ? 'Verified' : isPending ? 'Pending Review' :
                  status === KYBStatus.EXPIRED ? 'Expired' :
                  status === KYBStatus.SUSPENDED ? 'Suspended' :
                  status === KYBStatus.REVOKED ? 'Revoked' : 'Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-5 rounded-xl border ${
              isVerified ? 'bg-emerald-50/50 border-emerald-200' :
              isPending ? 'bg-amber-50/50 border-amber-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Current Status
              </p>

              {isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </div>
                    <p className="text-sm text-amber-900 font-medium">
                      Your documents are being reviewed
                    </p>
                  </div>
                  <p className="text-sm text-amber-700">
                    Our verification team is reviewing your submitted documents. You'll receive a notification once the review is complete.
                  </p>
                  <div className="pt-2 border-t border-amber-200/50">
                    <p className="text-xs text-amber-600">
                      ⏱️ Typical review time: 24-48 hours
                    </p>
                  </div>
                </div>
              )}

              {isVerified && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-emerald-900 font-medium">
                      Your business has been verified!
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-emerald-600 uppercase tracking-wider">Business Type</p>
                      <p className="text-sm font-semibold text-emerald-900">{kybData.businessType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 uppercase tracking-wider">Verified At</p>
                      <p className="text-sm font-semibold text-emerald-900">
                        {kybData.verifiedAt > BigInt(0)
                          ? new Date(Number(kybData.verifiedAt) * 1000).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-700 pt-2 border-t border-emerald-200/50">
                    You can now submit invoices for financing and access all platform features.
                  </p>
                </div>
              )}

              {!isPending && !isVerified && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    Your KYB status is: <strong>{
                      status === KYBStatus.EXPIRED ? 'Expired - Please renew your verification' :
                      status === KYBStatus.SUSPENDED ? 'Suspended - Please contact support' :
                      status === KYBStatus.REVOKED ? 'Revoked - Please contact support' :
                      'Unknown'
                    }</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                <strong>Need to update your information?</strong>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                If you need to update your KYB documents or information, please contact support. You cannot submit a new KYB while one already exists.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => router.push('/business')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-indigo-50/40 animate-in fade-in duration-700">
      {/* Decorative background gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        {/* Header */}
        <div className="mb-8 animate-in slide-up duration-500">
          <Link
            href="/business"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 mb-6 group transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50 rounded-2xl shadow-lg shadow-emerald-200/50 border border-emerald-200/50">
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                KYB Verification
              </h1>
              <p className="text-lg text-slate-600 mt-1">
                Submit your business documents for verification
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mb-8 animate-in slide-up duration-500" style={{ animationDelay: '100ms' }}>
          <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 shadow-xl shadow-emerald-100/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-3xl -z-0"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-emerald-900 text-xl">Why KYB Verification?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4 text-sm">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-emerald-800">Know Your Business (KYB)</strong> verification helps us:
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                    <p className="text-slate-700 flex-1">Verify your business legitimacy and credibility</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                    <p className="text-slate-700 flex-1">Assess creditworthiness for invoice financing</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                    <p className="text-slate-700 flex-1">Comply with regulatory requirements</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                    <p className="text-slate-700 flex-1">Protect all participants in the platform</p>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 rounded-lg border border-amber-200/50 mt-4">
                  <p className="text-sm text-amber-900 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Privacy First:</strong> Your documents are hashed and encrypted. Only document hashes are stored on-chain, ensuring complete privacy.</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Form */}
        <div className="max-w-3xl animate-in slide-up duration-500" style={{ animationDelay: '200ms' }}>
          <KYBSubmissionForm />
        </div>
      </div>
    </div>
  )
}
