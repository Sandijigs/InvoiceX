'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RiskTier } from '@/lib/abis/LiquidityPool'
import { useLiquidityPool } from '@/hooks/useLiquidityPool'
import { getTierInfo } from '@/hooks/usePoolMetrics'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { parseUnits, formatUnits } from 'viem'
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  TrendingUp,
  Shield,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export default function DepositPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const chainId = mantleSepoliaTestnet.id

  // Get tier from URL params (default to TIER_A)
  const tierParam = searchParams.get('tier')
  const selectedTier = useMemo(() => {
    if (tierParam === '1') return RiskTier.TIER_B
    if (tierParam === '2') return RiskTier.TIER_C
    return RiskTier.TIER_A
  }, [tierParam])

  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'input' | 'approve' | 'deposit' | 'success'>('input')

  const tierInfo = getTierInfo(selectedTier)
  const { poolData, isLoadingPool, deposit, isDepositing, isDepositConfirmed, depositError } = useLiquidityPool(selectedTier)

  // Get contract addresses
  const liquidityPoolAddress = getContractAddress(chainId, 'liquidityPool') as `0x${string}`
  const usdtAddress = getContractAddress(chainId, 'mockUSDT') as `0x${string}`

  // Read USDT balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: usdtAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read USDT allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, liquidityPoolAddress] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Approve USDT
  const {
    writeContract: approveWrite,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  // Handle approval confirmation
  useEffect(() => {
    console.log('Approval status:', { isApprovalConfirmed, approveHash })
    if (isApprovalConfirmed) {
      console.log('✅ Approval confirmed! Moving to deposit step...')
      refetchAllowance()
      setStep('deposit')
    }
  }, [isApprovalConfirmed, refetchAllowance, approveHash])

  // Handle deposit confirmation
  useEffect(() => {
    console.log('Deposit status:', { isDepositConfirmed, isDepositing })
    if (isDepositConfirmed) {
      console.log('✅ Deposit confirmed! Showing success screen...')
      setStep('success')
      refetchBalance()
      refetchAllowance()
    }
  }, [isDepositConfirmed, refetchBalance, refetchAllowance, isDepositing])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to make a deposit</CardDescription>
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

  const amountBigInt = amount ? parseUnits(amount, 6) : BigInt(0)
  const balanceBigInt = (balance as bigint) || BigInt(0)
  const allowanceBigInt = (allowance as bigint) || BigInt(0)
  const hasEnoughBalance = balanceBigInt >= amountBigInt && amountBigInt > BigInt(0)
  const hasEnoughAllowance = allowanceBigInt >= amountBigInt
  const needsApproval = amountBigInt > BigInt(0) && !hasEnoughAllowance

  const minDeposit = poolData?.minDeposit || BigInt(0)
  const maxDeposit = poolData?.maxDeposit || BigInt(0)
  const meetsMinDeposit = amountBigInt >= minDeposit
  const meetsMaxDeposit = amountBigInt <= maxDeposit

  const canProceed = hasEnoughBalance && meetsMinDeposit && meetsMaxDeposit

  const handleApprove = async () => {
    if (!canProceed) {
      console.error('Cannot proceed with approval - validation failed')
      return
    }

    console.log('🔨 Starting approval...', {
      amount: amount,
      amountBigInt: amountBigInt.toString(),
      spender: liquidityPoolAddress,
    })

    setStep('approve')
    approveWrite({
      address: usdtAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [liquidityPoolAddress, amountBigInt],
    })
  }

  const handleDeposit = async () => {
    if (!canProceed || !hasEnoughAllowance) {
      console.error('Cannot proceed with deposit', { canProceed, hasEnoughAllowance })
      return
    }

    console.log('💰 Starting deposit...', {
      tier: selectedTier,
      amount: amount,
      amountBigInt: amountBigInt.toString(),
    })

    try {
      await deposit(amountBigInt)
      console.log('Deposit transaction sent')
    } catch (error) {
      console.error('Deposit error:', error)
    }
  }

  const handleMaxClick = () => {
    const maxAmount = balanceBigInt < maxDeposit ? balanceBigInt : maxDeposit
    setAmount(formatUnits(maxAmount, 6))
  }

  const getColorClasses = () => {
    switch (selectedTier) {
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

  const colors = getColorClasses()

  if (step === 'success') {
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

              <h2 className="text-3xl font-black text-slate-900 mb-3">Deposit Successful!</h2>
              <p className="text-lg text-slate-600 mb-8">
                Your funds have been deposited to {tierInfo.name}
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
                <div className="text-4xl font-black text-emerald-600 mb-2">
                  ${parseFloat(amount).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Deposited to {tierInfo.name}</div>
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
            Deposit to {tierInfo.name}
          </h1>
          <p className="text-lg text-slate-600">
            Earn {tierInfo.apyRange} APY by providing liquidity
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className={`border-2 ${colors.border} ${colors.bg} shadow-xl`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Deposit Amount</CardTitle>
                    <CardDescription>Enter the amount of USDT to deposit</CardDescription>
                  </div>
                  <Badge className={`${colors.text} bg-white border-2 ${colors.border}`}>
                    {tierInfo.riskLevel} Risk
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount" className="text-base font-semibold">
                      Amount (USDT)
                    </Label>
                    <button
                      onClick={handleMaxClick}
                      className={`text-sm font-semibold ${colors.text} hover:underline`}
                    >
                      Max: ${parseFloat(formatUnits(balanceBigInt, 6)).toLocaleString()}
                    </button>
                  </div>

                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-16 text-2xl font-bold pl-12 pr-20 border-2"
                      step="0.01"
                      min="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Badge variant="outline" className="font-semibold">USDT</Badge>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {amount && !meetsMinDeposit && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Minimum deposit is ${parseFloat(formatUnits(minDeposit, 6)).toLocaleString()} USDT</span>
                    </div>
                  )}

                  {amount && !meetsMaxDeposit && (
                    <div className="flex items-center gap-2 text-rose-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Maximum deposit is ${parseFloat(formatUnits(maxDeposit, 6)).toLocaleString()} USDT</span>
                    </div>
                  )}

                  {amount && !hasEnoughBalance && (
                    <div className="flex items-center gap-2 text-rose-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Insufficient USDT balance</span>
                    </div>
                  )}
                </div>

                {/* Progress Steps */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'approve' || step === 'deposit' || needsApproval
                        ? `bg-gradient-to-r ${colors.gradient} text-white`
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : '1'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Approve USDT</div>
                      <div className="text-sm text-slate-600">
                        {hasEnoughAllowance ? 'Approved ✓' : 'Allow LiquidityPool to spend your USDT'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'deposit' || isDepositing
                        ? `bg-gradient-to-r ${colors.gradient} text-white`
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step === 'deposit' && isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : '2'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Confirm Deposit</div>
                      <div className="text-sm text-slate-600">Deposit USDT to the pool</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {needsApproval && step !== 'deposit' ? (
                    <Button
                      onClick={handleApprove}
                      disabled={!canProceed || isApproving || isConfirmingApproval}
                      className={`w-full h-12 text-base font-bold bg-gradient-to-r ${colors.button}`}
                    >
                      {isApproving || isConfirmingApproval ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isApproving ? 'Approving...' : 'Confirming...'}
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Approve USDT
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDeposit}
                      disabled={!canProceed || !hasEnoughAllowance || isDepositing}
                      className={`w-full h-12 text-base font-bold bg-gradient-to-r ${colors.button}`}
                    >
                      {isDepositing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Depositing...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Deposit {amount ? `$${parseFloat(amount).toLocaleString()}` : 'USDT'}
                        </>
                      )}
                    </Button>
                  )}

                  {(approveError || depositError) && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-rose-800">
                        <div className="font-semibold mb-1">Transaction Failed</div>
                        <div className="text-rose-700">
                          {approveError?.message || depositError?.message || 'An error occurred. Please try again.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Pool Info */}
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Pool Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Target APY</span>
                  <span className={`font-bold ${colors.text}`}>{tierInfo.apyRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Risk Level</span>
                  <Badge variant="outline">{tierInfo.riskLevel}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Min Deposit</span>
                  <span className="font-semibold">${parseFloat(formatUnits(minDeposit, 6)).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Max Deposit</span>
                  <span className="font-semibold">${parseFloat(formatUnits(maxDeposit, 6)).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Expected Returns */}
            {amount && canProceed && (
              <Card className={`border-2 ${colors.border} ${colors.bg}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Expected Returns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center p-4 bg-white/60 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Estimated Yearly Earnings</div>
                    <div className={`text-2xl font-black ${colors.text}`}>
                      ${(parseFloat(amount) * (poolData?.targetAPY ? Number(poolData.targetAPY) / 10000 : 0.1)).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-center">
                    Based on {(poolData?.targetAPY ? Number(poolData.targetAPY) / 100 : 10)}% APY
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Box */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 space-y-2">
                    <p className="font-semibold">How it works:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Deposit USDT to earn yield</li>
                      <li>Funds are used to finance verified invoices</li>
                      <li>Earn yield when invoices are paid</li>
                      <li>Withdraw anytime (subject to liquidity)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
