import { useInvoiceToken, InvoiceStatus } from './useInvoiceToken'
import { useInvoiceData } from './useInvoiceToken'
import { useMemo } from 'react'
import { formatUnits } from 'viem'

export function useBusinessStats() {
  const { invoiceIds, isLoadingIds } = useInvoiceToken()

  // Calculate stats from invoices
  const stats = useMemo(() => {
    if (!invoiceIds || invoiceIds.length === 0) {
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        fundedInvoices: 0,
        repaidInvoices: 0,
        totalValue: '0',
        totalFunded: '0',
        totalRepaid: '0',
        averageInvoiceValue: '0',
      }
    }

    // For now, return basic stats
    // In a full implementation, you'd fetch all invoice details
    return {
      totalInvoices: invoiceIds.length,
      pendingInvoices: 0, // Will be calculated from invoice data
      fundedInvoices: 0,
      repaidInvoices: 0,
      totalValue: '0',
      totalFunded: '0',
      totalRepaid: '0',
      averageInvoiceValue: '0',
    }
  }, [invoiceIds])

  return {
    stats,
    isLoading: isLoadingIds,
  }
}

// Hook for detailed stats with all invoice data
export function useDetailedBusinessStats() {
  const { invoiceIds, isLoadingIds } = useInvoiceToken()

  // This would ideally use a multicall or batch request
  // For now, we'll return basic stats
  const stats = useMemo(() => {
    if (!invoiceIds || invoiceIds.length === 0) {
      return null
    }

    return {
      totalInvoices: invoiceIds.length,
      invoicesByStatus: {
        [InvoiceStatus.Pending]: 0,
        [InvoiceStatus.Funded]: 0,
        [InvoiceStatus.Repaid]: 0,
        [InvoiceStatus.Defaulted]: 0,
      },
      financials: {
        totalValue: BigInt(0),
        totalAdvanced: BigInt(0),
        totalRepaid: BigInt(0),
        totalOutstanding: BigInt(0),
      },
    }
  }, [invoiceIds])

  return {
    stats,
    isLoading: isLoadingIds,
  }
}
