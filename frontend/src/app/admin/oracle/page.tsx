'use client'

import { AdminRoute } from '@/components/admin/AdminRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, TrendingUp, CheckCircle2, Database } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAdminActions } from '@/hooks/useAdminData'

export default function OracleManagementPage() {
  const [entityAddress, setEntityAddress] = useState('')
  const [creditScore, setCreditScore] = useState('')

  const { setCreditScore: submitCreditScore, isLoading, isSuccess } = useAdminActions()

  // Clear form on success
  useEffect(() => {
    if (isSuccess) {
      setEntityAddress('')
      setCreditScore('')
    }
  }, [isSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!entityAddress || !creditScore) {
      alert('Please fill in all fields')
      return
    }

    const score = parseInt(creditScore)
    if (score < 0 || score > 1000) {
      alert('Credit score must be between 0 and 1000')
      return
    }

    await submitCreditScore(entityAddress as `0x${string}`, score)
  }

  return (
    <AdminRoute requiredRole="oracle">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Oracle Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Submit and manage credit scores for entities
          </p>
        </div>

        {isSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Credit score submitted successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Credit Score */}
        <Card className="mb-8 border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Submit Credit Score
            </CardTitle>
            <CardDescription>
              Update credit scores for buyers or businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Buyer Hash or Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={entityAddress}
                  onChange={(e) => setEntityAddress(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the buyer's hash (bytes32) or address for credit assessment
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="score">Credit Score (0-1000)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="1000"
                  placeholder="750"
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Higher scores indicate better creditworthiness
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600"
              >
                {isLoading ? 'Submitting...' : 'Submit Credit Score'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { address: '0x1234...5678', score: 850, time: '2 hours ago' },
                { address: '0xabcd...ef01', score: 720, time: '5 hours ago' },
                { address: '0x9876...5432', score: 680, time: '1 day ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-mono text-sm">{item.address}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">{item.score}</p>
                    <p className="text-xs text-muted-foreground">Credit Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  )
}
