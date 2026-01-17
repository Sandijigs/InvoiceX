'use client'

import { AdminRoute } from '@/components/admin/AdminRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Info, Building2 } from 'lucide-react'
import Link from 'next/link'
import { BusinessVerificationForm } from '@/components/admin/BusinessVerificationForm'

export default function KYBReviewPage() {
  return (
    <AdminRoute requiredRole="kyb">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Business Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify registered businesses and set their initial credit scores
          </p>
        </div>

        {/* How It Works */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>How verification works:</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Businesses register on the platform and receive a unique Business ID</li>
              <li>Enter the Business ID below to view registration details</li>
              <li>Review the business information and metadata</li>
              <li>Set an initial credit score (recommended: 600-700 for new businesses)</li>
              <li>Click "Verify Business" to approve and activate the business</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Verification Form */}
        <BusinessVerificationForm />

        {/* Guidelines */}
        <Card className="mt-8 border-blue-100 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Building2 className="h-5 w-5" />
              Verification Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <div>
              <p className="font-semibold">✅ Verification Checklist:</p>
              <ul className="mt-1 space-y-1 ml-4 list-disc">
                <li>Business hash is valid and matches documentation</li>
                <li>Metadata URI (if provided) contains legitimate business information</li>
                <li>No red flags or suspicious activity detected</li>
                <li>Business meets platform requirements</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">📊 Credit Score Guidelines:</p>
              <ul className="mt-1 space-y-1 ml-4 list-disc">
                <li><strong>700-850:</strong> Excellent - Established businesses with strong documentation</li>
                <li><strong>600-699:</strong> Good - New businesses with complete paperwork</li>
                <li><strong>400-599:</strong> Fair - Startups or businesses with limited history</li>
                <li><strong>Below 400:</strong> Poor - Consider rejecting or requesting additional information</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">⚠️ When to Reject:</p>
              <ul className="mt-1 space-y-1 ml-4 list-disc">
                <li>Missing or invalid business documentation</li>
                <li>Suspicious or fraudulent information detected</li>
                <li>Business fails to meet minimum requirements</li>
                <li>Duplicate or conflicting registrations</li>
              </ul>
            </div>

            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900 text-xs">
                <strong>Note:</strong> Once verified, businesses can immediately start submitting invoices for financing.
                Ensure thorough due diligence is performed before approval.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mt-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900">Q: How do I find Business IDs to verify?</p>
              <p className="text-muted-foreground mt-1">
                A: Business IDs are assigned sequentially starting from 1. New registrations will have higher IDs.
                You can try IDs starting from 1 and incrementing to find pending businesses, or businesses can share
                their ID with you directly.
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Q: What happens after verification?</p>
              <p className="text-muted-foreground mt-1">
                A: Once verified, the business status changes from "Pending" to "Verified" or "Active", and they gain
                access to submit invoices for factoring. Their initial credit score determines their borrowing limits.
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Q: Can I verify a business that's already been verified?</p>
              <p className="text-muted-foreground mt-1">
                A: No, the verification is a one-time action. Once a business is verified, you cannot re-verify it.
                However, you can update their credit score later through the Oracle Management page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  )
}
