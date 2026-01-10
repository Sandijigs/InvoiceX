'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { getTierInfo } from '@/hooks/usePoolMetrics'
import { APYDisplay } from './APYDisplay'
import { TrendingUp, Lock, Droplets, PieChart, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatUnits } from 'viem'

interface PoolCardProps {
  tier: RiskTier
  totalValueLocked: bigint
  availableLiquidity: bigint
  targetAPY: number
  utilizationRate: number
  isAcceptingDeposits: boolean
  remainingCapacity: bigint
}

export function PoolCard({
  tier,
  totalValueLocked,
  availableLiquidity,
  targetAPY,
  utilizationRate,
  isAcceptingDeposits,
  remainingCapacity,
}: PoolCardProps) {
  const tierInfo = getTierInfo(tier)

  const getColorClasses = () => {
    switch (tier) {
      case RiskTier.TIER_A:
        return {
          border: 'border-emerald-200',
          bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: 'bg-emerald-100 text-emerald-600',
          button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
          ring: 'ring-emerald-200',
          glow: 'from-emerald-100/30 to-teal-100/30',
        }
      case RiskTier.TIER_B:
        return {
          border: 'border-amber-200',
          bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: 'bg-amber-100 text-amber-600',
          button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
          ring: 'ring-amber-200',
          glow: 'from-amber-100/30 to-orange-100/30',
        }
      case RiskTier.TIER_C:
        return {
          border: 'border-rose-200',
          bg: 'bg-gradient-to-br from-rose-50 via-white to-red-50',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: 'bg-rose-100 text-rose-600',
          button: 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
          ring: 'ring-rose-200',
          glow: 'from-rose-100/30 to-red-100/30',
        }
    }
  }

  const colors = getColorClasses()
  const tvl = parseFloat(formatUnits(totalValueLocked, 6))
  const available = parseFloat(formatUnits(availableLiquidity, 6))
  const capacity = parseFloat(formatUnits(remainingCapacity, 6))

  return (
    <Card
      className={`relative overflow-hidden ${colors.border} ${colors.bg} border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:${colors.ring} hover:ring-4`}
    >
      {/* Background glow effect */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${colors.glow} rounded-full blur-3xl opacity-50`}></div>

      <CardHeader className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${colors.icon} rounded-xl text-2xl`}>{tierInfo.icon}</div>
            <div>
              <CardTitle className="text-xl">{tierInfo.name}</CardTitle>
              <CardDescription className="text-sm">{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge className={`${colors.badge} border px-3 py-1`}>{tierInfo.riskLevel}</Badge>
        </div>

        {/* APY Display */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Target APY</span>
            <APYDisplay apy={targetAPY} size="lg" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Pool Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">TVL</span>
            </div>
            <p className="text-lg font-bold text-slate-900">${tvl.toLocaleString()}</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Available</span>
            </div>
            <p className="text-lg font-bold text-slate-900">${available.toLocaleString()}</p>
          </div>
        </div>

        {/* Utilization Rate */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 font-medium">Utilization Rate</span>
            <span className="text-sm font-bold text-slate-900">{utilizationRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${tierInfo.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(utilizationRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Status Banner */}
        {!isAcceptingDeposits ? (
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-300">
            <Lock className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-700 font-medium">Deposits Paused</span>
          </div>
        ) : capacity < 1000 ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">Limited Capacity: ${capacity.toLocaleString()}</span>
          </div>
        ) : null}

        {/* CTA Button */}
        <Button
          asChild
          disabled={!isAcceptingDeposits}
          className={`w-full group relative overflow-hidden bg-gradient-to-r ${colors.button} text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 h-12`}
        >
          <Link href={`/investor/deposit?tier=${tier}`} className="flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <span className="relative z-10 font-bold">Deposit Now</span>
            <ArrowRight className="ml-2 w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
