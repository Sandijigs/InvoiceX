'use client'

import { useState } from 'react'
import { useAccount, useReadContracts, useBlockNumber } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LIQUIDITY_POOL_ABI, RiskTier } from '@/lib/abis/LiquidityPool'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'
import { getTierInfo } from '@/hooks/usePoolMetrics'
import { formatUnits } from 'viem'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  RefreshCw,
  ExternalLink,
  Clock,
  Filter,
  Search,
  Calendar
} from 'lucide-react'

interface TransactionDisplay {
  id: string
  type: 'deposit' | 'withdraw' | 'yield_claimed' | 'yield_compounded'
  tier: RiskTier
  amount: string
  shares?: string
  timestamp: number
  txHash?: string
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const chainId = mantleSepoliaTestnet.id

  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdraw' | 'yield'>('all')
  const [selectedTier, setSelectedTier] = useState<'all' | RiskTier>('all')

  // Get current block number for recent events
  const { data: blockNumber } = useBlockNumber({ watch: true })

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>Please connect your wallet to view transaction history</CardDescription>
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

  // Mock transaction data - In production, fetch from event logs
  const mockTransactions: TransactionDisplay[] = [
    {
      id: '1',
      type: 'deposit',
      tier: RiskTier.TIER_A,
      amount: '1000.00',
      shares: '1000.00',
      timestamp: Date.now() - 86400000 * 2,
      txHash: '0x123...',
    },
    {
      id: '2',
      type: 'yield_claimed',
      tier: RiskTier.TIER_A,
      amount: '15.50',
      timestamp: Date.now() - 86400000,
      txHash: '0x456...',
    },
    {
      id: '3',
      type: 'deposit',
      tier: RiskTier.TIER_B,
      amount: '500.00',
      shares: '500.00',
      timestamp: Date.now() - 86400000 * 3,
      txHash: '0x789...',
    },
  ]

  const filteredTransactions = mockTransactions.filter((tx) => {
    if (filterType !== 'all') {
      if (filterType === 'yield' && !['yield_claimed', 'yield_compounded'].includes(tx.type)) {
        return false
      }
      if (filterType === 'deposit' && tx.type !== 'deposit') return false
      if (filterType === 'withdraw' && tx.type !== 'withdraw') return false
    }
    if (selectedTier !== 'all' && tx.tier !== selectedTier) {
      return false
    }
    return true
  })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />
      case 'withdraw':
        return <TrendingDown className="w-5 h-5 text-rose-600" />
      case 'yield_claimed':
      case 'yield_compounded':
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <Clock className="w-5 h-5 text-slate-600" />
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit'
      case 'withdraw':
        return 'Withdrawal'
      case 'yield_claimed':
        return 'Yield Claimed'
      case 'yield_compounded':
        return 'Yield Compounded'
      default:
        return 'Transaction'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'withdraw':
        return 'text-rose-600 bg-rose-50 border-rose-200'
      case 'yield_claimed':
      case 'yield_compounded':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
              Transaction History
            </span>
          </h1>
          <p className="text-lg text-slate-600">All your deposits, withdrawals, and yield claims</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transaction Type Filter */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Transaction Type
                  </Label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Transactions' },
                      { value: 'deposit', label: 'Deposits' },
                      { value: 'withdraw', label: 'Withdrawals' },
                      { value: 'yield', label: 'Yield Claims' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterType(option.value as any)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filterType === option.value
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier Filter */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Pool Tier
                  </Label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Tiers', icon: '🌟' },
                      { value: RiskTier.TIER_A, label: 'Tier A', icon: '🛡️' },
                      { value: RiskTier.TIER_B, label: 'Tier B', icon: '⚖️' },
                      { value: RiskTier.TIER_C, label: 'Tier C', icon: '🚀' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTier(option.value as any)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedTier === option.value
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Transactions</span>
                  <span className="font-bold text-slate-900">{mockTransactions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">This Week</span>
                  <span className="font-bold text-emerald-600">
                    {mockTransactions.filter((tx) => Date.now() - tx.timestamp < 7 * 86400000).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-3">
            <Card className="border-2 border-slate-200 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Showing {filteredTransactions.length} of {mockTransactions.length} transactions
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Transactions Found</h3>
                    <p className="text-slate-600 mb-6">
                      {filterType !== 'all' || selectedTier !== 'all'
                        ? 'Try adjusting your filters to see more results.'
                        : 'You haven\'t made any transactions yet.'}
                    </p>
                    {filterType === 'all' && selectedTier === 'all' && (
                      <Button
                        asChild
                        className="bg-gradient-to-r from-emerald-500 to-teal-600"
                      >
                        <Link href="/investor/deposit">Make Your First Deposit</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((tx) => {
                      const tierInfo = getTierInfo(tx.tier)
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200 group"
                        >
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionColor(tx.type)} border-2`}>
                            {getTransactionIcon(tx.type)}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">
                                {getTransactionLabel(tx.type)}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {tierInfo.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(tx.timestamp)}
                              </span>
                              {tx.shares && (
                                <span className="text-slate-400">•</span>
                              )}
                              {tx.shares && (
                                <span>{parseFloat(tx.shares).toFixed(4)} shares</span>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <div className={`text-xl font-bold ${
                              tx.type === 'deposit' ? 'text-emerald-600' :
                              tx.type === 'withdraw' ? 'text-rose-600' :
                              'text-amber-600'
                            }`}>
                              {tx.type === 'deposit' ? '+' : tx.type === 'withdraw' ? '-' : '+'}${tx.amount}
                            </div>
                            {tx.txHash && (
                              <a
                                href={`https://explorer.sepolia.mantle.xyz/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 justify-end mt-1 group-hover:text-emerald-600 transition-colors"
                              >
                                View on Explorer
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Load More */}
                {filteredTransactions.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" disabled>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load More Transactions
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      Event history integration coming soon
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">About Transaction History</p>
                    <p className="text-blue-800 mb-2">
                      This page shows your recent deposits, withdrawals, and yield claims. All transactions are recorded on the Mantle blockchain and can be verified on the block explorer.
                    </p>
                    <p className="text-blue-800">
                      <strong>Note:</strong> Full event history integration is in development. Currently showing sample transactions.
                    </p>
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

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}

// Need to import Link
import Link from 'next/link'
