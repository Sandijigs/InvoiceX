'use client'

import { useAdminRole } from '@/hooks/useAdminRole'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AdminRouteProps {
  children: React.ReactNode
  requiredRole?: 'superadmin' | 'kyb' | 'oracle' | 'any'
}

export function AdminRoute({ children, requiredRole = 'any' }: AdminRouteProps) {
  const { isAdmin, isSuperAdmin, isKYBVerifier, isOracle, isLoading, isConnected } = useAdminRole()
  const router = useRouter()

  // Check specific role requirements
  const hasRequiredRole = () => {
    if (requiredRole === 'superadmin') return isSuperAdmin
    if (requiredRole === 'kyb') return isKYBVerifier || isSuperAdmin
    if (requiredRole === 'oracle') return isOracle || isSuperAdmin
    return isAdmin // 'any' admin role
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <div className="space-y-4">
              <p className="font-semibold">Admin Access Required</p>
              <p>Please connect your wallet to access admin features.</p>
              <Link href="/">
                <Button className="mt-2">Go Home</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <div className="text-center">
          <p className="text-muted-foreground">Verifying admin privileges...</p>
        </div>
      </div>
    )
  }

  if (!hasRequiredRole()) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-semibold">Access Denied</p>
              <p>
                You don't have the required admin privileges to access this page.
                {requiredRole !== 'any' && ` Required role: ${requiredRole.toUpperCase()}`}
              </p>
              <p className="text-sm">
                Connected wallet: <code className="bg-red-100 px-2 py-1 rounded">{isConnected}</code>
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-2">
                  Go Home
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}
