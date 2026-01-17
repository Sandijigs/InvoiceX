// IPFS Storage for KYB Documents
// Uses a free public IPFS service (Pinata or Web3.Storage API)

export type IPFSDocumentMetadata = {
  name: string
  type: string
  size: number
  hash: string // keccak256 hash for verification
  ipfsHash: string // IPFS CID
  uploadedAt: number
}

export type IPFSBusinessDocuments = {
  businessAddress: string
  businessId: string
  jurisdiction: string
  businessType: string
  documents: {
    [key: string]: IPFSDocumentMetadata
  }
  submittedAt: number
  ipfsMetadataHash: string // CID of this metadata JSON
}

/**
 * Upload file to IPFS using Pinata public API
 * For production, use your own Pinata API key
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  try {
    // For demo purposes, we'll use a simple approach:
    // Convert file to base64 and store in a JSON that gets "uploaded" to a mock IPFS
    // In production, you'd use actual IPFS services like Pinata, NFT.Storage, or Web3.Storage

    const formData = new FormData()
    formData.append('file', file)

    // Try using a public IPFS gateway (this is a demo approach)
    // In production, use Pinata with API key or Web3.Storage

    // For now, create a deterministic "IPFS hash" based on file content
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Create a pseudo-CID (in production this would be real IPFS CID)
    const hashArray = await crypto.subtle.digest('SHA-256', bytes)
    const hashHex = Array.from(new Uint8Array(hashArray))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Format as IPFS-like CID (demo only)
    const ipfsCID = `Qm${hashHex.slice(0, 44)}`

    console.log(`📦 Generated IPFS CID for ${file.name}: ${ipfsCID}`)

    // Store the file data in localStorage with the CID as key
    // In production, this would be uploaded to IPFS
    const base64 = await fileToBase64(file)
    const fileData = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64,
      uploadedAt: Date.now()
    }

    localStorage.setItem(`ipfs_${ipfsCID}`, JSON.stringify(fileData))

    return ipfsCID
  } catch (error) {
    console.error('Error uploading to IPFS:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Upload metadata JSON to IPFS
 */
export async function uploadMetadataToIPFS(metadata: IPFSBusinessDocuments): Promise<string> {
  try {
    // Convert metadata to JSON string
    const jsonString = JSON.stringify(metadata, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Create a pseudo-CID for metadata
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonString)
    const hashArray = await crypto.subtle.digest('SHA-256', data)
    const hashHex = Array.from(new Uint8Array(hashArray))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const ipfsCID = `Qm${hashHex.slice(0, 44)}`

    console.log(`📋 Generated metadata IPFS CID: ${ipfsCID}`)

    // Store metadata in localStorage
    localStorage.setItem(`ipfs_${ipfsCID}`, jsonString)

    return ipfsCID
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error)
    throw new Error('Failed to upload metadata to IPFS')
  }
}

/**
 * Retrieve file from IPFS
 */
export async function fetchFromIPFS(ipfsCID: string): Promise<any> {
  try {
    // Try localStorage first (our demo storage)
    const localData = localStorage.getItem(`ipfs_${ipfsCID}`)
    if (localData) {
      try {
        return JSON.parse(localData)
      } catch {
        return localData
      }
    }

    // In production, fetch from actual IPFS gateways:
    // const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsCID}`)
    // const response = await fetch(`https://ipfs.io/ipfs/${ipfsCID}`)
    // const response = await fetch(`https://dweb.link/ipfs/${ipfsCID}`)

    throw new Error('Document not found in IPFS')
  } catch (error) {
    console.error('Error fetching from IPFS:', error)
    throw error
  }
}

/**
 * Store IPFS CID mapping for business address
 * This allows admin to find documents by business address
 */
export function storeIPFSMapping(businessAddress: string, metadataIPFSHash: string): void {
  const mappingKey = `ipfs_mapping_${businessAddress.toLowerCase()}`
  localStorage.setItem(mappingKey, metadataIPFSHash)
  console.log(`✅ Stored IPFS mapping: ${businessAddress} -> ${metadataIPFSHash}`)
}

/**
 * Get IPFS CID for business address
 */
export function getIPFSMapping(businessAddress: string): string | null {
  const mappingKey = `ipfs_mapping_${businessAddress.toLowerCase()}`
  return localStorage.getItem(mappingKey)
}

/**
 * Helper: Convert file to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to get just the base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

/**
 * Helper: Convert base64 to blob URL for preview
 */
export function base64ToBlobUrl(base64: string, mimeType: string): string {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Get business documents from IPFS using business address
 */
export async function getBusinessDocumentsFromIPFS(businessAddress: string): Promise<IPFSBusinessDocuments | null> {
  try {
    const metadataIPFSHash = getIPFSMapping(businessAddress)
    if (!metadataIPFSHash) {
      console.log(`⚠️ No IPFS mapping found for ${businessAddress}`)
      return null
    }

    console.log(`📥 Fetching documents from IPFS: ${metadataIPFSHash}`)
    const metadata = await fetchFromIPFS(metadataIPFSHash)

    if (typeof metadata === 'string') {
      return JSON.parse(metadata) as IPFSBusinessDocuments
    }

    return metadata as IPFSBusinessDocuments
  } catch (error) {
    console.error('Error getting business documents from IPFS:', error)
    return null
  }
}
