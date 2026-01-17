/**
 * IPFS Service - Hybrid approach
 *
 * This service provides a unified interface for IPFS operations.
 * - Uses Pinata when properly configured
 * - Falls back to localStorage simulation for development/testing
 */

import {
  uploadFileToPinata,
  uploadJSONToPinata,
  fetchFromIPFS as fetchFromPinata,
  getIPFSUrl as getPinataUrl,
  fetchFileAsBlob as fetchBlobFromPinata,
  isPinataConfigured,
} from './pinata'

import {
  uploadFileToIPFS as uploadToLocalStorage,
  uploadMetadataToIPFS as uploadMetadataToLocalStorage,
  fetchFromIPFS as fetchFromLocalStorage,
  storeIPFSMapping,
  getIPFSMapping,
  getBusinessDocumentsFromIPFS as getBusinessDocsFromLocalStorage,
  type IPFSBusinessDocuments,
} from './ipfsStorage'

/**
 * Upload a file to IPFS (Pinata or localStorage fallback)
 */
export async function uploadFile(file: File, metadata?: { name?: string }): Promise<string> {
  if (isPinataConfigured()) {
    console.log('🔵 Using Pinata for file upload')
    return await uploadFileToPinata(file, metadata)
  } else {
    console.log('🟡 Pinata not configured, using localStorage fallback')
    return await uploadToLocalStorage(file)
  }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadJSON(json: Record<string, any>, name?: string): Promise<string> {
  if (isPinataConfigured()) {
    console.log('🔵 Using Pinata for JSON upload')
    return await uploadJSONToPinata(json, name)
  } else {
    console.log('🟡 Pinata not configured, using localStorage fallback')
    return await uploadMetadataToLocalStorage(json)
  }
}

/**
 * Fetch content from IPFS
 */
export async function fetchFromIPFS<T = any>(cid: string): Promise<T> {
  if (isPinataConfigured()) {
    return await fetchFromPinata<T>(cid)
  } else {
    return await fetchFromLocalStorage(cid) as T
  }
}

/**
 * Get the gateway URL for a CID
 */
export function getIPFSGatewayUrl(cid: string): string {
  if (isPinataConfigured()) {
    return getPinataUrl(cid)
  } else {
    // For localStorage, return a data URL marker
    return `localStorage://${cid}`
  }
}

/**
 * Fetch file as blob
 */
export async function fetchFileAsBlob(cid: string): Promise<Blob> {
  if (isPinataConfigured()) {
    return await fetchBlobFromPinata(cid)
  } else {
    // For localStorage, fetch and convert to blob
    const data = await fetchFromLocalStorage(cid)
    if (data && typeof data === 'object' && 'data' in data) {
      // Convert base64 to blob
      const base64Data = (data as any).data
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      return new Blob([byteArray], { type: (data as any).type })
    }
    throw new Error('Invalid data format')
  }
}

/**
 * Store business-to-IPFS mapping (for cross-wallet access)
 */
export function storeBusinessMapping(businessAddress: string, metadataIPFSHash: string): void {
  storeIPFSMapping(businessAddress, metadataIPFSHash)
}

/**
 * Get business-to-IPFS mapping
 */
export function getBusinessMapping(businessAddress: string): string | null {
  return getIPFSMapping(businessAddress)
}

/**
 * Get business documents from IPFS (both Pinata and localStorage compatible)
 */
export async function getBusinessDocuments(businessAddress: string): Promise<IPFSBusinessDocuments | null> {
  const metadataHash = getBusinessMapping(businessAddress)
  if (!metadataHash) {
    console.log('No IPFS mapping found for business:', businessAddress)
    return null
  }

  try {
    const metadata = await fetchFromIPFS<IPFSBusinessDocuments>(metadataHash)
    return metadata
  } catch (error) {
    console.error('Error fetching business documents from IPFS:', error)
    // Fallback to localStorage method
    return await getBusinessDocsFromLocalStorage(businessAddress)
  }
}

/**
 * Check if real IPFS (Pinata) is being used
 */
export function isUsingRealIPFS(): boolean {
  return isPinataConfigured()
}

/**
 * Get IPFS status message
 */
export function getIPFSStatus(): { configured: boolean; provider: string; message: string } {
  if (isPinataConfigured()) {
    return {
      configured: true,
      provider: 'Pinata',
      message: '✅ Connected to Pinata IPFS'
    }
  } else {
    return {
      configured: false,
      provider: 'localStorage',
      message: '⚠️ Using localStorage fallback. Configure Pinata for production use.'
    }
  }
}

// Export types
export type { IPFSBusinessDocuments } from './ipfsStorage'
