'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react'
import { keccak256, toBytes, parseUnits } from 'viem'
import { uploadFile, uploadJSON, getIPFSStatus } from '@/lib/ipfsService'
import { IPFSStatusIndicator } from '@/components/common/IPFSStatus'
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission'

type InvoiceDocumentMetadata = {
  name: string
  type: string
  size: number
  hash: `0x${string}`
  ipfsHash: string
  uploadedAt: number
}

type InvoiceFormData = {
  invoiceNumber: string
  buyerAddress: string
  buyerName: string
  buyerEmail: string
  invoiceAmount: string
  dueDate: string
  description: string
  paymentTerms: string
}

export function InvoiceUploadForm() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { submitInvoice, isLoading: isSubmittingToBlockchain, isSuccess: isBlockchainSuccess, error: blockchainError } = useInvoiceSubmission()

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    buyerAddress: '',
    buyerName: '',
    buyerEmail: '',
    invoiceAmount: '',
    dueDate: '',
    description: '',
    paymentTerms: '30'
  })

  const [invoiceMetadata, setInvoiceMetadata] = useState<InvoiceDocumentMetadata | null>(null)
  const [supportingDocsMetadata, setSupportingDocsMetadata] = useState<InvoiceDocumentMetadata[]>([])

  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Handle blockchain transaction success
  useEffect(() => {
    if (isBlockchainSuccess) {
      setUploadStatus('success')
      setTimeout(() => {
        router.push('/business?refresh=true')
      }, 2000)
    }
  }, [isBlockchainSuccess, router])

  // Handle blockchain errors
  useEffect(() => {
    if (blockchainError) {
      setErrorMessage(blockchainError.message || 'Failed to submit invoice to blockchain')
      setUploadStatus('error')
    }
  }, [blockchainError])

  const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInvoiceFileUpload = async (file: File | null) => {
    if (!file) {
      setInvoiceMetadata(null)
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or image file (JPG, PNG)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploadingToIPFS(true)
    try {
      // Create hash of file content
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const hash = keccak256(bytes)

      // Upload file to IPFS
      console.log(`📤 Uploading invoice document ${file.name} to IPFS...`)
      const ipfsCID = await uploadFile(file, { name: file.name })
      console.log(`✅ Invoice document uploaded to IPFS: ${ipfsCID}`)

      const metadata: InvoiceDocumentMetadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        hash: hash,
        ipfsHash: ipfsCID,
        uploadedAt: Date.now()
      }

      setInvoiceMetadata(metadata)
    } catch (error) {
      console.error('Error uploading invoice document:', error)
      alert(`Failed to upload ${file.name}. Please try again.`)
    } finally {
      setIsUploadingToIPFS(false)
    }
  }

  const handleSupportingDocsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploadingToIPFS(true)
    try {
      const uploadedMetadata: InvoiceDocumentMetadata[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large (max 10MB)`)
          continue
        }

        // Create hash and upload
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const hash = keccak256(bytes)

        console.log(`📤 Uploading supporting document ${file.name} to IPFS...`)
        const ipfsCID = await uploadFile(file, { name: file.name })
        console.log(`✅ Supporting document uploaded: ${ipfsCID}`)

        const metadata: InvoiceDocumentMetadata = {
          name: file.name,
          type: file.type,
          size: file.size,
          hash: hash,
          ipfsHash: ipfsCID,
          uploadedAt: Date.now()
        }

        uploadedMetadata.push(metadata)
      }

      setSupportingDocsMetadata(prev => [...prev, ...uploadedMetadata])
    } catch (error) {
      console.error('Error uploading supporting documents:', error)
      alert('Failed to upload some documents. Please try again.')
    } finally {
      setIsUploadingToIPFS(false)
    }
  }

  const removeSupportingDoc = (index: number) => {
    setSupportingDocsMetadata(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = (): boolean => {
    if (!formData.invoiceNumber.trim()) {
      setErrorMessage('Invoice number is required')
      return false
    }

    if (!formData.buyerAddress || !formData.buyerAddress.startsWith('0x')) {
      setErrorMessage('Valid buyer wallet address is required')
      return false
    }

    if (!formData.invoiceAmount || parseFloat(formData.invoiceAmount) <= 0) {
      setErrorMessage('Invoice amount must be greater than 0')
      return false
    }

    if (!formData.dueDate) {
      setErrorMessage('Due date is required')
      return false
    }

    const dueDate = new Date(formData.dueDate)
    const today = new Date()
    if (dueDate <= today) {
      setErrorMessage('Due date must be in the future')
      return false
    }

    if (!invoiceMetadata) {
      setErrorMessage('Please upload the invoice document')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    setErrorMessage('')

    if (!validateForm()) {
      return
    }

    setUploadStatus('uploading')

    try {
      // Calculate buyer hash
      const buyerHash = keccak256(toBytes(formData.buyerAddress))

      // Calculate due date timestamp
      const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000)

      // Parse invoice amount (assuming USDT has 6 decimals)
      const faceValue = parseUnits(formData.invoiceAmount, 6)

      // Upload comprehensive metadata to IPFS
      const ipfsStatus = getIPFSStatus()
      console.log('📤 Uploading invoice metadata to IPFS...', ipfsStatus.message)

      const metadataToUpload = {
        invoiceNumber: formData.invoiceNumber,
        sellerAddress: address,
        buyer: {
          address: formData.buyerAddress,
          name: formData.buyerName,
          email: formData.buyerEmail,
          hash: buyerHash
        },
        invoice: {
          amount: formData.invoiceAmount,
          dueDate: formData.dueDate,
          dueDateTimestamp,
          description: formData.description,
          paymentTerms: formData.paymentTerms
        },
        documents: {
          invoice: invoiceMetadata,
          supporting: supportingDocsMetadata
        },
        submittedAt: Date.now(),
        ipfsProvider: ipfsStatus.provider
      }

      const metadataIPFSHash = await uploadJSON(
        metadataToUpload,
        `invoice-${formData.invoiceNumber}-${Date.now()}.json`
      )
      console.log('✅ Invoice metadata uploaded to IPFS:', metadataIPFSHash)

      // Submit to blockchain
      console.log('📝 Submitting invoice to blockchain:', {
        buyerHash,
        faceValue: faceValue.toString(),
        dueDate: dueDateTimestamp,
        documentHash: invoiceMetadata!.hash,
        invoiceNumber: formData.invoiceNumber
      })

      await submitInvoice(
        buyerHash,
        faceValue,
        dueDateTimestamp,
        invoiceMetadata!.hash,
        formData.invoiceNumber
      )

      console.log('✅ Invoice submission initiated, waiting for confirmation...')

    } catch (error) {
      console.error('❌ Invoice submission failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit invoice')
      setUploadStatus('error')
    }
  }

  const calculatePaymentTermDays = () => {
    if (!formData.dueDate) return 0
    const dueDate = new Date(formData.dueDate)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Upload Invoice</CardTitle>
              <CardDescription>
                Submit an invoice for financing through the InvoiceX platform
              </CardDescription>
            </div>
          </div>
          <IPFSStatusIndicator />
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-2024-001"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceAmount">Invoice Amount (USDT) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="invoiceAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10000.00"
                    className="pl-10"
                    value={formData.invoiceAmount}
                    onChange={(e) => handleInputChange('invoiceAmount', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="dueDate"
                    type="date"
                    className="pl-10"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                {formData.dueDate && (
                  <p className="text-xs text-gray-500">
                    Payment terms: {calculatePaymentTermDays()} days
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="Net 30"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of goods/services provided..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Buyer Information Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Buyer Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="buyerAddress">Buyer Wallet Address *</Label>
                <Input
                  id="buyerAddress"
                  placeholder="0x..."
                  value={formData.buyerAddress}
                  onChange={(e) => handleInputChange('buyerAddress', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  The blockchain wallet address of the company that owes this payment
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Company Name</Label>
                <Input
                  id="buyerName"
                  placeholder="Acme Corporation"
                  value={formData.buyerName}
                  onChange={(e) => handleInputChange('buyerName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Buyer Contact Email</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  placeholder="finance@acme.com"
                  value={formData.buyerEmail}
                  onChange={(e) => handleInputChange('buyerEmail', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Documents
            </h3>

            {/* Invoice Document */}
            <div className="space-y-2">
              <Label>Invoice Document (PDF or Image) *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleInvoiceFileUpload(e.target.files?.[0] || null)}
                  className="hidden"
                  id="invoice-upload"
                  disabled={isUploadingToIPFS}
                />
                <label
                  htmlFor="invoice-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {invoiceMetadata ? (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{invoiceMetadata.name}</p>
                        <p className="text-xs text-gray-500">
                          {(invoiceMetadata.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Click to upload invoice document
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, or PNG (max 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Supporting Documents */}
            <div className="space-y-2">
              <Label>Supporting Documents (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleSupportingDocsUpload(e.target.files)}
                  className="hidden"
                  id="supporting-docs-upload"
                  disabled={isUploadingToIPFS}
                />
                <label
                  htmlFor="supporting-docs-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload supporting documents
                  </p>
                  <p className="text-xs text-gray-500">
                    Purchase orders, delivery receipts, contracts, etc.
                  </p>
                </label>
              </div>

              {supportingDocsMetadata.length > 0 && (
                <div className="space-y-2 mt-3">
                  {supportingDocsMetadata.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span>{doc.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(doc.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSupportingDoc(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* IPFS Upload Status */}
          {isUploadingToIPFS && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Uploading documents to IPFS...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Invoice submitted successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmittingToBlockchain || isUploadingToIPFS}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingToBlockchain || isUploadingToIPFS || !invoiceMetadata}
              className="w-full"
            >
              {isSubmittingToBlockchain ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting to Blockchain...
                </>
              ) : isUploadingToIPFS ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
