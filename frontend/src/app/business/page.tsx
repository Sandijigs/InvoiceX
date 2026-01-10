'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { useKYBRegistry } from '@/hooks/useKYBRegistry'
import { StatsOverview } from '@/components/business/StatsOverview'
import { KYBStatusCard } from '@/components/business/KYBStatusCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus, Building2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function BusinessDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isRegistered, businessId, businessInfo, isCheckingRegistration, registrationCheckError, refetchRegistration } = useBusinessRegistry()
  const { refetchData, refetchValidity, refetchPending } = useKYBRegistry()

  // Refetch KYB data when component mounts or when refresh parameter changes
  useEffect(() => {
    if (isConnected && address) {
      const refreshParam = searchParams.get('refresh')

      // Immediately fetch on mount
      refetchData()
      refetchValidity()
      refetchPending()

      // Also schedule delayed refetches to catch any delayed blockchain updates
      const timer1 = setTimeout(() => {
        refetchData()
        refetchValidity()
        refetchPending()
      }, 2000) // 2 second delay

      // Additional refetch after 5 seconds if coming from KYB submission (has refresh param)
      const timer2 = refreshParam ? setTimeout(() => {
        refetchData()
        refetchValidity()
        refetchPending()
      }, 5000) : undefined

      return () => {
        clearTimeout(timer1)
        if (timer2) clearTimeout(timer2)
      }
    }
  }, [isConnected, address, searchParams, refetchData, refetchValidity, refetchPending])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>
              Please connect your wallet to access the business dashboard
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

  // Handle RPC errors
  if (registrationCheckError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Network Issue</CardTitle>
            <CardDescription className="text-amber-700">
              We're having trouble connecting to the Mantle network. This could be due to RPC timeout or network congestion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-800">
              Error: {registrationCheckError.message || 'Network timeout'}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => refetchRegistration()}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Retry
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1 border-amber-300"
              >
                Go Home
              </Button>
            </div>
            <p className="text-xs text-amber-600 mt-4">
              💡 Tip: The Mantle Sepolia testnet RPC can be slow. Please be patient and try again.
            </p>
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
                <p className="text-lg font-semibold text-slate-900">Checking registration status...</p>
                <p className="text-sm text-slate-500">This may take a moment on Mantle Sepolia testnet</p>
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
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle>Business Not Registered</CardTitle>
            </div>
            <CardDescription>
              You need to register your business before accessing the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              <Link href="/business/register">Register Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parse business name from businessURI
  const getBusinessName = () => {
    if (!businessInfo?.businessURI) return 'Business'
    try {
      const metadata = JSON.parse(businessInfo.businessURI)
      return metadata.name || 'Business'
    } catch {
      return 'Business'
    }
  }

  // Get business status label
  const getStatusLabel = (status: number) => {
    const labels = ['PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'BLACKLISTED']
    return labels[status] || 'UNKNOWN'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 animate-in fade-in duration-500">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">
                Welcome back, <span className="text-emerald-600">{getBusinessName()}</span>
              </h1>
              <p className="text-lg text-slate-600">
                Manage your invoices and track your cash flow
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white rounded-lg border border-slate-200 px-4 py-2">
                <p className="text-xs text-slate-500 mb-1">Business ID</p>
                <p className="text-lg font-bold text-slate-900">#{businessId?.toString()}</p>
              </div>
            </div>
          </div>
          {businessInfo && (
            <div className="mt-4 flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                businessInfo.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                businessInfo.status === 1 || businessInfo.status === 2 ? 'bg-emerald-100 text-emerald-800' :
                'bg-red-100 text-red-800'
              }`}>
                Status: {getStatusLabel(businessInfo.status)}
              </span>
              <span className="text-sm text-slate-500">
                Credit Score: <span className="font-semibold text-slate-700">{businessInfo.creditScore.toString()}/100</span>
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            asChild
            className="h-auto py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            <Link href="/business/submit" className="flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Submit New Invoice</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto py-6 border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Link href="/business/invoices" className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">My Invoices</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto py-6 border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Link href="/business/payments" className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Payment History</span>
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <StatsOverview />
        </div>

        {/* KYB Status */}
        <div className="mb-8">
          <KYBStatusCard />
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest invoice submissions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Submit your first invoice to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
