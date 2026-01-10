import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/providers/Web3Provider'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { RoleBasedNav } from '@/components/navigation/RoleBasedNav'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InvoiceX Protocol - Get Paid TODAY for Invoices Due in 90 Days',
  description: 'Revolutionary DeFi protocol enabling instant liquidity for B2B invoices on Mantle Network',
  keywords: 'invoice financing, DeFi, Mantle, blockchain, B2B payments, invoice tokenization',
  openGraph: {
    title: 'InvoiceX Protocol',
    description: 'Get Paid TODAY for Invoices Due in 90 Days',
    type: 'website',
    url: 'https://invoicex.finance',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
              <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  {/* Logo and Brand */}
                  <Link href="/" className="flex items-center space-x-3 group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                      <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-lg">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 4h16v16L4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 9h6M9 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                    <div>
                      <span className="font-black text-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 bg-clip-text text-transparent">InvoiceX</span>
                      <span className="hidden lg:block text-xs text-slate-500 font-medium">DeFi Invoice Protocol</span>
                    </div>
                  </Link>

                  {/* Main Navigation */}
                  <RoleBasedNav />

                  {/* Right Section: Network Status + Connect Button */}
                  <div className="flex items-center space-x-4">
                    <NetworkStatus />
                    <ConnectButton />
                  </div>
                </div>
              </nav>
            </header>

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 mt-24">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Brand Section */}
                  <div>
                    <Link href="/" className="flex items-center space-x-3 group mb-4 w-fit">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                        <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-lg">
                          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4h16v16L4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 9h6M9 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span className="font-black text-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 bg-clip-text text-transparent">
                          InvoiceX
                        </span>
                        <span className="block text-xs text-slate-500 font-medium">
                          DeFi Invoice Protocol
                        </span>
                      </div>
                    </Link>
                    <p className="text-sm text-gray-600">
                      Revolutionary DeFi protocol for instant B2B invoice liquidity
                    </p>
                  </div>

                  {/* Protocol Links */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Protocol</h3>
                    <ul className="space-y-2">
                      <li>
                        <Link href="/business" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                          Business Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link href="/business/submit" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                          Submit Invoice
                        </Link>
                      </li>
                      <li>
                        <Link href="/liquidity" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                          Provide Liquidity
                        </Link>
                      </li>
                      <li>
                        <Link href="/marketplace" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                          Trade Invoices
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Resources */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Resources</h3>
                    <ul className="space-y-2">
                      <li>
                        <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
                          Documentation
                        </Link>
                      </li>
                      <li>
                        <a
                          href="https://github.com/invoicex"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          GitHub
                        </a>
                      </li>
                      <li>
                        <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900">
                          FAQ
                        </Link>
                      </li>
                      <li>
                        <Link href="/support" className="text-sm text-gray-600 hover:text-gray-900">
                          Support
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Social */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
                    <ul className="space-y-2">
                      <li>
                        <a
                          href="https://twitter.com/invoicex"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Twitter
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://discord.gg/invoicex"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Discord
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://t.me/invoicex"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Telegram
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row justify-between items-center">
                    <p className="text-sm text-gray-500">
                      © {new Date().getFullYear()} InvoiceX Protocol. All rights reserved.
                    </p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                      <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
                        Terms
                      </Link>
                      <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">
                        Privacy
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}

// Network Status Component
function NetworkStatus() {
  return (
    <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-gray-700">Mantle Sepolia</span>
    </div>
  )
}