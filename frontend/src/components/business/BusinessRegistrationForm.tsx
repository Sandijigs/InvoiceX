'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, Loader2, CheckCircle } from 'lucide-react'
import { keccak256, encodePacked } from 'viem'

export function BusinessRegistrationForm() {
  const router = useRouter()
  const { registerBusiness, isRegistering, isRegistrationConfirmed, registerError, refetchRegistration } = useBusinessRegistry()

  // Auto-redirect after successful registration
  useEffect(() => {
    if (isRegistrationConfirmed) {
      const timer = setTimeout(() => {
        refetchRegistration()
        router.push('/business')
      }, 3000) // Wait 3 seconds before redirect
      return () => clearTimeout(timer)
    }
  }, [isRegistrationConfirmed, router, refetchRegistration])

  const [formData, setFormData] = useState({
    businessName: '',
    taxId: '',
    industry: '',
    registrationNumber: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Create business metadata object
      const businessMetadata = {
        name: formData.businessName,
        taxId: formData.taxId,
        industry: formData.industry,
        registrationNumber: formData.registrationNumber,
        registeredAt: Date.now()
      }

      // Create a hash of the business data (in production, this would be a ZK proof)
      const businessHash = keccak256(
        encodePacked(
          ['string', 'string', 'string', 'string'],
          [formData.businessName, formData.taxId, formData.industry, formData.registrationNumber]
        )
      ) as `0x${string}`

      // In production, this would be an IPFS URI containing encrypted business documents
      // For now, we'll use a JSON string as the URI
      const businessURI = JSON.stringify(businessMetadata)

      console.log('Submitting business registration:', {
        businessHash,
        businessURI: businessMetadata
      })

      await registerBusiness(businessHash, businessURI)
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  if (isRegistrationConfirmed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <CardTitle className="text-emerald-900">Registration Successful! 🎉</CardTitle>
          </div>
          <CardDescription className="text-emerald-700">
            Your business has been registered on the blockchain. Redirecting you to the dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">What happens next?</p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>Your business is now registered (Status: PENDING)</li>
                <li>Complete KYB verification to unlock full features</li>
                <li>Once verified, start submitting invoices for financing</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Register Your Business</CardTitle>
            <CardDescription>
              Complete your business registration to start using InvoiceX
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              placeholder="Enter your business name"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID *</Label>
            <Input
              id="taxId"
              placeholder="Enter your tax ID"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500">
              Your business tax identification number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Business Registration Number *</Label>
            <Input
              id="registrationNumber"
              placeholder="Enter your registration number"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500">
              Official business registration number from your jurisdiction
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry *</Label>
            <Input
              id="industry"
              placeholder="e.g., Technology, Manufacturing"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              required
            />
          </div>

          {registerError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-2">Registration Error</p>
              <p className="text-sm text-red-800">
                {registerError.message || 'Registration failed. Please try again.'}
              </p>
              {registerError.message?.includes('timeout') && (
                <p className="text-xs text-red-700 mt-2">
                  The transaction took too long to confirm. Please check your wallet and the block explorer to see if the transaction went through.
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Business'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
