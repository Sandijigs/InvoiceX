'use client'

import { useKYBRegistry, KYBStatus } from '@/hooks/useKYBRegistry'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const statusConfig = {
  [KYBStatus.NONE]: {
    label: 'Not Submitted',
    icon: AlertCircle,
    color: 'bg-slate-100 text-slate-800',
    iconColor: 'text-slate-600',
  },
  [KYBStatus.PENDING]: {
    label: 'Pending Review',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    iconColor: 'text-amber-600',
  },
  [KYBStatus.VERIFIED]: {
    label: 'Verified',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
    iconColor: 'text-emerald-600',
  },
  [KYBStatus.EXPIRED]: {
    label: 'Expired',
    icon: XCircle,
    color: 'bg-orange-100 text-orange-800',
    iconColor: 'text-orange-600',
  },
  [KYBStatus.SUSPENDED]: {
    label: 'Suspended',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    iconColor: 'text-red-600',
  },
  [KYBStatus.REVOKED]: {
    label: 'Revoked',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    iconColor: 'text-red-600',
  },
}

// Activity indicator component for pending status
function ActivityIndicator() {
  return (
    <div className="flex items-center gap-2 mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200/50">
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-amber-900">
          Verification in Progress
        </p>
        <p className="text-xs text-amber-700">
          Our team is reviewing your documents
        </p>
      </div>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  )
}

export function KYBStatusCard() {
  const { isValid, hasKYB, kybData, isCheckingValidity, isLoadingData, refetchData, refetchValidity, dataError } = useKYBRegistry()
  const { businessInfo, isLoadingInfo, refetchBusinessInfo } = useBusinessRegistry()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchData(), refetchValidity(), refetchBusinessInfo()])
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Clear localStorage pending flag if business is verified
  useEffect(() => {
    if (businessInfo && businessInfo.status === 1) {
      const address = businessInfo.owner?.toLowerCase()
      if (address) {
        const stored = localStorage.getItem(`kyb_pending_${address}`)
        if (stored === 'true') {
          console.log('✅ Business verified, clearing pending KYB flag from localStorage')
          localStorage.removeItem(`kyb_pending_${address}`)
        }
      }
    }
  }, [businessInfo])

  if (isCheckingValidity || isLoadingData || isLoadingInfo) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine status: Check multiple sources
  // Priority: 1. KYB data from KYBRegistry, 2. Business verification status from BusinessRegistry, 3. isValid flag, 4. hasKYB flag
  const isBusinessVerified = businessInfo && businessInfo.status === 1 // BusinessStatus.VERIFIED = 1

  let status: KYBStatus
  if (kybData?.status !== undefined && kybData?.status !== KYBStatus.NONE) {
    // Use KYB data if available
    status = kybData.status
  } else if (isBusinessVerified) {
    // If business is verified in BusinessRegistry, treat KYB as verified
    status = KYBStatus.VERIFIED
  } else if (isValid) {
    // If isKYBValid returns true
    status = KYBStatus.VERIFIED
  } else if (hasKYB) {
    // If user has submitted KYB but not yet approved
    status = KYBStatus.PENDING
  } else {
    // No KYB submitted yet
    status = KYBStatus.NONE
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon
  const isPending = status === KYBStatus.PENDING

  const isVerified = status === KYBStatus.VERIFIED || isBusinessVerified

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${
      isVerified ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white' :
      isPending ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white' : ''
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              isVerified ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-sm' :
              isPending ? 'bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm' :
              'bg-slate-100'
            }`}>
              <Shield className={`w-6 h-6 transition-colors duration-300 ${
                isVerified ? 'text-emerald-600' :
                isPending ? 'text-amber-600' :
                'text-slate-600'
              }`} />
            </div>
            <div>
              <CardTitle className="text-lg">KYB Verification Status</CardTitle>
              <CardDescription>
                Know Your Business verification
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isCheckingValidity || isLoadingData}
              className="h-8 w-8 p-0"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={`${config.color} border transition-all duration-300 shadow-sm`}>
              <StatusIcon className={`w-4 h-4 mr-1.5 ${config.iconColor} ${isPending ? 'animate-pulse' : ''}`} />
              {config.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(kybData && status !== KYBStatus.NONE) || (hasKYB && !kybData && !isValid) ? (
          <div className="space-y-4">
            {(kybData && kybData.businessType) || isValid ? (
              <>
                {kybData && kybData.businessType ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Business Type</span>
                        <p className="text-sm font-semibold text-slate-900">{kybData.businessType}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Level</span>
                        <p className="text-sm font-semibold text-slate-900">
                          {['None', 'Basic', 'Standard', 'Enhanced', 'Premium'][kybData.level || 0]}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Verified</span>
                        <p className="text-sm font-medium text-slate-700">
                          {kybData.verifiedAt && kybData.verifiedAt > BigInt(0) ? new Date(Number(kybData.verifiedAt) * 1000).toLocaleDateString() : 'Pending'}
                        </p>
                      </div>
                      {kybData.expiresAt && kybData.expiresAt > BigInt(0) && (
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500 uppercase tracking-wider">Expires</span>
                          <p className="text-sm font-medium text-slate-700">
                            {new Date(Number(kybData.expiresAt) * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  // Fallback when isValid is true but kybData is missing
                  <div className="p-6 rounded-xl border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-50 via-green-50/30 to-emerald-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">Verified</h3>
                        <p className="text-xs text-emerald-700">Your business has been successfully verified</p>
                      </div>
                    </div>
                    <div className="p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-emerald-200/50">
                      <p className="text-sm text-emerald-900">
                        ✅ You can now submit invoices for financing and access all platform features
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // When hasKYB is true but kybData is undefined (pending approval)
              <div className="relative overflow-hidden">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 via-orange-100/50 to-amber-100/50 animate-pulse"></div>

                {/* Content */}
                <div className="relative p-6 rounded-xl border-2 border-amber-300/50 bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50 shadow-lg">
                  {/* Header with icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
                      <div className="relative p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                        <Clock className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-900">Under Review</h3>
                      <p className="text-xs text-amber-700">Your verification is in progress</p>
                    </div>
                  </div>

                  {/* Status message */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Documents Submitted</p>
                        <p className="text-xs text-slate-600">Your KYB documents have been successfully submitted</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="relative flex h-5 w-5 mt-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500"></span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Verification in Progress</p>
                        <p className="text-xs text-amber-700">Our compliance team is reviewing your documents</p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline estimate */}
                  <div className="p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-amber-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-900">Estimated Review Time</span>
                      </div>
                      <span className="text-xs font-bold text-amber-800">24-48 hours</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  {/* Info banner */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                    <p className="text-xs text-blue-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>What's Next?</strong> Once verified, you'll be able to submit invoices for financing and access all premium features.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isPending && <ActivityIndicator />}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info Card */}
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-full blur-3xl"></div>

              <div className="relative">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl">
                    <Shield className="w-7 h-7 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">KYB Verification Required</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Complete your Know Your Business verification to unlock all features
                    </p>
                  </div>
                </div>

                {/* Benefits list */}
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">Submit invoices for instant financing</span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">Access liquidity pool and marketplace</span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">Build your business credit score</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              asChild
              className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 h-14"
            >
              <Link href="/business/kyb" className="flex items-center justify-center py-2.5">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Shield className="mr-2.5 h-5 w-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10 font-bold text-base">Start KYB Verification</span>
                <svg className="ml-2 w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </Button>

            {/* Quick tip */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
              <p className="text-xs text-blue-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Quick & Secure:</strong> Verification typically takes 24-48 hours. All documents are encrypted and securely stored.
                </span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
