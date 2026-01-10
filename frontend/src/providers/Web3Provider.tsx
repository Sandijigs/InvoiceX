'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { ReactNode, useState, useEffect } from 'react'

// Dynamic import for Web3Modal to avoid SSR issues
let web3modalInitialized = false
let modalInstance: any = null

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 1_000 * 60 * 60 * 24, // 24 hours
          staleTime: 1_000 * 60, // 1 minute
          retry: 3,
        },
      },
    })
  )

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Dynamically import and initialize Web3Modal only on client side
    if (!web3modalInitialized && typeof window !== 'undefined') {
      import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
        try {
          const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE'

          console.log('Initializing Web3Modal with projectId:', projectId)

          const modal = createWeb3Modal({
            wagmiConfig: config,
            projectId,
            enableAnalytics: false,
            enableOnramp: true,
            themeMode: 'light',
            themeVariables: {
              '--w3m-color-mix': '#10b981', // Emerald color to match theme
              '--w3m-color-mix-strength': 40,
              '--w3m-accent': '#10b981',
              '--w3m-font-family': '"Inter", sans-serif',
              '--w3m-border-radius-master': '0.75rem',
            }
          })

          modalInstance = modal
          // Make modal globally accessible for debugging
          ;(window as any).__web3modal = modal
          web3modalInitialized = true
          console.log('Web3Modal initialized successfully')
        } catch (error) {
          console.error('Failed to create Web3Modal:', error)
        }
      }).catch(error => {
        console.error('Failed to import Web3Modal:', error)
      })
    }
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Hidden Web3Modal button for triggering modal */}
        <div style={{ position: 'absolute', left: '-9999px', pointerEvents: 'none' }}>
          <w3m-button />
        </div>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}