'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, DollarSign, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { useBusinessInvoices } from '@/hooks/useInvoiceSubmission'

export default function InvoicesDashboardPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { businessInfo } = useBusinessRegistry()
  const { requestIds, isLoading } = useBusinessInvoices(businessInfo?.businessId)

  const [activeTab, setActiveTab] = useState('all')

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600">
              Please connect your wallet to view your invoices
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            My Invoices
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your invoice financing requests
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/invoices/upload')}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Upload Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? '-' : requestIds?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Funding</p>
                <p className="text-2xl font-bold mt-1">0</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold mt-1">0</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Financed</p>
                <p className="text-2xl font-bold mt-1">$0</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and manage all your invoice financing requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="funded">Funded</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading invoices...</p>
                </div>
              ) : !requestIds || requestIds.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Invoices Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Get started by uploading your first invoice for financing
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard/invoices/upload')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Upload Your First Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Invoice List - to be implemented with actual data */}
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">INV-2024-001</h4>
                          <p className="text-sm text-gray-600">Submitted Jan 14, 2026</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-semibold">$10,000</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Due Date</p>
                          <p className="font-semibold">Apr 14, 2026</p>
                        </div>
                        <Badge className="bg-orange-500">Pending Assessment</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Other tabs - similar structure */}
            <TabsContent value="pending" className="mt-6">
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No pending invoices</p>
              </div>
            </TabsContent>

            <TabsContent value="funded" className="mt-6">
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No funded invoices</p>
              </div>
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No paid invoices</p>
              </div>
            </TabsContent>

            <TabsContent value="overdue" className="mt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No overdue invoices</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
