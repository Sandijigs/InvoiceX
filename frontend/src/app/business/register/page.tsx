'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { BusinessRegistrationForm } from '@/components/business/BusinessRegistrationForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function RegisterBusinessPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isRegistered, isCheckingRegistration, isRegistrationConfirmed } = useBusinessRegistry()

  // Redirect if already registered
  useEffect(() => {
    if (isRegistered || isRegistrationConfirmed) {
      router.push('/business')
    }
  }, [isRegistered, isRegistrationConfirmed, router])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Wallet Not Connected</CardTitle>
            <CardDescription>
              Please connect your wallet to register your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Checking registration status...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        {/* Back Button */}
        <Button
          asChild
          variant="ghost"
          className="mb-6"
        >
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            Register Your <span className="text-emerald-600">Business</span>
          </h1>
          <p className="text-lg text-slate-600">
            Complete your business registration to access invoice financing on InvoiceX
          </p>
        </div>

        {/* Registration Form */}
        <BusinessRegistrationForm />

        {/* Info Card */}
        <Card className="mt-8 border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-indigo-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-indigo-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Complete your business registration form</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Submit KYB (Know Your Business) documents for verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Once verified, start submitting invoices and getting instant liquidity</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
