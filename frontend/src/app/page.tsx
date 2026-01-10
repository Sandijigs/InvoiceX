'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Zap, TrendingUp, Clock, DollarSign, CheckCircle, Sparkles, ChevronRight, BarChart3, Coins, FileText, Users } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardSelector } from '@/components/home/DashboardSelector'

export default function HomePage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGetStarted = () => {
    if (isConnected) {
      router.push('/business')
    } else {
      // Trigger wallet connection via ConnectButton
      document.querySelector<HTMLButtonElement>('button:has(.h-4.w-4)')?.click()
    }
  }

  if (!mounted) return null

  return (
    <div className="relative overflow-hidden">
      {/* Premium Background with Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/20">
        <div className="absolute inset-0">
          {/* Gradient Mesh Effect */}
          <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px]" />

        {/* Premium Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            >
              <div className="w-1 h-1 bg-emerald-400 rounded-full opacity-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center animate-slide-up">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 backdrop-blur-sm mb-8 group hover:scale-105 transition-all shadow-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-amber-900">
                Powered by Mantle Network
              </span>
              <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Main Heading with Premium Gradient */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tight">
              <span className="block text-slate-900 mb-2">Unlock Your</span>
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Invoice Value
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 blur-2xl opacity-20" />
              </span>
              <span className="block text-slate-900 mt-2">Instantly</span>
            </h1>

            {/* Subtitle with sophisticated typography */}
            <p className="text-xl sm:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Revolutionary DeFi protocol that transforms your
              <span className="font-semibold text-emerald-600"> B2B invoices </span>
              into immediate liquidity. Get paid in
              <span className="font-semibold text-amber-600"> 24 hours </span>
              instead of waiting 90 days.
            </p>

            {/* CTA Buttons with Premium Design */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="group relative px-10 py-6 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-xl hover:shadow-2xl transform transition-all hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Launch App
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="px-10 py-6 text-lg font-semibold border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl transition-all text-slate-700"
              >
                <Link href="/liquidity" className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Provide Liquidity
                </Link>
              </Button>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="group relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    $18.7M
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Total Value Locked</div>
                </div>
              </div>
              <div className="group relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:border-amber-300 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    2,847
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Active Invoices</div>
                </div>
              </div>
              <div className="group relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    5,420
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Premium Cards */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: '#0f172a' }}>
              Why Choose{' '}
              <span style={{ color: '#10b981', fontWeight: '900' }}>
                InvoiceX
              </span>
              ?
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light">
              Experience the future of invoice financing with cutting-edge DeFi technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-amber-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <Zap className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get 85% of invoice value instantly. No bureaucracy, no waiting.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>

            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-indigo-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Trustless</h3>
                <p className="text-slate-600 leading-relaxed">
                  Smart contracts ensure complete transparency and security.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>

            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-emerald-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Best Rates</h3>
                <p className="text-slate-600 leading-relaxed">
                  Dynamic pricing based on real market conditions.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>

            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-teal-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">24/7 Operations</h3>
                <p className="text-slate-600 leading-relaxed">
                  Submit invoices and get funded anytime, anywhere.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>

            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-slate-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Real-Time Analytics</h3>
                <p className="text-slate-600 leading-relaxed">
                  Track your invoices and liquidity with live dashboards.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>

            <div className="group relative p-8 rounded-2xl bg-white border border-slate-200/60 hover:border-emerald-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">KYB Verified</h3>
                <p className="text-slate-600 leading-relaxed">
                  Built-in compliance and business verification.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section with Premium Timeline */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: '#0f172a' }}>
              How It{' '}
              <span style={{ color: '#10b981', fontWeight: '900' }}>
                Works
              </span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light">
              Three simple steps to transform your invoices into instant liquidity
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Premium Connection Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-200 via-amber-200 to-indigo-200 transform -translate-y-1/2 hidden lg:block" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
              {[
                {
                  number: '01',
                  title: 'Submit Invoice',
                  description: 'Upload your B2B invoice and buyer details. Smart contracts verify and tokenize instantly.',
                  icon: FileText,
                  color: 'emerald',
                },
                {
                  number: '02',
                  title: 'Get Instant Funding',
                  description: 'Receive 85% of invoice value immediately from our deep liquidity pools.',
                  icon: Zap,
                  color: 'amber',
                },
                {
                  number: '03',
                  title: 'Automatic Settlement',
                  description: 'When buyer pays, funds are automatically distributed to all parties.',
                  icon: CheckCircle,
                  color: 'indigo',
                },
              ].map((step, index) => (
                <div key={index} className="relative">
                  <div className="text-center group">
                    {/* Number Badge */}
                    <div className="relative inline-flex mb-6">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${
                        step.color === 'emerald' ? 'from-emerald-500 to-emerald-600' :
                        step.color === 'amber' ? 'from-amber-500 to-amber-600' :
                        'from-indigo-500 to-indigo-600'
                      } flex items-center justify-center text-white font-black text-2xl shadow-xl group-hover:scale-110 transition-transform`}>
                        {step.number}
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-br ${
                        step.color === 'emerald' ? 'from-emerald-500 to-emerald-600' :
                        step.color === 'amber' ? 'from-amber-500 to-amber-600' :
                        'from-indigo-500 to-indigo-600'
                      } rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
                    </div>

                    {/* Content Card */}
                    <div className="relative p-6 rounded-2xl bg-white border border-slate-200/60 hover:border-slate-300 hover:shadow-xl transition-all duration-300">
                      <step.icon className={`w-10 h-10 ${
                        step.color === 'emerald' ? 'text-emerald-600' :
                        step.color === 'amber' ? 'text-amber-600' :
                        'text-indigo-600'
                      } mx-auto mb-4`} />
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Step Arrow (except last) */}
                      {index < 2 && (
                        <div className="hidden lg:block absolute top-1/2 -right-4 transform translate-x-full -translate-y-1/2">
                          <ChevronRight className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Selection Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: '#0f172a' }}>
              Choose Your{' '}
              <span style={{ color: '#10b981', fontWeight: '900' }}>
                Dashboard
              </span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light">
              Whether you're looking to finance invoices or provide liquidity, we have the perfect solution for you
            </p>
          </div>

          <DashboardSelector />
        </div>
      </section>

      {/* Final CTA Section - Premium */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-t from-slate-50 to-white">
        <div className="container mx-auto max-w-5xl">
          <div className="relative">
            {/* Main CTA Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 lg:p-16 overflow-hidden shadow-2xl">
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 via-transparent to-amber-600/20 opacity-50" />

              {/* Grid Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:14px_24px]" />

              <div className="relative z-10 text-center">
                {/* Gold Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 backdrop-blur-sm mb-8">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">LIMITED TIME OFFER</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>

                <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
                  Ready to Transform Your
                  <span className="block mt-2" style={{ color: '#10b981', fontWeight: '900' }}>
                    Cash Flow?
                  </span>
                </h2>

                <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light">
                  Join <span className="font-bold text-emerald-400">5,000+</span> businesses already using InvoiceX
                  to unlock instant liquidity from their invoices
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12">
                  <div className="text-center">
                    <div className="text-3xl font-black text-emerald-400">$18M+</div>
                    <div className="text-sm text-slate-400 mt-1">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-400">24hrs</div>
                    <div className="text-sm text-slate-400 mt-1">Avg. Funding</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-teal-400">99.9%</div>
                    <div className="text-sm text-slate-400 mt-1">Uptime</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="group relative px-10 py-6 text-lg font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-2xl hover:shadow-emerald-500/25 transform transition-all hover:scale-105"
                  >
                    <span className="flex items-center gap-2">
                      Launch App
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    asChild
                    className="px-10 py-6 text-lg font-bold text-white hover:bg-white/10 rounded-xl border-2 border-slate-600 hover:border-slate-500 backdrop-blur-sm transition-all"
                  >
                    <Link href="/docs" className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documentation
                    </Link>
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Audited Smart Contracts</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">KYB Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Instant Settlement</span>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full filter blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-full filter blur-3xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}