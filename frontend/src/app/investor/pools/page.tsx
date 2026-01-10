'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { usePoolMetrics, getTierInfo } from '@/hooks/usePoolMetrics'
import { useUserPosition } from '@/hooks/useUserPosition'
import { formatUnits } from 'viem'
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  PieChart,
  Droplets,
  Activity,
  Shield,
  AlertTriangle,
  Rocket,
  Info,
  ArrowRight,
  BarChart3,
  Target
} from 'lucide-react'
import Link from 'next/link'

function DetailedPoolCard({ tier }: { tier: RiskTier }) {
  const tierInfo = getTierInfo(tier)
  const { metrics, isLoading } = usePoolMetrics(tier)
  const { metrics: userMetrics } = useUserPosition(tier)

  const getColorClasses = () => {
    switch (tier) {
      case RiskTier.TIER_A:
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          icon: 'bg-emerald-100 text-emerald-600',
          button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
        }
      case RiskTier.TIER_B:
        return {
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          icon: 'bg-amber-100 text-amber-600',
          button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
        }
      case RiskTier.TIER_C:
        return {
          gradient: 'from-rose-500 to-red-600',
          bg: 'bg-gradient-to-br from-rose-50 via-white to-red-50',
          border: 'border-rose-200',
          text: 'text-rose-600',
          icon: 'bg-rose-100 text-rose-600',
          button: 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
        }
    }
  }

  const colors = getColorClasses()

  const tvl = parseFloat(formatUnits(metrics.totalValueLocked, 6))
  const available = parseFloat(formatUnits(metrics.availableLiquidity, 6))
  const deployed = parseFloat(formatUnits(metrics.deployedLiquidity, 6))
  const remaining = parseFloat(formatUnits(metrics.remainingCapacity, 6))

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-6">
          <div className="h-96 bg-slate-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`relative overflow-hidden border-2 ${colors.border} ${colors.bg} shadow-xl`}>
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full blur-3xl`}></div>

      <CardHeader className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-4 ${colors.icon} rounded-2xl text-3xl`}>
              {tierInfo.icon}
            </div>
            <div>
              <CardTitle className="text-2xl">{tierInfo.name}</CardTitle>
              <CardDescription className="text-base">{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge className={`${colors.text} bg-white border-2 ${colors.border} text-base px-4 py-2`}>
            {tierInfo.riskLevel} Risk
          </Badge>
        </div>

        {/* APY Highlight */}
        <div className={`bg-gradient-to-r ${colors.gradient} rounded-xl p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Target APY Range</div>
              <div className="text-4xl font-black">{tierInfo.apyRange}</div>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Key Metrics */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Pool Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Total Value Locked</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${tvl.toLocaleString()}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Available Liquidity</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${available.toLocaleString()}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Deployed Liquidity</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${deployed.toLocaleString()}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Capacity Left</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${remaining.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Utilization Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Pool Utilization</span>
            <span className="text-lg font-bold text-slate-900">{metrics.utilizationRate.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(metrics.utilizationRate, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.utilizationRate < 50 ? 'Low utilization - good liquidity available' :
             metrics.utilizationRate < 80 ? 'Moderate utilization - healthy pool activity' :
             'High utilization - limited liquidity available'}
          </p>
        </div>

        {/* Your Position (if any) */}
        {userMetrics.hasPosition && (
          <div className={`border-2 ${colors.border} rounded-xl p-4 ${colors.bg}`}>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Your Position
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">Position Value</div>
                <div className="text-xl font-bold text-slate-900">
                  ${parseFloat(formatUnits(userMetrics.currentValue, 6)).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Profit/Loss</div>
                <div className={`text-xl font-bold ${userMetrics.profitLoss >= BigInt(0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {userMetrics.profitLoss >= BigInt(0) ? '+' : ''}{userMetrics.profitLossPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pool Limits */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Deposit Limits
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Minimum Deposit</span>
              <span className="font-semibold">${parseFloat(formatUnits(metrics.minDeposit || BigInt(0), 6)).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Maximum Deposit</span>
              <span className="font-semibold">${parseFloat(formatUnits(metrics.maxDeposit || BigInt(0), 6)).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Pool Capacity</span>
              <span className="font-semibold">${parseFloat(formatUnits(metrics.poolCapacity, 6)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Status & CTA */}
        <div className="space-y-3 pt-4 border-t-2 border-slate-200">
          {!metrics.isAcceptingDeposits ? (
            <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3 text-center">
              <span className="text-sm font-semibold text-slate-700">⏸️ Deposits Paused</span>
            </div>
          ) : remaining < 1000 ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 text-center">
              <span className="text-sm font-semibold text-amber-800">⚠️ Limited Capacity Remaining</span>
            </div>
          ) : null}

          <Button
            asChild
            disabled={!metrics.isAcceptingDeposits}
            className={`w-full h-12 text-base font-bold bg-gradient-to-r ${colors.button} shadow-lg hover:shadow-xl transition-all`}
          >
            <Link href={`/investor/deposit?tier=${tier}`} className="flex items-center justify-center">
              <span>Deposit to {tierInfo.name}</span>
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PoolsPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<RiskTier>(RiskTier.TIER_A)

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to view pool details</CardDescription>
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
              Liquidity Pools
            </span>
          </h1>
          <p className="text-lg text-slate-600">Explore detailed information about each risk tier</p>
        </div>

        {/* Risk Tier Comparison */}
        <Card className="mb-8 border-2 border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Risk Tier Comparison</CardTitle>
            <CardDescription>Choose the right pool based on your risk tolerance and return expectations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border-2 border-emerald-200 rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-xl">🛡️</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Tier A</h3>
                    <p className="text-sm text-slate-600">Conservative</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700">Low risk, stable returns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700">8-12% APY target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700">High-grade invoices only</span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-xl">⚖️</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Tier B</h3>
                    <p className="text-sm text-slate-600">Balanced</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700">Medium risk, good returns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700">15-20% APY target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700">Mixed grade invoices</span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-rose-200 rounded-xl p-4 bg-gradient-to-br from-rose-50 to-red-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-100 rounded-lg text-xl">🚀</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Tier C</h3>
                    <p className="text-sm text-slate-600">Aggressive</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-rose-600" />
                    <span className="text-slate-700">Higher risk, max returns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    <span className="text-slate-700">22-30% APY target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-600" />
                    <span className="text-slate-700">All grade invoices</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Pool View with Tabs */}
        <Card className="border-2 border-slate-200 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Pool Details</CardTitle>
            <CardDescription>Select a tier to view detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTier.toString()} onValueChange={(val) => setSelectedTier(parseInt(val) as RiskTier)}>
              <TabsList className="grid grid-cols-3 w-full mb-8 h-14">
                <TabsTrigger value="0" className="text-base data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  <span className="mr-2">🛡️</span> Tier A
                </TabsTrigger>
                <TabsTrigger value="1" className="text-base data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  <span className="mr-2">⚖️</span> Tier B
                </TabsTrigger>
                <TabsTrigger value="2" className="text-base data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                  <span className="mr-2">🚀</span> Tier C
                </TabsTrigger>
              </TabsList>

              <TabsContent value="0" className="mt-0">
                <DetailedPoolCard tier={RiskTier.TIER_A} />
              </TabsContent>
              <TabsContent value="1" className="mt-0">
                <DetailedPoolCard tier={RiskTier.TIER_B} />
              </TabsContent>
              <TabsContent value="2" className="mt-0">
                <DetailedPoolCard tier={RiskTier.TIER_C} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-8 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle>How Liquidity Pools Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <h3 className="font-semibold text-slate-900">Deposit Funds</h3>
                <p className="text-sm text-slate-600">
                  Choose a risk tier and deposit USDT. You'll receive LP shares representing your portion of the pool.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <h3 className="font-semibold text-slate-900">Earn Yield</h3>
                <p className="text-sm text-slate-600">
                  Your liquidity is deployed to finance verified invoices. When invoices are paid, yield is distributed.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-slate-900">Withdraw Anytime</h3>
                <p className="text-sm text-slate-600">
                  Claim your yield or withdraw your principal plus earnings anytime, subject to available liquidity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
