'use client'

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useState, useCallback, useEffect } from 'react'
import { CONTRACTS } from '@/lib/contracts'
import { INVOICE_X_CORE_ABI } from '@/lib/abis/InvoiceXCore'

/**
 * Hook for submitting invoices to the blockchain
 */
export function useInvoiceSubmission() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: txError,
    error: txErrorDetails
  } = useWaitForTransactionReceipt({
    hash,
    timeout: 120000, // 2 minute timeout for invoice submission
  })

  // Log transaction hash when available
  useEffect(() => {
    if (hash) {
      console.log('📝 Invoice submission transaction hash:', hash)
      console.log('View on explorer: https://sepolia.mantlescan.xyz/tx/' + hash)
      console.log('Transaction status:', { isPending, isConfirming, isSuccess, txError })
    }
  }, [hash, isPending, isConfirming, isSuccess, txError])

  // Log transaction confirmation
  useEffect(() => {
    if (isSuccess) {
      console.log('✅ Invoice submission transaction confirmed!')
    }
  }, [isSuccess])

  // Log transaction errors
  useEffect(() => {
    if (txError && txErrorDetails) {
      console.error('❌ Invoice submission transaction error:', txErrorDetails)
    }
  }, [txError, txErrorDetails])

  useEffect(() => {
    if (writeError) {
      console.error('❌ Invoice submission write error:', writeError)
    }
  }, [writeError])

  /**
   * Submit an invoice to the blockchain
   * @param buyerHash - Keccak256 hash of buyer's address
   * @param faceValue - Invoice amount in smallest unit (e.g., USDT with 6 decimals)
   * @param dueDate - Unix timestamp of due date
   * @param documentHash - Keccak256 hash of invoice document
   * @param invoiceNumber - Invoice number (unique identifier)
   */
  const submitInvoice = useCallback(
    async (
      buyerHash: `0x${string}`,
      faceValue: bigint,
      dueDate: number,
      documentHash: `0x${string}`,
      invoiceNumber: string
    ) => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('✅ Submitting invoice to blockchain...', {
          buyerHash,
          faceValue: faceValue.toString(),
          dueDate,
          documentHash,
          invoiceNumber,
          contractAddress: CONTRACTS.invoiceXCore
        })

        writeContract({
          address: CONTRACTS.invoiceXCore,
          abi: INVOICE_X_CORE_ABI,
          functionName: 'submitInvoice',
          args: [buyerHash, faceValue, BigInt(dueDate), documentHash, invoiceNumber],
        })

        console.log('📝 Invoice submission transaction initiated')
      } catch (err) {
        const error = err as Error
        console.error('❌ Error submitting invoice:', error)
        setError(error)
        setIsLoading(false)
      }
    },
    [writeContract]
  )

  return {
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    isError: txError || !!writeError,
    error: error || writeError || (txError ? txErrorDetails : null),
    hash,

    // Actions
    submitInvoice,
  }
}

// Note: The following hooks are for additional invoice data fetching
export function useInvoiceRequest(requestId: bigint | undefined) {
  const { data: requestData, isLoading, refetch } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'getRequest',
    args: requestId !== undefined ? [requestId] : undefined,
    query: {
      enabled: requestId !== undefined,
    },
  })

  return {
    request: requestData,
    isLoading,
    refetch,
  }
}

export function useBusinessInvoices(businessId: bigint | undefined) {
  const { data: requestIds, isLoading, refetch } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'getBusinessRequests',
    args: businessId !== undefined ? [businessId] : undefined,
    query: {
      enabled: businessId !== undefined,
    },
  })

  return {
    requestIds: requestIds as bigint[] | undefined,
    isLoading,
    refetch,
  }
}

export function usePlatformLimits() {
  const { data: minAmount } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'minInvoiceAmount',
  })

  const { data: maxAmount } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'maxInvoiceAmount',
  })

  const { data: minDays } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'minPaymentTermDays',
  })

  const { data: maxDays } = useReadContract({
    address: CONTRACTS.invoiceXCore,
    abi: INVOICE_X_CORE_ABI,
    functionName: 'maxPaymentTermDays',
  })

  return {
    minInvoiceAmount: minAmount as bigint | undefined,
    maxInvoiceAmount: maxAmount as bigint | undefined,
    minPaymentTermDays: minDays as bigint | undefined,
    maxPaymentTermDays: maxDays as bigint | undefined,
  }
}
