'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react'
import { useInsurancePool } from '@/hooks/useInsurance'
import { useAccount } from 'wagmi'

const LOCK_PERIODS = [
  { days: 30, label: '30 Days', bonus: '1.0x' },
  { days: 90, label: '90 Days', bonus: '1.2x' },
  { days: 180, label: '180 Days', bonus: '1.5x' },
  { days: 365, label: '1 Year', bonus: '2.0x' },
]

export function StakeForm() {
  const { isConnected } = useAccount()
  const { stake, isLoading, isSuccess, apy } = useInsurancePool()

  const [amount, setAmount] = useState('')
  const [lockDays, setLockDays] = useState('30')

  const selectedPeriod = LOCK_PERIODS.find((p) => p.days.toString() === lockDays)

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    await stake(amount, parseInt(lockDays))
  }

  const calculateProjectedYield = () => {
    if (!amount || parseFloat(amount) <= 0) return '0'
    const amountNum = parseFloat(amount)
    const apyNum = parseFloat(apy)
    const daysNum = parseInt(lockDays)
    const bonusMultiplier = parseFloat(selectedPeriod?.bonus.replace('x', '') || '1')

    const yearlyYield = (amountNum * apyNum) / 100
    const periodYield = (yearlyYield * daysNum) / 365
    const bonusYield = periodYield * bonusMultiplier

    return bonusYield.toFixed(2)
  }

  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            Stake Successful!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your tokens have been staked successfully. You'll start earning yield immediately!
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-emerald-500 to-green-600"
          >
            Stake More
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-600" />
          Stake USDT
        </CardTitle>
        <CardDescription>
          Earn {apy}% APY by providing insurance liquidity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStake} className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDT)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum stake: 100 USDT
            </p>
          </div>

          {/* Lock Period */}
          <div className="space-y-2">
            <Label htmlFor="lockPeriod">Lock Period</Label>
            <Select value={lockDays} onValueChange={setLockDays} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCK_PERIODS.map((period) => (
                  <SelectItem key={period.days} value={period.days.toString()}>
                    {period.label} - {period.bonus} APY Bonus
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Longer lock periods earn higher yields
            </p>
          </div>

          {/* Projected Yield */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-emerald-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <TrendingUp className="h-4 w-4" />
                <span>Projected Earnings</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base APY</p>
                  <p className="font-semibold">{apy}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bonus Multiplier</p>
                  <p className="font-semibold text-emerald-600">{selectedPeriod?.bonus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lock Duration</p>
                  <p className="font-semibold">{selectedPeriod?.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Yield</p>
                  <p className="font-semibold text-emerald-600">
                    ${calculateProjectedYield()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <Alert className="border-orange-200 bg-orange-50">
            <Calendar className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Note:</strong> Your tokens will be locked for {selectedPeriod?.label.toLowerCase()}.
              You won't be able to unstake until the lock period ends.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isConnected || isLoading || !amount}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
          >
            {isLoading ? 'Staking...' : `Stake ${amount || '0'} USDT`}
          </Button>

          {!isConnected && (
            <p className="text-sm text-center text-muted-foreground">
              Please connect your wallet to stake
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
