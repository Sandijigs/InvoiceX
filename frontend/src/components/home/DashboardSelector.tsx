'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useUserRole } from '@/hooks/useUserRole'
import { Badge } from '@/components/ui/badge'

export function DashboardSelector() {
  const { role, isBusiness, isInvestor, isLoading } = useUserRole()

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-64 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Dashboard Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Business Dashboard Card */}
        <Card className="relative overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
          {isBusiness && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-emerald-500 text-white border-none">Your Dashboard</Badge>
            </div>
          )}

          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-full blur-3xl opacity-50"></div>

          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Business Dashboard</CardTitle>
                <CardDescription>For businesses seeking financing</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            <p className="text-slate-700">
              Get instant liquidity for your B2B invoices. Submit invoices, get paid early, and maintain cash flow.
            </p>

            {/* Features */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Submit invoices for financing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Get paid in 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Track invoice status in real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Build your business credit score</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              asChild
              className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 mt-6"
            >
              <Link href="/business" className="flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 font-bold">
                  {isBusiness ? 'Go to Business Dashboard' : 'Start as Business'}
                </span>
                <ArrowRight className="ml-2 w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Investor Dashboard Card */}
        <Card className="relative overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
          {isInvestor && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-blue-500 text-white border-none">Your Dashboard</Badge>
            </div>
          )}

          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl opacity-50"></div>

          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Investor Dashboard</CardTitle>
                <CardDescription>For investors seeking yield</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            <p className="text-slate-700">
              Earn attractive yields by providing liquidity to invoice factoring pools across different risk tiers.
            </p>

            {/* Features */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Earn 8-30% APY based on risk tier</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Choose your risk tolerance (A, B, C)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Auto-compound or claim yield</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">Withdraw funds anytime</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              asChild
              className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 mt-6"
            >
              <Link href="/investor" className="flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 font-bold">
                  {isInvestor ? 'Go to Investor Dashboard' : 'Start as Investor'}
                </span>
                <ArrowRight className="ml-2 w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      {role === 'both' && (
        <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200/50">
          <p className="text-center text-sm text-slate-700">
            <strong>💡 You have access to both dashboards!</strong> Use the navigation menu above to switch between Business and Investor views.
          </p>
        </div>
      )}

      {role === 'none' && (
        <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200/50">
          <p className="text-center text-sm text-amber-900">
            <strong>New to InvoiceX?</strong> Choose a dashboard above to get started. You can always switch or use both later!
          </p>
        </div>
      )}
    </div>
  )
}
