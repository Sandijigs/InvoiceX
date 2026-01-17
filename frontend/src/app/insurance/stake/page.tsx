'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { StakeForm } from '@/components/insurance/StakeForm'
import { InsurancePoolStats } from '@/components/insurance/InsurancePoolStats'
import { useRouter } from 'next/navigation'

export default function StakePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
          Stake USDT
        </h1>
        <p className="text-muted-foreground mt-2">
          Provide insurance liquidity and earn yield
        </p>
      </div>

      {/* Pool Stats */}
      <div className="mb-8">
        <InsurancePoolStats />
      </div>

      {/* Stake Form */}
      <StakeForm />
    </div>
  )
}
