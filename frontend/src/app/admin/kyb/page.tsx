'use client'

import { AdminRoute } from '@/components/admin/AdminRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  Clock,
  ArrowLeft,
  Building2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { useAdminActions, useKYBRequests, useKYBRequest } from '@/hooks/useAdminData'
import { BusinessVerificationModal } from '@/components/admin/BusinessVerificationModal'
import { CONTRACTS } from '@/lib/contracts'
import { BUSINESS_REGISTRY_ABI, type Business, BusinessStatus } from '@/lib/abis/BusinessRegistry'
import { RequestStatus } from '@/lib/abis/KYBRegistry'

// Component to fetch KYB request and corresponding business data
function KYBRequestFetcher({
  requestId,
  onRequestLoaded,
  refreshKey
}: {
  requestId: bigint
  onRequestLoaded: (id: bigint, request: any | null, business: Business | null) => void
  refreshKey?: number
}) {
  const { request, isLoading: isLoadingRequest, refetch: refetchRequest } = useKYBRequest(requestId)

  // Debug log the request wallet
  useEffect(() => {
    if (request) {
      console.log(`🔎 Looking up business for request ${requestId} with wallet: ${request.businessWallet}`)
    }
  }, [request, requestId])

  // Step 1: Get business ID by owner wallet
  const { data: businessId, isLoading: isLoadingBusinessId, refetch: refetchBusinessId, error: businessIdError } = useReadContract({
    address: CONTRACTS.businessRegistry,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusinessByOwner',
    args: request ? [request.businessWallet as `0x${string}`] : undefined,
    query: {
      enabled: !!request && !!request.businessWallet,
    },
  })

  // Log business ID lookup result
  useEffect(() => {
    if (businessIdError) {
      console.log(`❌ Business ID lookup error for request ${requestId}:`, businessIdError)
    }
    if (businessId !== undefined) {
      console.log(`🔢 Business ID for request ${requestId}:`, businessId?.toString(), 'Valid:', businessId > BigInt(0))
    }
  }, [businessIdError, businessId, requestId])

  // Step 2: Get full business data using the business ID
  const { data: businessData, isLoading: isLoadingBusiness, refetch: refetchBusiness, error: businessError } = useReadContract({
    address: CONTRACTS.businessRegistry,
    abi: BUSINESS_REGISTRY_ABI,
    functionName: 'getBusiness',
    args: businessId && businessId > BigInt(0) ? [businessId] : undefined,
    query: {
      enabled: !!businessId && businessId > BigInt(0),
    },
  })

  // Log business data lookup result
  useEffect(() => {
    if (businessError) {
      console.log(`❌ Business data lookup error for request ${requestId}:`, businessError)
    }
    if (businessData !== undefined) {
      console.log(`📦 Full business data for request ${requestId}:`, businessData)
    }
  }, [businessError, businessData, requestId])

  // Parse business data from contract response
  const parsedBusiness = React.useMemo(() => {
    if (!businessData) {
      console.log(`⚠️ No business data for request ${requestId}`)
      return null
    }

    const parsedBusinessId = (businessData as any).businessId
    console.log(`📊 Parsing business data for request ${requestId}:`, {
      businessId: parsedBusinessId?.toString(),
      hasBusinessId: !!parsedBusinessId,
      isGreaterThanZero: parsedBusinessId > BigInt(0),
      owner: (businessData as any).owner,
      status: (businessData as any).status
    })

    if (!parsedBusinessId || parsedBusinessId <= BigInt(0)) {
      console.log(`⚠️ Invalid business ID in parsed data for request ${requestId}`)
      return null
    }

    return {
      businessId: parsedBusinessId as bigint,
      owner: (businessData as any).owner as `0x${string}`,
      authorizedSigners: (businessData as any).authorizedSigners as `0x${string}`[],
      businessHash: (businessData as any).businessHash as `0x${string}`,
      zkProofHash: (businessData as any).zkProofHash as `0x${string}`,
      businessURI: (businessData as any).businessURI as string,
      creditScore: (businessData as any).creditScore as bigint,
      stats: (businessData as any).stats,
      status: (businessData as any).status as BusinessStatus,
      registeredAt: (businessData as any).registeredAt as bigint,
      verifiedAt: (businessData as any).verifiedAt as bigint,
      lastActivityAt: (businessData as any).lastActivityAt as bigint,
    }
  }, [businessData, requestId])

  const hasLoadedRef = React.useRef(false)

  // Debug logging
  useEffect(() => {
    console.log(`🔍 KYBRequestFetcher ${requestId}:`, {
      hasRequest: !!request,
      hasBusinessId: !!businessId,
      businessIdValue: businessId?.toString(),
      hasBusiness: !!parsedBusiness,
      businessStatus: parsedBusiness?.status,
      isLoadingRequest,
      isLoadingBusinessId,
      isLoadingBusiness,
      hasLoaded: hasLoadedRef.current,
      requestStatus: request?.requestStatus
    })
  }, [requestId, request, businessId, parsedBusiness, isLoadingRequest, isLoadingBusinessId, isLoadingBusiness])

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      console.log(`🔄 Refetching KYB request ${requestId} due to refresh`)
      hasLoadedRef.current = false
      refetchRequest()
      if (request) {
        refetchBusinessId()
        if (businessId && businessId > BigInt(0)) {
          refetchBusiness()
        }
      }
    }
  }, [refreshKey, requestId, refetchRequest, refetchBusinessId, refetchBusiness, request, businessId])

  useEffect(() => {
    // Load when request is ready and both business lookups are complete
    // Business data might not exist if the business hasn't registered yet
    const isFullyLoaded = !isLoadingRequest && !isLoadingBusinessId && !isLoadingBusiness

    if (isFullyLoaded && request && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      console.log(`📦 Loaded KYB request ${requestId}:`, {
        hasRequest: !!request,
        businessId: businessId?.toString(),
        hasBusiness: !!parsedBusiness,
        businessStatus: parsedBusiness?.status,
        requestStatus: request.requestStatus
      })
      onRequestLoaded(requestId, request, parsedBusiness)
    }

    // Handle errors - if no request after loading completes
    if (!request && isFullyLoaded && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      console.log(`❌ Error loading KYB request ${requestId}`)
      onRequestLoaded(requestId, null, null)
    }
  }, [request, businessId, parsedBusiness, isLoadingRequest, isLoadingBusinessId, isLoadingBusiness, requestId, onRequestLoaded])

  return null
}

