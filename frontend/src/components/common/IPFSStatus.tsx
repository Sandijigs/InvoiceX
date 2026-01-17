'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Cloud, HardDrive, AlertTriangle } from 'lucide-react'
import { getIPFSStatus, isUsingRealIPFS } from '@/lib/ipfsService'

export function IPFSStatusBanner() {
  const [status, setStatus] = useState(getIPFSStatus())
  const [show, setShow] = useState(false)

  useEffect(() => {
    const ipfsStatus = getIPFSStatus()
    setStatus(ipfsStatus)
    // Only show banner if not using real IPFS (for development warning)
    setShow(!ipfsStatus.configured)
  }, [])

  if (!show) return null

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-sm text-yellow-800">
        <strong>Development Mode:</strong> Using localStorage for document storage.
        <a
          href="/docs/ipfs-setup"
          className="ml-1 underline hover:text-yellow-900"
          target="_blank"
        >
          Configure Pinata IPFS for production
        </a>
      </AlertDescription>
    </Alert>
  )
}

export function IPFSStatusIndicator() {
  const [usingRealIPFS, setUsingRealIPFS] = useState(false)

  useEffect(() => {
    setUsingRealIPFS(isUsingRealIPFS())
  }, [])

  if (usingRealIPFS) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600">
        <Cloud className="h-3 w-3" />
        <span>Pinata IPFS</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-amber-600">
      <HardDrive className="h-3 w-3" />
      <span>Local Storage</span>
    </div>
  )
}
