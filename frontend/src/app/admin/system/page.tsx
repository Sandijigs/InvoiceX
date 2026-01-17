'use client'

import { AdminRoute } from '@/components/admin/AdminRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Shield,
  Pause,
  Play,
  AlertTriangle,
  Activity,
  Database,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAdminActions, useSystemStatus } from '@/hooks/useAdminData'
import { CONTRACTS } from '@/lib/contracts'

export default function SystemControlsPage() {
  const { isPaused, isLoading: isLoadingStatus, refetch } = useSystemStatus()
  const { pauseSystem, unpauseSystem, isLoading, isSuccess } = useAdminActions()

  // Refetch system status when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      refetch()
    }
  }, [isSuccess, refetch])

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause the system? This will stop all operations.')) {
      return
    }

    await pauseSystem()
  }

  const handleUnpause = async () => {
    if (!confirm('Are you sure you want to resume system operations?')) {
      return
    }

    await unpauseSystem()
  }

  return (
    <AdminRoute requiredRole="superadmin">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            System Controls
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system settings and emergency controls
          </p>
        </div>

        {/* System Status */}
        <Card className="mb-8 border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <span>System Status</span>
              </div>
              <Badge className={isPaused ? 'bg-red-600' : 'bg-green-600'}>
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Invoices</p>
                <p className="text-2xl font-bold">456</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TVL</p>
                <p className="text-2xl font-bold">$2.3M</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">99.9%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Pause className="h-5 w-5" />
                Emergency Pause
              </CardTitle>
              <CardDescription>
                Pause all system operations in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will immediately halt all operations. Only use in emergencies.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handlePause}
                disabled={isLoading || isPaused}
                variant="destructive"
                className="w-full"
              >
                <Pause className="mr-2 h-4 w-4" />
                {isLoading ? 'Pausing...' : 'Pause System'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Play className="h-5 w-5" />
                Resume Operations
              </CardTitle>
              <CardDescription>
                Unpause the system and resume normal operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  System will resume normal operations immediately.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleUnpause}
                disabled={isLoading || !isPaused}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                {isLoading ? 'Resuming...' : 'Resume System'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contract Addresses */}
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Contract Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {Object.entries(CONTRACTS).map(([name, address]) => (
                <div key={name} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{address}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="mt-6 border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              System Health Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { metric: 'RPC Response Time', value: '120ms', status: 'good' },
                { metric: 'Smart Contract Gas Usage', value: '0.05 MNT avg', status: 'good' },
                { metric: 'Oracle Data Freshness', value: '< 1 hour', status: 'good' },
                { metric: 'Database Sync Status', value: '100%', status: 'good' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.value}</span>
                    <Badge className="bg-green-600">✓</Badge>
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
