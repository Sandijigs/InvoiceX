// Simple document storage utility for KYB documents
// In production, this would use IPFS, Arweave, or a backend API

export type DocumentMetadata = {
  name: string
  type: string
  size: number
  hash: string
  uploadedAt: number
  preview?: string // Base64 preview (first 1KB)
}

export type BusinessDocuments = {
  businessAddress: string
  businessId: string
  jurisdiction: string
  businessType: string
  documents: {
    [key: string]: DocumentMetadata
  }
  submittedAt: number
}

const STORAGE_KEY_PREFIX = 'kyb_documents_'

/**
 * Store KYB documents for a business
 */
export function storeBusinessDocuments(businessAddress: string, data: BusinessDocuments): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${businessAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(data))
    console.log(`Stored KYB documents for ${businessAddress}`)
  } catch (error) {
    console.error('Error storing documents:', error)
    // If localStorage is full, try to clean up old entries
    cleanupOldDocuments()
    try {
      const key = `${STORAGE_KEY_PREFIX}${businessAddress.toLowerCase()}`
      localStorage.setItem(key, JSON.stringify(data))
    } catch (retryError) {
      console.error('Failed to store documents even after cleanup:', retryError)
    }
  }
}

/**
 * Retrieve KYB documents for a business
 */
export function getBusinessDocuments(businessAddress: string): BusinessDocuments | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${businessAddress.toLowerCase()}`
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (error) {
    console.error('Error retrieving documents:', error)
    return null
  }
}

/**
 * Get all stored business documents (for admin)
 */
export function getAllBusinessDocuments(): BusinessDocuments[] {
  const documents: BusinessDocuments[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            documents.push(JSON.parse(data))
          } catch (parseError) {
            console.error(`Error parsing document data for key ${key}:`, parseError)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving all documents:', error)
  }
  return documents
}

/**
 * Clean up old documents (older than 30 days)
 */
function cleanupOldDocuments(): void {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            const parsed: BusinessDocuments = JSON.parse(data)
            if (parsed.submittedAt < thirtyDaysAgo) {
              localStorage.removeItem(key)
              console.log(`Cleaned up old documents for ${parsed.businessAddress}`)
            }
          } catch (parseError) {
            // If we can't parse it, remove it
            localStorage.removeItem(key)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

/**
 * Convert file to document metadata
 */
export async function fileToDocumentMetadata(file: File, hash: string): Promise<DocumentMetadata> {
  // Read first 1KB for preview
  const previewSize = Math.min(file.size, 1024)
  const previewBlob = file.slice(0, previewSize)
  const arrayBuffer = await previewBlob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const base64Preview = btoa(String.fromCharCode(...bytes))

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    hash: hash,
    uploadedAt: Date.now(),
    preview: base64Preview
  }
}
