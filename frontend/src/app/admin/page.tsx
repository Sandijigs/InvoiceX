'use client'

import { AdminRoute } from '@/components/admin/AdminRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Users,
  AlertCircle,
  TrendingUp,
  Database,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { useAdminRole } from '@/hooks/useAdminRole'
import { useKYBRequests, useSystemStatus } from '@/hooks/useAdminData'

export default function AdminDashboard() {
  const { isSuperAdmin, isKYBVerifier, isOracle, address } = useAdminRole()
  const { pendingIds, isLoading: isLoadingKYB } = useKYBRequests()
  const { isPaused } = useSystemStatus()

  const pendingKYBCount = pendingIds?.length || 0

  return (
    <AdminRoute>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                System administration and management
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-700">
              <Shield className="mr-1 h-3 w-3" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Admin Roles */}
        <Card className="mb-8 border-purple-100">
          <CardHeader>
            <CardTitle>Your Admin Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {isSuperAdmin && (
                <Badge className="bg-purple-600">Super Admin</Badge>
              )}
              {isKYBVerifier && (
                <Badge className="bg-blue-600">KYB Verifier</Badge>
              )}
              {isOracle && (
                <Badge className="bg-green-600">Oracle Manager</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Connected wallet: <code className="bg-gray-100 px-2 py-1 rounded">{address}</code>
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Registered Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">-</p>
              <p className="text-xs text-muted-foreground">Check by ID</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${isPaused ? 'text-red-600' : 'text-green-600'}`}>
                {isPaused ? 'Paused' : 'Active'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">-</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {isPaused ? 'Maintenance' : 'Operational'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isSuperAdmin || isKYBVerifier) && (
            <Link href="/admin/kyb">
              <Card className="border-purple-100 hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span>Business Verification</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Verify registered businesses and set credit scores
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {(isSuperAdmin || isOracle) && (
            <Link href="/admin/oracle">
              <Card className="border-purple-100 hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Oracle Management</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Submit credit scores and manage oracle data
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/admin/system">
              <Card className="border-purple-100 hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <span>System Controls</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage system settings and emergency controls
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Recent Activity - Note */}
        <Card className="mt-8 border-blue-100 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">Business Verification</p>
                  <p className="text-sm text-blue-700">Review and approve pending businesses</p>
                </div>
                <Link href="/admin/kyb">
                  <Button className="bg-blue-600">
                    Go to KYB
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {isOracle && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="font-medium text-blue-900">Oracle Management</p>
                    <p className="text-sm text-blue-700">Manage credit assessments</p>
                  </div>
                  <Link href="/admin/oracle">
                    <Button variant="outline">
                      Go to Oracle
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}

              {isSuperAdmin && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="font-medium text-blue-900">System Controls</p>
                    <p className="text-sm text-blue-700">Emergency pause and system settings</p>
                  </div>
                  <Link href="/admin/system">
                    <Button variant="outline">
                      Go to System
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  )
}
