'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useInsurancePool } from '@/hooks/useInsurance'
import { formatUnits } from 'viem'

export function InsurancePoolStats() {
  const { poolMetrics, isLoadingMetrics, apy } = useInsurancePool()

  const formatCurrency = (amount: bigint | undefined) => {
    if (!amount) return '$0'
    try {
      const formatted = formatUnits(amount, 6)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(parseFloat(formatted))
    } catch (error) {
      console.error('Error formatting currency:', error)
      return '$0'
    }
  }

  const formatPercentage = (bps: bigint | undefined) => {
    if (!bps) return '0.00%'
    try {
      return (Number(bps) / 100).toFixed(2) + '%'
    } catch (error) {
      console.error('Error formatting percentage:', error)
      return '0.00%'
    }
  }

  const safeBigIntToString = (value: bigint | undefined) => {
    if (!value) return '0'
    try {
      return value.toString()
    } catch (error) {
      console.error('Error converting bigint to string:', error)
      return '0'
    }
  }

  if (isLoadingMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-emerald-100">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!poolMetrics) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Value Locked */}
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Total Value Locked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(poolMetrics.totalStaked)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {safeBigIntToString(poolMetrics.totalShares)} shares
          </p>
        </CardContent>
      </Card>

      {/* Current APY */}
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Current APY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{apy}%</p>
          <p className="text-xs text-muted-foreground mt-1">Annual yield</p>
        </CardContent>
      </Card>

      {/* Active Coverage */}
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Active Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(poolMetrics.activeCoverageAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {safeBigIntToString(poolMetrics.activeCoverageCount)} policies
          </p>
        </CardContent>
      </Card>

      {/* Reserve Ratio */}
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Reserve Ratio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-purple-600">
            {formatPercentage(poolMetrics.reserveRatio)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(poolMetrics.availableCapital)} available
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
