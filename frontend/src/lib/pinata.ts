/**
 * Pinata IPFS Integration
 *
 * This module provides functions to upload and retrieve files from IPFS using Pinata.
 * Pinata is used as the IPFS pinning service for reliable, fast access to files.
 */

const PINATA_API_URL = 'https://api.pinata.cloud'
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'
const PINATA_JWT = process.env.PINATA_JWT

/**
 * Upload a file to IPFS via Pinata
 * @param file - The file to upload
 * @param metadata - Optional metadata for the file
 * @returns IPFS CID (Content Identifier)
 */
export async function uploadFileToPinata(
  file: File,
  metadata?: {
    name?: string
    keyvalues?: Record<string, string>
  }
): Promise<string> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured. Please set PINATA_JWT in .env.local')
    }

    const formData = new FormData()
    formData.append('file', file)

    // Add optional metadata
    if (metadata) {
      const pinataMetadata = {
        name: metadata.name || file.name,
        keyvalues: metadata.keyvalues || {}
      }
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata))
    }

    // Add pinata options (optional)
    const pinataOptions = {
      cidVersion: 1, // Use CIDv1 for better compatibility
    }
    formData.append('pinataOptions', JSON.stringify(pinataOptions))

    console.log('📤 Uploading file to Pinata IPFS...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Pinata upload failed: ${response.statusText}. ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const cid = data.IpfsHash

    console.log('✅ File uploaded to IPFS:', {
      cid,
      name: file.name,
      size: file.size,
      gateway: `${PINATA_GATEWAY}/ipfs/${cid}`
    })

    return cid
  } catch (error) {
    console.error('❌ Error uploading file to Pinata:', error)
    throw error
  }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param json - The JSON object to upload
 * @param name - Optional name for the JSON file
 * @returns IPFS CID
 */
export async function uploadJSONToPinata(
  json: Record<string, any>,
  name?: string
): Promise<string> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured. Please set PINATA_JWT in .env.local')
    }

    const body = {
      pinataContent: json,
      pinataMetadata: {
        name: name || 'metadata.json',
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }

    console.log('📤 Uploading JSON to Pinata IPFS...', { name })

    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Pinata JSON upload failed: ${response.statusText}. ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const cid = data.IpfsHash

    console.log('✅ JSON uploaded to IPFS:', {
      cid,
      name,
      gateway: `${PINATA_GATEWAY}/ipfs/${cid}`
    })

    return cid
  } catch (error) {
    console.error('❌ Error uploading JSON to Pinata:', error)
    throw error
  }
}

/**
 * Fetch content from IPFS via Pinata gateway
 * @param cid - The IPFS CID to fetch
 * @returns The content (parsed as JSON if applicable)
 */
export async function fetchFromIPFS<T = any>(cid: string): Promise<T> {
  try {
    const url = `${PINATA_GATEWAY}/ipfs/${cid}`

    console.log('📥 Fetching from IPFS:', { cid, url })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')

    // If JSON, parse it
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      console.log('✅ Fetched JSON from IPFS:', { cid })
      return data as T
    }

    // Otherwise return as text
    const text = await response.text()
    console.log('✅ Fetched content from IPFS:', { cid, length: text.length })
    return text as T
  } catch (error) {
    console.error('❌ Error fetching from IPFS:', error)
    throw error
  }
}

/**
 * Get the full gateway URL for an IPFS CID
 * @param cid - The IPFS CID
 * @returns Full gateway URL
 */
export function getIPFSUrl(cid: string): string {
  if (!cid) return ''

  // If CID already contains gateway URL, return as is
  if (cid.startsWith('http')) {
    return cid
  }

  // Remove ipfs:// prefix if present
  const cleanCid = cid.replace('ipfs://', '')

  return `${PINATA_GATEWAY}/ipfs/${cleanCid}`
}

/**
 * Fetch file as blob (useful for images, PDFs, etc.)
 * @param cid - The IPFS CID
 * @returns Blob of the file
 */
export async function fetchFileAsBlob(cid: string): Promise<Blob> {
  try {
    const url = getIPFSUrl(cid)

    console.log('📥 Fetching file as blob from IPFS:', { cid, url })

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch file from IPFS: ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('✅ Fetched file blob from IPFS:', { cid, size: blob.size, type: blob.type })

    return blob
  } catch (error) {
    console.error('❌ Error fetching file blob from IPFS:', error)
    throw error
  }
}

/**
 * Check if Pinata is properly configured
 * @returns true if configured, false otherwise
 */
export function isPinataConfigured(): boolean {
  return !!PINATA_JWT && PINATA_JWT !== 'your_pinata_jwt_token_here'
}

/**
 * Test Pinata connection
 * @returns true if connection successful, false otherwise
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    if (!PINATA_JWT) {
      console.warn('⚠️ Pinata JWT not configured')
      return false
    }

    const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
    })

    if (response.ok) {
      console.log('✅ Pinata connection successful')
      return true
    } else {
      console.error('❌ Pinata authentication failed:', response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Error testing Pinata connection:', error)
    return false
  }
}
