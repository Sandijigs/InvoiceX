'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useKYBRegistry } from '@/hooks/useKYBRegistry'
import { useBusinessRegistry } from '@/hooks/useBusinessRegistry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Loader2, CheckCircle, Upload, FileText, AlertCircle } from 'lucide-react'
import { keccak256 } from 'viem'
import { uploadFile, uploadJSON, storeBusinessMapping, getIPFSStatus } from '@/lib/ipfsService'

// Type definition for document metadata
type IPFSDocumentMetadata = {
  name: string
  type: string
  size: number
  hash: `0x${string}`
  ipfsHash: string
  uploadedAt: number
}

const JURISDICTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'SG', name: 'Singapore' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
]

const BUSINESS_TYPES = [
  'Limited Liability Company (LLC)',
  'Corporation (C-Corp)',
  'Corporation (S-Corp)',
  'Partnership',
  'Sole Proprietorship',
  'Non-Profit Organization',
  'Other',
]

export function KYBSubmissionForm() {
  const router = useRouter()
  const { address } = useAccount()
  const { submitKYB, isSubmitting, isSubmissionConfirmed, submitError, refetchValidity, refetchData } = useKYBRegistry()
  const { businessId, businessInfo } = useBusinessRegistry()

  const [formData, setFormData] = useState({
    jurisdiction: '',
    businessType: '',
    documents: {
      businessRegistration: '',
      bankStatement: '',
      taxDocument: '',
      ownershipProof: '',
      additionalDocs: '',
    },
  })

  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: File | null}>({
    businessRegistration: null,
    bankStatement: null,
    taxDocument: null,
    ownershipProof: null,
    additionalDocs: null,
  })

  const [documentMetadata, setDocumentMetadata] = useState<{[key: string]: IPFSDocumentMetadata}>({})
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false)


  // Auto-redirect after successful submission
  useEffect(() => {
    if (isSubmissionConfirmed) {
      const timer = setTimeout(async () => {
        // Refetch both validity and data before redirecting
        await Promise.all([refetchValidity(), refetchData()])
        // Add timestamp to force page refresh
        router.push('/business?refresh=' + Date.now())
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSubmissionConfirmed, router, refetchValidity, refetchData])

  const handleFileUpload = async (field: string, file: File | null) => {
    if (!file) {
      setUploadedFiles(prev => ({ ...prev, [field]: null }))
      setDocumentMetadata(prev => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
      setFormData(prev => ({
        ...prev,
        documents: { ...prev.documents, [field]: '' }
      }))
      return
    }

    setIsUploadingToIPFS(true)
    try {
      // Create hash of file content for verification
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const hash = keccak256(bytes)

      // Upload file to IPFS (Pinata or localStorage fallback)
      console.log(`📤 Uploading ${file.name} to IPFS...`)
      const ipfsCID = await uploadFile(file, { name: file.name })
      console.log(`✅ Uploaded to IPFS: ${ipfsCID}`)

      // Create document metadata with IPFS CID
      const metadata: IPFSDocumentMetadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        hash: hash,
        ipfsHash: ipfsCID,
        uploadedAt: Date.now()
      }

      setUploadedFiles(prev => ({ ...prev, [field]: file }))
      setDocumentMetadata(prev => ({ ...prev, [field]: metadata }))
      setFormData(prev => ({
        ...prev,
        documents: { ...prev.documents, [field]: hash }
      }))
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(`Failed to upload ${file.name}. Please try again.`)
    } finally {
      setIsUploadingToIPFS(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!businessInfo?.businessHash) {
        throw new Error('Business not registered. Please register your business first.')
      }

      if (!address) {
        throw new Error('Wallet not connected')
      }

      // Collect all document hashes as proof hashes
      const proofHashes: `0x${string}`[] = Object.values(formData.documents)
        .filter(hash => hash !== '')
        .map(hash => hash as `0x${string}`)

      if (proofHashes.length === 0) {
        throw new Error('Please upload at least one document')
      }

      // Upload document metadata to IPFS
      const ipfsStatus = getIPFSStatus()
      console.log('📤 Uploading metadata to IPFS...', ipfsStatus.message)
      const metadataToUpload = {
        businessAddress: address,
        businessId: businessId?.toString() || '',
        jurisdiction: formData.jurisdiction,
        businessType: formData.businessType,
        documents: documentMetadata,
        submittedAt: Date.now(),
        ipfsProvider: ipfsStatus.provider,
        ipfsMetadataHash: '' // Will be filled after upload
      }

      const metadataIPFSHash = await uploadJSON(metadataToUpload, `kyb-${address}-${Date.now()}.json`)
      console.log('✅ Metadata uploaded to IPFS:', metadataIPFSHash)

      // Store the mapping: businessAddress -> IPFS CID
      // This allows admin to find documents by business address
      storeBusinessMapping(address, metadataIPFSHash)
      console.log('✅ Stored IPFS mapping for admin access')

      // Submit KYB with business hash, proof hashes, jurisdiction, and business type
      console.log('📝 Submitting KYB to blockchain:', {
        businessHash: businessInfo.businessHash,
        proofHashesCount: proofHashes.length,
        jurisdiction: formData.jurisdiction,
        businessType: formData.businessType
      })

      await submitKYB(
        businessInfo.businessHash,
        proofHashes,
        formData.jurisdiction,
        formData.businessType
      )

      console.log('✅ KYB submission initiated, waiting for confirmation...')
    } catch (error) {
      console.error('❌ KYB submission failed:', error)
      alert(`KYB submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (isSubmissionConfirmed) {
    return (
      <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 shadow-xl shadow-emerald-100/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl"></div>
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <CheckCircle className="w-10 h-10 text-emerald-600 relative" />
            </div>
            <CardTitle className="text-emerald-900 text-xl">KYB Submitted Successfully!</CardTitle>
          </div>
          <CardDescription className="text-emerald-700">
            Your KYB verification request has been submitted. Redirecting you to the dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md"></div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-200/50 shadow-lg">
              <p className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                What happens next?
              </p>
              <ol className="text-sm text-slate-600 space-y-2.5">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs flex items-center justify-center font-semibold">1</span>
                  <span className="flex-1 pt-0.5">Your documents are being reviewed by our verification team</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs flex items-center justify-center font-semibold">2</span>
                  <span className="flex-1 pt-0.5">You'll receive a notification once verification is complete</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs flex items-center justify-center font-semibold">3</span>
                  <span className="flex-1 pt-0.5">Once approved, you can start submitting invoices for financing</span>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-indigo-200/50 bg-gradient-to-br from-white via-indigo-50/30 to-white shadow-xl shadow-indigo-100/50 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -z-0"></div>
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl shadow-lg shadow-indigo-200/50 border border-indigo-200/50">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-indigo-900">Submit KYB Verification</CardTitle>
            <CardDescription>
              Upload your business documents for Know Your Business verification
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information Alert */}
          <div className="bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-purple-50 border border-indigo-200/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900">Business ID: #{businessId?.toString()}</p>
                <p className="text-xs text-indigo-700 mt-1">
                  Make sure to upload documents that match your registered business information
                </p>
              </div>
            </div>
          </div>

          {/* Jurisdiction */}
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction *</Label>
            <Select
              value={formData.jurisdiction}
              onValueChange={(value) => setFormData({ ...formData, jurisdiction: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.code} value={j.code}>
                    {j.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Country where your business is registered
            </p>
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Uploads */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-lg border border-amber-200/50">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <FileText className="w-4 h-4 text-amber-700" />
              </div>
              <Label className="text-base font-semibold text-amber-900">Required Documents</Label>
            </div>

            {/* Business Registration Certificate */}
            <div className="space-y-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 transition-all duration-200 hover:border-emerald-300 hover:shadow-md">
              <Label htmlFor="businessRegistration" className="text-slate-900 font-medium">Business Registration Certificate *</Label>
              <Input
                id="businessRegistration"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('businessRegistration', e.target.files?.[0] || null)}
                required
                className="cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:text-white file:font-medium file:cursor-pointer hover:file:from-emerald-600 hover:file:to-teal-700 transition-all"
              />
              {uploadedFiles.businessRegistration && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadedFiles.businessRegistration.name} uploaded successfully
                </p>
              )}
            </div>

            {/* Bank Statement */}
            <div className="space-y-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 transition-all duration-200 hover:border-emerald-300 hover:shadow-md">
              <Label htmlFor="bankStatement" className="text-slate-900 font-medium">Recent Bank Statement (Last 3 months) *</Label>
              <Input
                id="bankStatement"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('bankStatement', e.target.files?.[0] || null)}
                required
                className="cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:text-white file:font-medium file:cursor-pointer hover:file:from-emerald-600 hover:file:to-teal-700 transition-all"
              />
              {uploadedFiles.bankStatement && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadedFiles.bankStatement.name} uploaded successfully
                </p>
              )}
            </div>

            {/* Tax Document */}
            <div className="space-y-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 transition-all duration-200 hover:border-emerald-300 hover:shadow-md">
              <Label htmlFor="taxDocument" className="text-slate-900 font-medium">Tax Document / EIN Letter *</Label>
              <Input
                id="taxDocument"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('taxDocument', e.target.files?.[0] || null)}
                required
                className="cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:text-white file:font-medium file:cursor-pointer hover:file:from-emerald-600 hover:file:to-teal-700 transition-all"
              />
              {uploadedFiles.taxDocument && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadedFiles.taxDocument.name} uploaded successfully
                </p>
              )}
            </div>

            {/* Ownership Proof */}
            <div className="space-y-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 transition-all duration-200 hover:border-indigo-300 hover:shadow-md">
              <Label htmlFor="ownershipProof" className="text-slate-900 font-medium">Proof of Ownership <span className="text-slate-500 font-normal">(Optional)</span></Label>
              <Input
                id="ownershipProof"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('ownershipProof', e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white file:font-medium file:cursor-pointer hover:file:from-indigo-600 hover:file:to-purple-700 transition-all"
              />
              {uploadedFiles.ownershipProof && (
                <p className="text-xs text-indigo-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadedFiles.ownershipProof.name} uploaded successfully
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Articles of incorporation, shareholding documents, etc.
              </p>
            </div>

            {/* Additional Documents */}
            <div className="space-y-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 transition-all duration-200 hover:border-indigo-300 hover:shadow-md">
              <Label htmlFor="additionalDocs" className="text-slate-900 font-medium">Additional Documents <span className="text-slate-500 font-normal">(Optional)</span></Label>
              <Input
                id="additionalDocs"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('additionalDocs', e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white file:font-medium file:cursor-pointer hover:file:from-indigo-600 hover:file:to-purple-700 transition-all"
              />
              {uploadedFiles.additionalDocs && (
                <p className="text-xs text-indigo-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {uploadedFiles.additionalDocs.name} uploaded successfully
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">Submission Failed</p>
                  <p className="text-xs text-red-700">
                    {submitError.message || 'Please check your documents and try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-slate-50 via-slate-100/50 to-slate-50 border border-slate-200/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Privacy & Security:</strong> In production, all documents would be encrypted and stored on IPFS or secure decentralized storage.
                Only document hashes are stored on-chain to preserve privacy and security.
              </p>
            </div>
          </div>

          {isUploadingToIPFS && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-900">Uploading files to IPFS...</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/business')}
              className="flex-1 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
              disabled={isSubmitting || isUploadingToIPFS}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isSubmitting || isUploadingToIPFS}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                  <span className="relative z-10 font-semibold">Submitting...</span>
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4 relative z-10 group-hover:scale-110 transition-transform duration-200" />
                  <span className="relative z-10 font-semibold">Submit for Verification</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
