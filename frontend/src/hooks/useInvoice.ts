'use client'

import { useReadContract } from 'wagmi'
import { INVOICE_TOKEN_ABI } from '@/lib/abis/InvoiceToken'
import { CONTRACTS } from '@/lib/contracts'
import { formatUnits } from 'viem'
import { MOCK_INVOICE_DATA } from '@/lib/mockMarketplaceData'

// Invoice Status Enum
export enum InvoiceStatus {
  PENDING = 0,
  APPROVED = 1,
  FUNDED = 2,
  REPAID = 3,
  DEFAULTED = 4,
}

export type InvoiceData = {
  invoiceNumber: string
  issuer: string
  buyer: string
  amount: bigint
  dueDate: bigint
  issueDate: bigint
  status: InvoiceStatus
  advanceAmount: bigint
  ipfsHash: string
  businessName?: string
}

export function useInvoice(tokenId?: bigint) {
  const {
    data: invoiceData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceToken,
    abi: INVOICE_TOKEN_ABI,
    functionName: 'getInvoice',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  })

  // Check for mock data if no real data available
  const mockData = tokenId ? MOCK_INVOICE_DATA[tokenId.toString()] : null

  // Parse invoice data (use mock data if real data not available)
  const invoice = invoiceData
    ? {
        invoiceNumber: (invoiceData as any)[0] as string,
        issuer: (invoiceData as any)[1] as string,
        buyer: (invoiceData as any)[2] as string,
        amount: (invoiceData as any)[3] as bigint,
        dueDate: (invoiceData as any)[4] as bigint,
        issueDate: (invoiceData as any)[5] as bigint,
        status: (invoiceData as any)[6] as InvoiceStatus,
        advanceAmount: (invoiceData as any)[7] as bigint,
        ipfsHash: (invoiceData as any)[8] as string,
      }
    : mockData
    ? {
        invoiceNumber: mockData.invoiceNumber,
        issuer: '0x0000000000000000000000000000000000000000',
        buyer: '0x0000000000000000000000000000000000000000',
        amount: BigInt(mockData.amount * 1e6), // Convert to USDT units
        dueDate: mockData.dueDate,
        issueDate: BigInt(Math.floor(Date.now() / 1000)),
        status: mockData.status,
        advanceAmount: BigInt(0),
        ipfsHash: 'mock-ipfs-hash',
      }
    : null

  // Get owner
  const { data: owner } = useReadContract({
    address: CONTRACTS.InvoiceToken,
    abi: INVOICE_TOKEN_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  })

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return Number(formatUnits(amount, 6)).toFixed(2)
  }

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PENDING:
        return 'Pending'
      case InvoiceStatus.APPROVED:
        return 'Approved'
      case InvoiceStatus.FUNDED:
        return 'Funded'
      case InvoiceStatus.REPAID:
        return 'Repaid'
      case InvoiceStatus.DEFAULTED:
        return 'Defaulted'
      default:
        return 'Unknown'
    }
  }

  const getDaysUntilDue = () => {
    if (!invoice) return null
    const dueDate = Number(invoice.dueDate) * 1000
    const now = Date.now()
    const diff = dueDate - now
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const isOverdue = () => {
    const days = getDaysUntilDue()
    return days !== null && days < 0
  }

  return {
    invoice: invoice
      ? {
          ...invoice,
          amount: Number(formatAmount(invoice.amount)),
          advanceAmount: Number(formatAmount(invoice.advanceAmount)),
          statusText: getStatusText(invoice.status),
          businessName: mockData?.businessName || 'Business Name', // Use mock data business name if available
        }
      : null,
    owner: owner as string,
    isLoading,
    error,
    refetch,

    // Computed properties
    daysUntilDue: getDaysUntilDue(),
    isOverdue: isOverdue(),
  }
}

// Hook to fetch user's invoices
export function useUserInvoices(address?: `0x${string}`) {
  const {
    data: invoiceIds,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.InvoiceToken,
    abi: INVOICE_TOKEN_ABI,
    functionName: 'getInvoicesByIssuer',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  return {
    invoiceIds: (invoiceIds as bigint[]) || [],
    isLoading,
    refetch,
  }
}
