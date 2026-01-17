'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, TrendingUp, Lock, ChevronRight, Info } from 'lucide-react'
import { InsurancePoolStats } from '@/components/insurance/InsurancePoolStats'
import { useInsurancePool } from '@/hooks/useInsurance'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { formatUnits } from 'viem'

export default function InsurancePage() {
  const { isConnected } = useAccount()
  const { stakerPosition, isLoadingStaker, hasStaked, hasPendingYield, lockTimeRemaining, claimYield, isLoading } = useInsurancePool()

  const formatCurrency = (amount: bigint | undefined) => {
    if (!amount) return '$0.00'
    try {
      const formatted = formatUnits(amount, 6)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(parseFloat(formatted))
    } catch (error) {
      console.error('Error formatting currency:', error)
      return '$0.00'
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

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
          Insurance Pool
        </h1>
        <p className="text-muted-foreground mt-2">
          Protect liquidity providers and earn yield by staking USDT
        </p>
      </div>

      {/* Pool Stats */}
      <div className="mb-8">
        <InsurancePoolStats />
      </div>

      {/* User Position (if staked) */}
      {isConnected && hasStaked && stakerPosition && (
        <Card className="mb-8 border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Shield className="h-5 w-5" />
              Your Staking Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Staked Amount */}
              <div>
                <p className="text-sm text-muted-foreground">Staked Amount</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stakerPosition.stakedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {safeBigIntToString(stakerPosition.shares)} shares
                </p>
              </div>

              {/* Pending Yield */}
              <div>
                <p className="text-sm text-muted-foreground">Pending Yield</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stakerPosition.pendingYield)}
                </p>
                {hasPendingYield && (
                  <Button
                    onClick={() => claimYield()}
                    disabled={isLoading}
                    size="sm"
                    className="mt-2 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Claiming...' : 'Claim Yield'}
                  </Button>
                )}
              </div>

              {/* Lock Status */}
              <div>
                <p className="text-sm text-muted-foreground">Lock Status</p>
                {lockTimeRemaining && !lockTimeRemaining.unlocked ? (
                  <>
                    <p className="text-2xl font-bold text-orange-600">
                      {lockTimeRemaining.days}d {lockTimeRemaining.hours}h
                    </p>
                    <Badge className="mt-1 bg-orange-100 text-orange-700">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-600">Unlocked</p>
                    <Badge className="mt-1 bg-green-100 text-green-700">
                      Available to unstake
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Total Yield Claimed */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">Total Yield Claimed (All Time)</p>
              <p className="text-xl font-semibold text-emerald-600">
                {formatCurrency(stakerPosition.totalYieldClaimed)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/insurance/stake">
          <Card className="border-emerald-100 hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-600" />
                  <span>Stake</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stake USDT to earn yield and provide insurance coverage
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/insurance/coverage">
          <Card className="border-emerald-100 hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span>Coverage</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Purchase insurance coverage for your invoices
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-emerald-100 hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Claim your staking rewards
            </p>
            <Button
              onClick={() => claimYield()}
              disabled={!hasPendingYield || isLoading || !isConnected}
              variant="outline"
              className="w-full border-green-200"
            >
              {isLoading ? 'Claiming...' : 'Claim Rewards'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-600" />
            How Insurance Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                For Stakers
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Stake USDT to provide insurance liquidity</li>
                <li>• Earn yield from insurance premiums</li>
                <li>• Longer lock periods = higher APY bonuses</li>
                <li>• Withdraw after lock period ends</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                For Invoice Holders
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Purchase coverage for your invoices</li>
                <li>• Protection against buyer defaults</li>
                <li>• 3 tiers: Basic (50%), Standard (75%), Premium (100%)</li>
                <li>• File claims if invoice defaults occur</li>
              </ul>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h4 className="font-semibold text-emerald-700 mb-2">Coverage Tiers</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold">Basic</p>
                <p className="text-muted-foreground">50% coverage • 0.5% premium</p>
              </div>
              <div>
                <p className="font-semibold">Standard</p>
                <p className="text-muted-foreground">75% coverage • 1.0% premium</p>
              </div>
              <div>
                <p className="font-semibold">Premium</p>
                <p className="text-muted-foreground">100% coverage • 1.5% premium</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
