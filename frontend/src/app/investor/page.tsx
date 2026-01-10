'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PoolCard } from '@/components/investor/PoolCard'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { usePoolMetrics } from '@/hooks/usePoolMetrics'
import { useAllUserPositions } from '@/hooks/useUserPosition'
import { TrendingUp, Wallet, DollarSign, PieChart, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatUnits } from 'viem'

export default function InvestorDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  // Get pool metrics for all tiers
  const tierA = usePoolMetrics(RiskTier.TIER_A)
  const tierB = usePoolMetrics(RiskTier.TIER_B)
  const tierC = usePoolMetrics(RiskTier.TIER_C)

  // Get user positions
  const { totalMetrics, isLoading: isLoadingPositions } = useAllUserPositions()

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to access the investor dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLoading = tierA.isLoading || tierB.isLoading || tierC.isLoading || isLoadingPositions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Investor Dashboard</span>
          </h1>
          <p className="text-lg text-slate-600">Earn yield by providing liquidity to invoice factoring pools</p>
        </div>

        {/* Portfolio Summary */}
        {totalMetrics.hasAnyPosition && (
          <div className="mb-8 animate-in slide-up duration-500">
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-full blur-3xl"></div>

              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Your Portfolio</CardTitle>
                    <CardDescription>Total investment across all pools</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Total Value</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      ${parseFloat(formatUnits(totalMetrics.totalCurrentValue, 6)).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Deposited</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      ${parseFloat(formatUnits(totalMetrics.totalDeposited, 6)).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Total Earned</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                      +${parseFloat(formatUnits(totalMetrics.totalEarned, 6)).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Profit/Loss</span>
                    </div>
                    <p className={`text-2xl font-bold ${totalMetrics.totalProfitLoss >= BigInt(0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalMetrics.totalProfitLoss >= BigInt(0) ? '+' : ''}
                      {totalMetrics.totalProfitLossPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/investor/portfolio">View Portfolio Details</Link>
                  </Button>
                  <Button asChild className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                    <Link href="/investor/withdraw">Withdraw Funds</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button asChild variant="outline" className="h-auto py-4 border-2 hover:border-emerald-300 hover:bg-emerald-50">
            <Link href="/investor/pools" className="flex items-center justify-center gap-2">
              <PieChart className="w-5 h-5" />
              <span className="font-semibold">Browse Pools</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-4 border-2 hover:border-emerald-300 hover:bg-emerald-50">
            <Link href="/investor/history" className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Transaction History</span>
            </Link>
          </Button>

          <Button asChild className="h-auto py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
            <Link href="/investor/deposit" className="flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="font-semibold">Make Deposit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Pool Cards */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Liquidity Pools</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-64 bg-slate-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-up duration-500">
              <PoolCard
                tier={RiskTier.TIER_A}
                totalValueLocked={tierA.metrics.totalValueLocked}
                availableLiquidity={tierA.metrics.availableLiquidity}
                targetAPY={tierA.metrics.targetAPY}
                utilizationRate={tierA.metrics.utilizationRate}
                isAcceptingDeposits={tierA.metrics.isAcceptingDeposits}
                remainingCapacity={tierA.metrics.remainingCapacity}
              />

              <PoolCard
                tier={RiskTier.TIER_B}
                totalValueLocked={tierB.metrics.totalValueLocked}
                availableLiquidity={tierB.metrics.availableLiquidity}
                targetAPY={tierB.metrics.targetAPY}
                utilizationRate={tierB.metrics.utilizationRate}
                isAcceptingDeposits={tierB.metrics.isAcceptingDeposits}
                remainingCapacity={tierB.metrics.remainingCapacity}
              />

              <PoolCard
                tier={RiskTier.TIER_C}
                totalValueLocked={tierC.metrics.totalValueLocked}
                availableLiquidity={tierC.metrics.availableLiquidity}
                targetAPY={tierC.metrics.targetAPY}
                utilizationRate={tierC.metrics.utilizationRate}
                isAcceptingDeposits={tierC.metrics.isAcceptingDeposits}
                remainingCapacity={tierC.metrics.remainingCapacity}
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h3 className="font-semibold text-slate-900">Deposit USDT</h3>
                  <p className="text-sm text-slate-600">Choose a risk tier and deposit your USDT to earn yield</p>
                </div>

                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <h3 className="font-semibold text-slate-900">Earn Yield</h3>
                  <p className="text-sm text-slate-600">Your liquidity funds verified invoices and earns interest</p>
                </div>

                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <h3 className="font-semibold text-slate-900">Withdraw Anytime</h3>
                  <p className="text-sm text-slate-600">Claim your yield or withdraw your principal plus earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
