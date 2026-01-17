'use client'

import { Button } from '@/components/ui/button'
import { useAdminActions } from '@/hooks/useAdminData'

export function TestRejectButton({ requestId }: { requestId: bigint }) {
  const { rejectKYB } = useAdminActions()

  const handleReject = async () => {
    console.log('🔴 TEST: Rejecting request:', requestId.toString())
    try {
      await rejectKYB(requestId, 'Test rejection to see if request exists')
      console.log('✅ Rejection submitted')
    } catch (error) {
      console.error('❌ Rejection failed:', error)
    }
  }

  return (
    <Button onClick={handleReject} variant="destructive" size="sm">
      Test Reject #{requestId.toString()}
    </Button>
  )
}