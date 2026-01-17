'use client'

import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/lib/contracts'
import { KYB_REGISTRY_ABI } from '@/lib/abis/KYBRegistry'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DiagnosticPage() {
  const [selectedRequestId, setSelectedRequestId] = useState<number>(4)

  // Get pending request IDs from contract
  const { data: pendingIds, refetch: refetchPending } = useReadContract({
    address: CONTRACTS.kybRegistry,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getPendingRequests',
  })

  // Get specific request data
  const { data: requestData, refetch: refetchRequest } = useReadContract({
    address: CONTRACTS.kybRegistry,
    abi: KYB_REGISTRY_ABI,
    functionName: 'getVerificationRequest',
    args: [BigInt(selectedRequestId)],
  })

  const handleRefresh = () => {
    refetchPending()
    refetchRequest()
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">KYB Contract Diagnostic</h1>

      <Button onClick={handleRefresh} className="mb-4">Refresh Data</Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Address</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{CONTRACTS.kybRegistry}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Request IDs (from getPendingRequests)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(pendingIds, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            , 2)}
          </pre>
          <p className="mt-2">Total: {pendingIds ? (pendingIds as any[]).length : 0}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Request Data for ID: {selectedRequestId}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block mb-2">Select Request ID:</label>
            <input
              type="number"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(Number(e.target.value))}
              className="border p-2 rounded"
            />
          </div>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(requestData, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            , 2)}
          </pre>

          {requestData && (
            <div className="mt-4 space-y-2">
              <p><strong>Request ID:</strong> {(requestData as any).requestId?.toString() || 'N/A'}</p>
              <p><strong>Business Wallet:</strong> {(requestData as any).businessWallet || 'N/A'}</p>
              <p><strong>Request Status:</strong> {(requestData as any).requestStatus?.toString() || 'N/A'}
                <span className="ml-2 text-sm text-gray-600">
                  (0=PENDING, 1=APPROVED, 2=REJECTED, 3=CANCELLED)
                </span>
              </p>
              <p><strong>Submitted Proofs:</strong> {(requestData as any).submittedProofs?.length || 0}</p>
              <p><strong>Requested At:</strong> {(requestData as any).requestedAt ?
                new Date(Number((requestData as any).requestedAt) * 1000).toLocaleString() : 'N/A'}
              </p>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-bold text-yellow-800">Analysis:</p>
                {(requestData as any).requestId && (requestData as any).requestId > 0 ? (
                  <>
                    <p className="text-green-700">✓ Request exists in contract</p>
                    <p>Status: {(requestData as any).requestStatus === 0 ?
                      <span className="text-green-700">✓ PENDING (can be approved)</span> :
                      <span className="text-red-700">✗ Not PENDING (cannot be approved)</span>
                    }</p>
                    <p>Proofs: {(requestData as any).submittedProofs?.length >= 1 ?
                      <span className="text-green-700">✓ Has {(requestData as any).submittedProofs?.length} proofs (BASIC level needs 1)</span> :
                      <span className="text-red-700">✗ Not enough proofs</span>
                    }</p>
                  </>
                ) : (
                  <p className="text-red-700">✗ Request does NOT exist in contract (requestId is 0)</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>1. Check if your request ID appears in the "Pending Request IDs" list above</p>
          <p>2. Enter your request ID in the input field to see its actual data</p>
          <p>3. Look at the Analysis section:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>If "Request does NOT exist" → The frontend has stale data. Clear cache and submit a new request.</li>
            <li>If "Not PENDING" → Request was already processed. Check the Approved/Rejected tabs.</li>
            <li>If "Not enough proofs" → The request needs more documents uploaded.</li>
            <li>If all checks pass → There may be a different issue. Contact support.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
