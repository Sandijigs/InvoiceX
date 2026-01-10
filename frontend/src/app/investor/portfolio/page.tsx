'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { useAllUserPositions } from '@/hooks/useUserPosition'
import { getTierInfo } from '@/hooks/usePoolMetrics'
import { formatUnits } from 'viem'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Clock,
  Award,
  Activity,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

function PositionCard({ tier }: { tier: RiskTier }) {
  const tierInfo = getTierInfo(tier)
  const { tierA, tierB, tierC } = useAllUserPositions()

  const position = tier === RiskTier.TIER_A ? tierA : tier === RiskTier.TIER_B ? tierB : tierC

  const { metrics } = position

  if (!metrics.hasPosition) {
    return null
  }

  const getColorClasses = () => {
    switch (tier) {
      case RiskTier.TIER_A:
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          icon: 'bg-emerald-100 text-emerald-600',
        }
      case RiskTier.TIER_B:
        return {
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          icon: 'bg-amber-100 text-amber-600',
        }
      case RiskTier.TIER_C:
        return {
          gradient: 'from-rose-500 to-red-600',
          bg: 'bg-gradient-to-br from-rose-50 via-white to-red-50',
          border: 'border-rose-200',
          text: 'text-rose-600',
          icon: 'bg-rose-100 text-rose-600',
        }
    }
  }

  const colors = getColorClasses()

  return (
    <Card className={`relative overflow-hidden border-2 ${colors.border} ${colors.bg} hover:shadow-xl transition-all duration-300`}>
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full blur-3xl`}></div>

      <CardHeader className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${colors.icon} rounded-xl text-2xl`}>
              {tierInfo.icon}
            </div>
            <div>
              <CardTitle className="text-xl">{tierInfo.name}</CardTitle>
              <CardDescription>{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge className={`${colors.text} bg-white border-2 ${colors.border}`}>
            {tierInfo.riskLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Main Value */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">Current Value</div>
          <div className="text-3xl font-black text-slate-900">
            ${parseFloat(formatUnits(metrics.currentValue, 6)).toLocaleString()}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Deposited</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              ${parseFloat(formatUnits(metrics.depositedValue, 6)).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Shares</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {parseFloat(formatUnits(metrics.shares, 18)).toFixed(4)}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Profit/Loss</span>
            </div>
            <p className={`text-lg font-bold ${metrics.profitLoss >= BigInt(0) ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.profitLoss >= BigInt(0) ? '+' : ''}${parseFloat(formatUnits(metrics.profitLoss, 6)).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">P/L %</span>
            </div>
            <p className={`text-lg font-bold ${metrics.profitLossPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.profitLossPercentage >= 0 ? '+' : ''}{metrics.profitLossPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Yield Info */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">Pending Yield</span>
            </div>
            <span className="font-bold text-emerald-600">
              ${parseFloat(formatUnits(metrics.pendingYield, 6)).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            asChild
            variant="outline"
            className="h-10"
          >
            <Link href={`/investor/deposit?tier=${tier}`}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Deposit
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10"
          >
            <Link href="/investor/withdraw">
              <TrendingDown className="w-4 h-4 mr-2" />
              Withdraw
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  const { totalMetrics, isLoading } = useAllUserPositions()

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to view your portfolio</CardDescription>
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

  if (!totalMetrics.hasAnyPosition && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="border-2 border-slate-200 text-center py-12">
            <CardContent>
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-slate-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">No Positions Yet</h2>
              <p className="text-slate-600 mb-8">
                You haven't deposited to any pools yet. Start earning yield by making your first deposit.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Link href="/investor/deposit">
                  <Wallet className="w-4 h-4 mr-2" />
                  Make Your First Deposit
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-4xl font-black text-slate-900 mb-2">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Portfolio Overview
            </span>
          </h1>
          <p className="text-lg text-slate-600">Detailed view of your investments across all pools</p>
        </div>

        {/* Overall Summary */}
        <Card className="mb-8 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-full blur-3xl"></div>

          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Total Portfolio Value</CardTitle>
                <CardDescription>Combined value across all pools</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative">
            {/* Hero Value */}
            <div className="mb-6">
              <div className="text-5xl font-black text-slate-900 mb-2">
                ${parseFloat(formatUnits(totalMetrics.totalCurrentValue, 6)).toLocaleString()}
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 text-lg font-semibold ${
                  totalMetrics.totalProfitLoss >= BigInt(0) ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {totalMetrics.totalProfitLoss >= BigInt(0) ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span>
                    {totalMetrics.totalProfitLoss >= BigInt(0) ? '+' : ''}${parseFloat(formatUnits(totalMetrics.totalProfitLoss, 6)).toLocaleString()}
                  </span>
                  <span className="text-base">
                    ({totalMetrics.totalProfitLoss >= BigInt(0) ? '+' : ''}{totalMetrics.totalProfitLossPercentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider">Total Deposited</span>
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
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider">Pending Yield</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  ${parseFloat(formatUnits(totalMetrics.totalPendingYield, 6)).toLocaleString()}
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-600 uppercase tracking-wider">ROI</span>
                </div>
                <p className={`text-2xl font-bold ${totalMetrics.totalProfitLossPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totalMetrics.totalProfitLossPercentage >= 0 ? '+' : ''}{totalMetrics.totalProfitLossPercentage.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex gap-3">
              <Button asChild className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                <Link href="/investor/deposit">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Deposit More
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/investor/withdraw">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/investor/history">
                  <Clock className="w-4 h-4 mr-2" />
                  View History
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Individual Position Cards */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Positions</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-64 bg-slate-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-up duration-500">
              <PositionCard tier={RiskTier.TIER_A} />
              <PositionCard tier={RiskTier.TIER_B} />
              <PositionCard tier={RiskTier.TIER_C} />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>Portfolio Management Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h3 className="font-semibold text-slate-900">Diversify Risk</h3>
                  <p className="text-sm text-slate-600">
                    Spread your investments across different risk tiers to balance returns and safety
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <h3 className="font-semibold text-slate-900">Compound Regularly</h3>
                  <p className="text-sm text-slate-600">
                    Reinvest your yield to maximize returns through compound interest
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <h3 className="font-semibold text-slate-900">Monitor Performance</h3>
                  <p className="text-sm text-slate-600">
                    Track your ROI and adjust your strategy based on pool performance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
