'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { useLiquidityPool } from '@/hooks/useLiquidityPool'
import { useUserPosition } from '@/hooks/useUserPosition'
import { getTierInfo } from '@/hooks/usePoolMetrics'
import { formatUnits, parseUnits } from 'viem'
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  TrendingDown,
  DollarSign,
  PieChart
} from 'lucide-react'
import Link from 'next/link'

export default function WithdrawPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  const [selectedTier, setSelectedTier] = useState<RiskTier>(RiskTier.TIER_A)
  const [withdrawType, setWithdrawType] = useState<'amount' | 'shares'>('amount')
  const [inputValue, setInputValue] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const tierInfo = getTierInfo(selectedTier)
  const { withdraw, isWithdrawing, isWithdrawConfirmed, withdrawError } = useLiquidityPool(selectedTier)
  const { positionData, metrics, isLoading: isLoadingPosition } = useUserPosition(selectedTier)

  // Handle withdrawal confirmation
  useEffect(() => {
    if (isWithdrawConfirmed) {
      setIsSuccess(true)
    }
  }, [isWithdrawConfirmed])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to withdraw funds</CardDescription>
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

  const hasPosition = metrics.hasPosition
  const userShares = metrics.shares
  const currentValue = metrics.currentValue

  // Calculate withdraw amounts
  const inputBigInt = inputValue ? parseUnits(inputValue, withdrawType === 'amount' ? 6 : 18) : BigInt(0)

  let sharesToWithdraw = BigInt(0)
  let expectedAmount = BigInt(0)

  if (withdrawType === 'amount') {
    // User entered USDT amount, calculate shares needed
    if (currentValue > BigInt(0) && inputBigInt > BigInt(0)) {
      sharesToWithdraw = (inputBigInt * userShares) / currentValue
      expectedAmount = inputBigInt
    }
  } else {
    // User entered shares, calculate USDT amount
    sharesToWithdraw = inputBigInt
    if (userShares > BigInt(0) && inputBigInt > BigInt(0)) {
      expectedAmount = (inputBigInt * currentValue) / userShares
    }
  }

  const canWithdraw = sharesToWithdraw > BigInt(0) && sharesToWithdraw <= userShares

  const handleWithdraw = async () => {
    if (!canWithdraw) return

    try {
      await withdraw(sharesToWithdraw)
    } catch (error) {
      console.error('Withdraw error:', error)
    }
  }

  const handleMaxClick = () => {
    if (withdrawType === 'amount') {
      setInputValue(formatUnits(currentValue, 6))
    } else {
      setInputValue(formatUnits(userShares, 18))
    }
  }

  const getColorClasses = (tier: RiskTier) => {
    switch (tier) {
      case RiskTier.TIER_A:
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
        }
      case RiskTier.TIER_B:
        return {
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
        }
      case RiskTier.TIER_C:
        return {
          gradient: 'from-rose-500 to-red-600',
          bg: 'bg-gradient-to-br from-rose-50 via-white to-red-50',
          border: 'border-rose-200',
          text: 'text-rose-600',
          button: 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
        }
    }
  }

  const colors = getColorClasses(selectedTier)

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-2 border-emerald-200 shadow-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-3">Withdrawal Successful!</h2>
              <p className="text-lg text-slate-600 mb-8">
                Your funds have been withdrawn from {tierInfo.name}
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
                <div className="text-4xl font-black text-emerald-600 mb-2">
                  ${parseFloat(formatUnits(expectedAmount, 6)).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Withdrawn from {tierInfo.name}</div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  asChild
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  <Link href="/investor">View Dashboard</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12"
                >
                  <Link href="/investor/portfolio">View Portfolio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
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
            Withdraw Funds
          </h1>
          <p className="text-lg text-slate-600">
            Withdraw your liquidity from any pool
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tier Selection */}
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle>Select Pool</CardTitle>
                <CardDescription>Choose which pool to withdraw from</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedTier.toString()} onValueChange={(val) => {
                  setSelectedTier(parseInt(val) as RiskTier)
                  setInputValue('')
                }}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="0" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      🛡️ Tier A
                    </TabsTrigger>
                    <TabsTrigger value="1" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                      ⚖️ Tier B
                    </TabsTrigger>
                    <TabsTrigger value="2" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                      🚀 Tier C
                    </TabsTrigger>
                  </TabsList>

                  {[RiskTier.TIER_A, RiskTier.TIER_B, RiskTier.TIER_C].map((tier) => {
                    const tierColors = getColorClasses(tier)
                    const tierData = getTierInfo(tier)

                    return (
                      <TabsContent key={tier} value={tier.toString()} className="mt-4">
                        <div className={`${tierColors.bg} border-2 ${tierColors.border} rounded-xl p-4 space-y-2`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Pool</span>
                            <Badge className={tierColors.text}>{tierData.name}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Your Position</span>
                            <span className="font-bold">${parseFloat(formatUnits(currentValue, 6)).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Your Shares</span>
                            <span className="font-bold">{parseFloat(formatUnits(userShares, 18)).toFixed(6)}</span>
                          </div>
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>

            {/* Withdraw Form */}
            {!hasPosition ? (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-900 mb-1">No Position Found</div>
                      <p className="text-sm text-amber-800">
                        You don't have any funds deposited in {tierInfo.name}.
                        <Link href="/investor/deposit" className="underline ml-1 font-semibold">
                          Make a deposit
                        </Link>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-2 ${colors.border} ${colors.bg} shadow-xl`}>
                <CardHeader>
                  <CardTitle className="text-2xl">Withdraw Amount</CardTitle>
                  <CardDescription>Choose to withdraw by amount or shares</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Withdraw Type Toggle */}
                  <Tabs value={withdrawType} onValueChange={(val) => {
                    setWithdrawType(val as 'amount' | 'shares')
                    setInputValue('')
                  }}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="amount">
                        <DollarSign className="w-4 h-4 mr-2" />
                        By Amount
                      </TabsTrigger>
                      <TabsTrigger value="shares">
                        <PieChart className="w-4 h-4 mr-2" />
                        By Shares
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Amount Input */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount" className="text-base font-semibold">
                        {withdrawType === 'amount' ? 'Amount (USDT)' : 'Shares'}
                      </Label>
                      <button
                        onClick={handleMaxClick}
                        className={`text-sm font-semibold ${colors.text} hover:underline`}
                      >
                        Max: {withdrawType === 'amount'
                          ? `$${parseFloat(formatUnits(currentValue, 6)).toLocaleString()}`
                          : parseFloat(formatUnits(userShares, 18)).toFixed(6)
                        }
                      </button>
                    </div>

                    <div className="relative">
                      {withdrawType === 'amount' && (
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      )}
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={`h-16 text-2xl font-bold ${withdrawType === 'amount' ? 'pl-12' : 'pl-4'} pr-20 border-2`}
                        step={withdrawType === 'amount' ? '0.01' : '0.000001'}
                        min="0"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Badge className="font-semibold">
                          {withdrawType === 'amount' ? 'USDT' : 'SHARES'}
                        </Badge>
                      </div>
                    </div>

                    {/* Preview */}
                    {inputValue && canWithdraw && (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="text-sm font-semibold text-slate-600 mb-3">Withdrawal Preview</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">You will receive</span>
                          <span className="font-bold text-lg">
                            ${parseFloat(formatUnits(expectedAmount, 6)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Shares to burn</span>
                          <span className="font-semibold">
                            {parseFloat(formatUnits(sharesToWithdraw, 18)).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Remaining position</span>
                          <span className="font-semibold">
                            ${parseFloat(formatUnits(currentValue - expectedAmount, 6)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Validation */}
                    {inputValue && !canWithdraw && (
                      <div className="flex items-center gap-2 text-rose-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Insufficient shares. Max: {parseFloat(formatUnits(userShares, 18)).toFixed(6)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleWithdraw}
                      disabled={!canWithdraw || isWithdrawing}
                      className={`w-full h-12 text-base font-bold bg-gradient-to-r ${colors.button}`}
                    >
                      {isWithdrawing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Withdraw {inputValue && canWithdraw ? `$${parseFloat(formatUnits(expectedAmount, 6)).toLocaleString()}` : 'Funds'}
                        </>
                      )}
                    </Button>

                    {withdrawError && (
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-rose-800">
                          <div className="font-semibold mb-1">Withdrawal Failed</div>
                          <div className="text-rose-700">
                            {withdrawError.message || 'An error occurred. Please try again.'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Position Summary */}
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Your Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Current Value</span>
                  <span className="font-bold">${parseFloat(formatUnits(currentValue, 6)).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Deposited</span>
                  <span className="font-semibold">${parseFloat(formatUnits(metrics.depositedValue, 6)).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Profit/Loss</span>
                  <span className={`font-bold ${metrics.profitLoss >= BigInt(0) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {metrics.profitLoss >= BigInt(0) ? '+' : ''}${parseFloat(formatUnits(metrics.profitLoss, 6)).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Pending Yield</span>
                  <span className="font-semibold text-emerald-600">
                    ${parseFloat(formatUnits(metrics.pendingYield, 6)).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 space-y-2">
                    <p className="font-semibold">Important Notes:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Withdrawals are subject to available liquidity</li>
                      <li>Pending yield will be automatically claimed</li>
                      <li>Your shares will be burned proportionally</li>
                      <li>Partial withdrawals are supported</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/investor/portfolio">
                    <Wallet className="w-4 h-4 mr-2" />
                    View Portfolio
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/investor/deposit">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Make Deposit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