export default function KYBReviewPage() {
  const { approveKYB, rejectKYB, verifyBusiness, isLoading: isProcessing, isSuccess, isError, error, hash } = useAdminActions()
  const { pendingIds, isLoading: isLoadingIds, refetch: refetchIds } = useKYBRequests()

  // Track which step we're on in the two-step approval process
  const [approvalStep, setApprovalStep] = useState<'idle' | 'kyb' | 'business'>('idle')
  const [pendingBusinessApproval, setPendingBusinessApproval] = useState<{businessId: bigint, creditScore: number} | null>(null)

  // Monitor transaction status
  useEffect(() => {
    if (hash) {
      console.log('🔗 Transaction hash available:', hash)
      console.log('🔍 Check status: https://sepolia.mantlescan.xyz/tx/' + hash)
      console.log('📊 Current approval step:', approvalStep)
    }
  }, [hash, approvalStep])

  useEffect(() => {
    if (isSuccess && hash) {
      console.log('✅ Transaction confirmed successfully!')
      console.log('📊 Approval step:', approvalStep)

      // If KYB approval just succeeded, now verify the business
      if (approvalStep === 'kyb' && pendingBusinessApproval) {
        console.log('✅ KYB approved! Now verifying business in BusinessRegistry...')
        setTimeout(() => {
          const { businessId, creditScore } = pendingBusinessApproval
          const defaultZkProofHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
          const scaledCreditScore = Math.floor(creditScore / 10)

          setApprovalStep('business')
          verifyBusiness(businessId, defaultZkProofHash, scaledCreditScore)
        }, 2000) // Wait 2 seconds for blockchain state to settle
      } else if (approvalStep === 'business') {
        console.log('✅ Business verified! Both steps complete.')
        console.log('⏳ Waiting a few more seconds before reloading...')
      }
    }
  }, [isSuccess, hash, approvalStep, pendingBusinessApproval, verifyBusiness])

  useEffect(() => {
    if (isError && error) {
      console.error('❌ Transaction failed:', error)
    }
  }, [isError, error])

  // Debug logging
  useEffect(() => {
    console.log('🔍 Admin KYB Page - Pending IDs:', {
      pendingIds,
      count: pendingIds?.length || 0,
      isLoading: isLoadingIds,
      contractAddress: CONTRACTS.kybRegistry
    })
  }, [pendingIds, isLoadingIds])

  // State for loaded requests and businesses
  const [loadedData, setLoadedData] = useState<Map<string, { request: any | null; business: Business | null }>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const ITEMS_PER_PAGE = 10

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<bigint | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<bigint | null>(null)

  // Handle request data loaded
  const handleRequestLoaded = useCallback((requestId: bigint, request: any | null, business: Business | null) => {
    setLoadedData(prev => {
      const newMap = new Map(prev)
      newMap.set(requestId.toString(), { request, business })
      return newMap
    })
  }, [])

  // Calculate which request IDs to show on current page
  const paginatedIds = useMemo(() => {
    if (!pendingIds) return []
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
    const endIdx = startIdx + ITEMS_PER_PAGE
    return pendingIds.slice(startIdx, endIdx)
  }, [pendingIds, currentPage])

  // Load initial data
  useEffect(() => {
    if (!hasInitiallyLoaded && pendingIds && pendingIds.length > 0) {
      setHasInitiallyLoaded(true)
      console.log('📋 Loading initial KYB requests...', pendingIds.length, 'total')
    }
  }, [hasInitiallyLoaded, pendingIds])

  // Refresh data when BOTH steps complete
  useEffect(() => {
    // Only refresh after the business verification step completes
    if (isSuccess && approvalStep === 'business') {
      console.log('✅ Both approvals successful, refreshing data...')
      // Wait longer for blockchain state to propagate (especially on testnets)
      setTimeout(() => {
        console.log('🔄 Closing modal and refreshing data...')
        setModalOpen(false)
        setSelectedRequestId(null)
        setSelectedBusinessId(null)
        // Reset approval state
        setApprovalStep('idle')
        setPendingBusinessApproval(null)
        // Clear loaded data to force refetch
        setLoadedData(new Map())
        setRefreshKey(prev => prev + 1)
        refetchIds()
      }, 5000) // Increased from 2s to 5s for better reliability
    }
  }, [isSuccess, approvalStep, refetchIds])

  // Process loaded data into categories
  const { pendingRequests, approvedRequests, rejectedRequests } = useMemo(() => {
    const results = Array.from(loadedData.entries()).map(([id, data]) => ({
      id: BigInt(id),
      request: data.request,
      business: data.business,
      isLoading: false,
    }))

    console.log('🔍 Processing loaded data:', {
      totalResults: results.length,
      resultsDetails: results.map(r => ({
        id: r.id.toString(),
        hasRequest: !!r.request,
        requestStatus: r.request?.requestStatus,
        businessStatus: r.business?.status,
        isPending: r.request?.requestStatus === RequestStatus.PENDING,
        isBusinessVerified: r.business?.status === 1, // BusinessStatus.VERIFIED
      }))
    })

    // Filter by request status, but also check business verification status
    // A request is only truly pending if BOTH the KYB request is pending AND the business is not yet verified
    const pending = results.filter(r => {
      if (!r.request) return false
      const isKYBPending = r.request.requestStatus === RequestStatus.PENDING
      const isBusinessNotVerified = !r.business || r.business.status === 0 // PENDING
      return isKYBPending && isBusinessNotVerified
    })

    // A request is approved if EITHER the KYB is approved OR the business is verified
    const approved = results.filter(r => {
      if (!r.request) return false
      const isKYBApproved = r.request.requestStatus === RequestStatus.APPROVED
      const isBusinessVerified = r.business && r.business.status === 1 // VERIFIED
      return isKYBApproved || isBusinessVerified
    })

    const rejected = results.filter(r => r.request && r.request.requestStatus === RequestStatus.REJECTED)

    console.log('🔍 Filtered results:', {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    })

    return {
      pendingRequests: pending,
      approvedRequests: approved,
      rejectedRequests: rejected,
    }
  }, [loadedData])

  const handleCardClick = (requestId: bigint, businessId: bigint | null) => {
    console.log('🖱️ Card clicked:', {
      requestId: requestId.toString(),
      businessId: businessId?.toString() || 'null',
      hasLoadedData: loadedData.has(requestId.toString()),
      loadedBusiness: loadedData.get(requestId.toString())?.business,
    })
    console.log('📝 Setting selectedRequestId to:', requestId.toString())
    console.log('📝 Setting selectedBusinessId to:', businessId?.toString() || 'null')
    setSelectedRequestId(requestId)
    setSelectedBusinessId(businessId)
    setModalOpen(true)
  }

  const handleApprove = async (businessId: bigint, creditScore: number) => {
    if (!selectedRequestId) {
      console.error('❌ No request ID selected')
      return
    }

    try {
      console.log('📋 Starting TWO-STEP approval process for:', {
        requestId: selectedRequestId.toString(),
        businessId: businessId.toString(),
        creditScore,
      })

      // Store the business info for step 2
      setPendingBusinessApproval({ businessId, creditScore })

      // Step 1: Approve KYB verification in KYBRegistry
      // The useEffect will automatically trigger step 2 when this completes
      console.log('📋 Step 1/2: Approving KYB request in KYBRegistry...')
      setApprovalStep('kyb')
      // Try with BASIC level (1) which only requires 1 proof instead of STANDARD (2) which requires 3
      await approveKYB(selectedRequestId, 1, 365) // Level 1 (BASIC), 1 year validity
      console.log('✅ KYB approval transaction sent, waiting for blockchain confirmation...')
      console.log('⏳ Step 2/2 will start automatically after KYB approval is confirmed')
    } catch (error) {
      console.error('❌ Error in approval process:', error)
      setApprovalStep('idle')
      setPendingBusinessApproval(null)
      alert(`Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReject = async (requestIdParam: bigint, reason: string) => {
    console.log('🔴 PAGE: handleReject CALLED!')
    console.log('🔴 PAGE: requestIdParam:', requestIdParam.toString())
    console.log('🔴 PAGE: reason:', reason)
    console.log('🔴 PAGE: selectedRequestId:', selectedRequestId?.toString())

    // Use the parameter directly instead of relying on state
    const requestIdToUse = requestIdParam || selectedRequestId

    if (!requestIdToUse) {
      console.error('❌ PAGE: No request ID provided')
      return
    }

    try {
      console.log('❌ PAGE: Rejecting KYB request:', requestIdToUse.toString(), 'Reason:', reason)
      console.log('📝 PAGE: About to call rejectKYB function...')

      // Call rejectKYB - this will trigger the wallet popup
      await rejectKYB(requestIdToUse, reason)

      console.log('✅ PAGE: Transaction request sent to wallet!')

      // Close modal
      setModalOpen(false)
      setSelectedRequestId(null)
      setSelectedBusinessId(null)

      // Show loading message - hash will be available after wallet approval
      alert(`Please approve the transaction in your wallet.\n\nAfter approval, the page will reload automatically in 20 seconds to show the updated status.`)

      // Monitor for the hash to become available
      // The hash from the hook will be logged by the useEffect in useAdminData

      // Wait longer for blockchain confirmation (20 seconds to ensure it's mined)
      setTimeout(() => {
        console.log('🔄 Reloading page after rejection...')
        window.location.reload()
      }, 20000)
    } catch (error) {
      console.error('❌ PAGE: Error rejecting KYB:', error)
      console.error('❌ PAGE: Full error object:', error)

      // Check if user rejected the transaction
      if (error instanceof Error && (
        error.message.includes('User rejected') ||
        error.message.includes('User denied') ||
        error.message.includes('rejected')
      )) {
        alert('Transaction was rejected in your wallet. No changes were made.')
      } else {
        alert(`Failed to reject KYB: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
      }

      setModalOpen(false)
    }
  }

  const handleNextPage = () => {
    if (pendingIds && currentPage < Math.ceil(pendingIds.length / ITEMS_PER_PAGE)) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const totalPages = pendingIds ? Math.ceil(pendingIds.length / ITEMS_PER_PAGE) : 0
  const isLoading = isLoadingIds || (paginatedIds.length > 0 && loadedData.size === 0)

  return (
    <AdminRoute requiredRole="kyb">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Fetch KYB requests in background */}
        {paginatedIds.map(id => (
          <KYBRequestFetcher key={id.toString()} requestId={id} onRequestLoaded={handleRequestLoaded} refreshKey={refreshKey} />
        ))}

        {/* Header */}
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Business Verification Queue
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and approve business verification applications
            </p>
          </div>
          <Button
            onClick={() => {
              console.log('🔄 Manual refresh triggered')
              setLoadedData(new Map())
              setRefreshKey(prev => prev + 1)
              refetchIds()
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh Data
          </Button>
        </div>

        {/* Success/Error Messages */}
        {isSuccess && hash && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Verification successful! Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
            </AlertDescription>
          </Alert>
        )}

        {isError && error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Error: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-orange-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="border-green-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{approvedRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Verified businesses</p>
            </CardContent>
          </Card>

          <Card className="border-red-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{rejectedRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Declined applications</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card className="border-gray-100 mb-8">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading KYB requests...</p>
            </CardContent>
          </Card>
        ) : pendingIds && pendingIds.length > 0 ? (
          <>
          <Tabs defaultValue="pending" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-3 mt-6">
              {pendingRequests.length === 0 ? (
                <Card className="border-orange-100 bg-orange-50/30">
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending requests found</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((result) => {
                  const business = result.business
                  const request = result.request
                  return (
                    <Card
                      key={result.id.toString()}
                      className="border-orange-100 hover:shadow-md transition-all cursor-pointer hover:border-orange-300"
                      onClick={() => handleCardClick(result.id, business?.businessId || null)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-3 rounded-lg">
                              <Building2 className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">KYB Request #{result.id.toString()}</p>
                              <p className="text-sm text-muted-foreground">
                                Business Wallet: {request?.businessWallet ? `${request.businessWallet.slice(0, 6)}...${request.businessWallet.slice(-4)}` : 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted: {request?.requestedAt ? new Date(Number(request.requestedAt) * 1000).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-3 mt-6">
              {approvedRequests.length === 0 ? (
                <Card className="border-green-100 bg-green-50/30">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-muted-foreground">No approved requests found</p>
                  </CardContent>
                </Card>
              ) : (
                approvedRequests.map((result) => (
                  <Card
                    key={result.id.toString()}
                    className="border-green-100 bg-green-50/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleCardClick(result.id, result.business?.businessId || null)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-3 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">KYB Request #{result.id.toString()}</p>
                            <p className="text-sm text-green-700">
                              {result.business ? `Business ID: ${result.business.businessId.toString()}` : 'Business info unavailable'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Verified: {result.business && result.business.verifiedAt > BigInt(0) ? new Date(Number(result.business.verifiedAt) * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-600">Verified</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-3 mt-6">
              {rejectedRequests.length === 0 ? (
                <Card className="border-red-100 bg-red-50/30">
                  <CardContent className="p-8 text-center">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                    <p className="text-muted-foreground">No rejected requests found</p>
                  </CardContent>
                </Card>
              ) : (
                rejectedRequests.map((result) => (
                  <Card
                    key={result.id.toString()}
                    className="border-red-100 bg-red-50/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleCardClick(result.id, result.business?.businessId || null)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-100 p-3 rounded-lg">
                            <XCircle className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">KYB Request #{result.id.toString()}</p>
                            <p className="text-sm text-red-700">Application declined</p>
                            <p className="text-xs text-muted-foreground">
                              Rejected: {result.request?.requestedAt ? new Date(Number(result.request.requestedAt) * 1000).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-red-600 text-white">Rejected</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="mb-8 border-blue-100 bg-blue-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Viewing requests {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, pendingIds?.length || 0)} of {pendingIds?.length || 0} • Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </>
        ) : (
          <Card className="border-orange-100 bg-orange-50/30">
            <CardContent className="p-12 text-center">
              <Clock className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-orange-900 mb-2">No KYB Requests</h3>
              <p className="text-muted-foreground">
                No verification requests found. New requests will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Business Verification Modal */}
        {selectedRequestId && (
          <BusinessVerificationModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setSelectedBusinessId(null)
              setSelectedRequestId(null)
            }}
            business={loadedData.get(selectedRequestId.toString())?.business || null}
            businessId={selectedBusinessId || BigInt(0)}
            requestId={selectedRequestId}
            isLoading={isProcessing}
            isSuccess={isSuccess}
            isError={isError}
            error={error}
            txHash={hash}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>
    </AdminRoute>
  )
}
