import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { INVOICE_TOKEN_ABI } from '@/lib/abis/InvoiceToken'
import { INVOICE_X_CORE_ABI } from '@/lib/abis/InvoiceXCore'
import { getContractAddress } from '@/lib/contracts'
import { mantleSepoliaTestnet } from '@/lib/chains'

export enum InvoiceStatus {
  Pending = 0,
  Funded = 1,
  Repaid = 2,
  Defaulted = 3,
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
}

export function useInvoiceToken() {
  const { address } = useAccount()
  const chainId = mantleSepoliaTestnet.id

  // Read: Get invoices by issuer
  const { data: invoiceIds, isLoading: isLoadingIds, refetch: refetchInvoiceIds } = useReadContract({
    address: getContractAddress(chainId, 'invoiceToken') as `0x${string}`,
    abi: INVOICE_TOKEN_ABI,
    functionName: 'getInvoicesByIssuer',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Write: Submit invoice
  const {
    writeContract: submitInvoice,
    data: submitHash,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract()

  const { isLoading: isConfirmingSubmit, isSuccess: isSubmitConfirmed } = useWaitForTransactionReceipt({
    hash: submitHash,
  })

  // Write: Request advance
  const {
    writeContract: requestAdvance,
    data: advanceHash,
    isPending: isRequestingAdvance,
    error: advanceError,
  } = useWriteContract()

  const { isLoading: isConfirmingAdvance, isSuccess: isAdvanceConfirmed } = useWaitForTransactionReceipt({
    hash: advanceHash,
  })

  const handleSubmitInvoice = async (
    invoiceNumber: string,
    buyer: string,
    amount: bigint,
    dueDate: bigint,
    ipfsHash: string
  ) => {
    if (!address) throw new Error('Wallet not connected')

    submitInvoice({
      address: getContractAddress(chainId, 'invoiceXCore') as `0x${string}`,
      abi: INVOICE_X_CORE_ABI,
      functionName: 'submitInvoice',
      args: [invoiceNumber, buyer as `0x${string}`, amount, dueDate, ipfsHash],
    })
  }

  const handleRequestAdvance = async (tokenId: bigint) => {
    if (!address) throw new Error('Wallet not connected')

    requestAdvance({
      address: getContractAddress(chainId, 'invoiceXCore') as `0x${string}`,
      abi: INVOICE_X_CORE_ABI,
      functionName: 'requestAdvance',
      args: [tokenId],
    })
  }

  return {
    // State
    invoiceIds: (invoiceIds as bigint[]) || [],

    // Loading states
    isLoadingIds,
    isSubmitting: isSubmitting || isConfirmingSubmit,
    isRequestingAdvance: isRequestingAdvance || isConfirmingAdvance,

    // Success states
    isSubmitConfirmed,
    isAdvanceConfirmed,

    // Errors
    submitError,
    advanceError,

    // Actions
    submitInvoice: handleSubmitInvoice,
    requestAdvance: handleRequestAdvance,
    refetchInvoiceIds,
  }
}

// Hook to get single invoice data
export function useInvoiceData(tokenId?: bigint) {
  const chainId = mantleSepoliaTestnet.id

  const { data: invoiceData, isLoading, refetch } = useReadContract({
    address: getContractAddress(chainId, 'invoiceToken') as `0x${string}`,
    abi: INVOICE_TOKEN_ABI,
    functionName: 'getInvoice',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  })

  const parsedData = invoiceData ? {
    invoiceNumber: (invoiceData as any).invoiceNumber,
    issuer: (invoiceData as any).issuer,
    buyer: (invoiceData as any).buyer,
    amount: (invoiceData as any).amount,
    dueDate: (invoiceData as any).dueDate,
    issueDate: (invoiceData as any).issueDate,
    status: (invoiceData as any).status as InvoiceStatus,
    advanceAmount: (invoiceData as any).advanceAmount,
    ipfsHash: (invoiceData as any).ipfsHash,
  } as InvoiceData : undefined

  return {
    invoiceData: parsedData,
    isLoading,
    refetch,
  }
}
