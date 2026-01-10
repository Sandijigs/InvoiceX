'use client'

import { useAccount, useDisconnect, useEnsName } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { WalletIcon, Copy, ExternalLink, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openExplorer = () => {
    if (address && chain) {
      const explorerUrl = chain.id === 5003
        ? `https://explorer.sepolia.mantle.xyz/address/${address}`
        : `https://explorer.mantle.xyz/address/${address}`
      window.open(explorerUrl, '_blank')
    }
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <Button
        disabled
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
      >
        <WalletIcon className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Button
        onClick={() => {
          console.log('Connect button clicked')

          if (typeof window !== 'undefined') {
            // First, try using the global modal instance
            const modal = (window as any).__web3modal
            console.log('Modal instance found:', !!modal)

            if (modal && typeof modal.open === 'function') {
              console.log('Opening modal directly...')
              try {
                modal.open()
              } catch (error) {
                console.error('Error opening modal:', error)
              }
              return
            }

            // Fallback: Try the w3m-button element
            const w3mButton = document.querySelector('w3m-button')
            console.log('w3m-button found:', !!w3mButton)

            if (w3mButton) {
              try {
                const shadowRoot = (w3mButton as any).shadowRoot
                const connectButton = shadowRoot?.querySelector('wui-connect-button')
                const button = connectButton?.shadowRoot?.querySelector('button')

                console.log('Shadow DOM elements:', { shadowRoot: !!shadowRoot, connectButton: !!connectButton, button: !!button })

                if (button) {
                  button.click()
                } else {
                  console.warn('Could not find button in shadow DOM')
                }
              } catch (error) {
                console.error('Error clicking w3m-button:', error)
              }
            } else {
              console.warn('Neither modal instance nor w3m-button found. Web3Modal may not be initialized yet.')
            }
          }
        }}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
      >
        <WalletIcon className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">
              {ensName || formatAddress(address!)}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Connected</span>
            <span className="text-xs text-muted-foreground">
              {chain?.name || 'Unknown Network'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          {copied ? 'Copied!' : 'Copy Address'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}