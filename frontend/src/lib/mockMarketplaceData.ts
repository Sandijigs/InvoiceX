import { type Listing, ListingStatus } from '@/lib/abis/InvoiceMarketplace'
import { parseUnits } from 'viem'

/**
 * Mock marketplace listings for demo purposes
 * These should correlate with the design and show realistic invoice factoring scenarios
 */

const now = Math.floor(Date.now() / 1000)
const oneDay = 24 * 60 * 60
const oneWeek = 7 * oneDay

export const MOCK_LISTINGS: Listing[] = [
  // Listing 1: Premium enterprise invoice - Low discount
  {
    listingId: BigInt(1),
    invoiceId: BigInt(1001),
    seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    askPrice: parseUnits('47500', 6), // $47,500 USDT
    minPrice: parseUnits('46000', 6), // $46,000 USDT minimum
    listedAt: BigInt(now - 2 * oneDay),
    expiresAt: BigInt(now + 5 * oneDay), // Expires in 5 days
    status: ListingStatus.ACTIVE,
  },
  // Listing 2: Mid-tier construction invoice - Medium discount
  {
    listingId: BigInt(2),
    invoiceId: BigInt(1002),
    seller: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    askPrice: parseUnits('28500', 6), // $28,500 USDT (5% discount from $30k)
    minPrice: parseUnits('27000', 6), // $27,000 USDT minimum
    listedAt: BigInt(now - 1 * oneDay),
    expiresAt: BigInt(now + 6 * oneDay), // Expires in 6 days
    status: ListingStatus.ACTIVE,
  },
  // Listing 3: Small business invoice - Higher discount for quick sale
  {
    listingId: BigInt(3),
    invoiceId: BigInt(1003),
    seller: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    askPrice: parseUnits('14250', 6), // $14,250 USDT (5% discount from $15k)
    minPrice: parseUnits('13500', 6), // $13,500 USDT minimum
    listedAt: BigInt(now - 3 * oneDay),
    expiresAt: BigInt(now + 4 * oneDay), // Expires in 4 days
    status: ListingStatus.ACTIVE,
  },
  // Listing 4: Tech startup invoice - Attractive discount
  {
    listingId: BigInt(4),
    invoiceId: BigInt(1004),
    seller: '0x5aAdFB43eF8dAF45DD80F4676345b7676f1D70e3',
    askPrice: parseUnits('56500', 6), // $56,500 USDT
    minPrice: parseUnits('54000', 6), // $54,000 USDT minimum
    listedAt: BigInt(now - oneDay),
    expiresAt: BigInt(now + oneWeek), // Expires in 7 days
    status: ListingStatus.ACTIVE,
  },
  // Listing 5: Retail invoice - Good discount
  {
    listingId: BigInt(5),
    invoiceId: BigInt(1005),
    seller: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    askPrice: parseUnits('18800', 6), // $18,800 USDT
    minPrice: parseUnits('17500', 6), // $17,500 USDT minimum
    listedAt: BigInt(now - 4 * oneDay),
    expiresAt: BigInt(now + 3 * oneDay), // Expires in 3 days
    status: ListingStatus.ACTIVE,
  },
  // Listing 6: Manufacturing invoice - Solid opportunity
  {
    listingId: BigInt(6),
    invoiceId: BigInt(1006),
    seller: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    askPrice: parseUnits('37600', 6), // $37,600 USDT
    minPrice: parseUnits('36000', 6), // $36,000 USDT minimum
    listedAt: BigInt(now - 2 * oneDay),
    expiresAt: BigInt(now + 5 * oneDay), // Expires in 5 days
    status: ListingStatus.ACTIVE,
  },
]

/**
 * Mock invoice data corresponding to the listings
 * This is used when the real contract data isn't available
 */
export const MOCK_INVOICE_DATA: Record<string, any> = {
  '1001': {
    invoiceNumber: 'INV-2025-001',
    businessName: 'Enterprise Tech Solutions',
    amount: 50000, // $50,000 face value
    dueDate: BigInt(now + 45 * oneDay), // Due in 45 days
    status: 1, // APPROVED
  },
  '1002': {
    invoiceNumber: 'INV-2025-002',
    businessName: 'BuildRight Construction',
    amount: 30000, // $30,000 face value
    dueDate: BigInt(now + 60 * oneDay), // Due in 60 days
    status: 1, // APPROVED
  },
  '1003': {
    invoiceNumber: 'INV-2025-003',
    businessName: 'Metro Supplies Co',
    amount: 15000, // $15,000 face value
    dueDate: BigInt(now + 30 * oneDay), // Due in 30 days
    status: 1, // APPROVED
  },
  '1004': {
    invoiceNumber: 'INV-2025-004',
    businessName: 'InnovateTech Labs',
    amount: 60000, // $60,000 face value
    dueDate: BigInt(now + 90 * oneDay), // Due in 90 days
    status: 1, // APPROVED
  },
  '1005': {
    invoiceNumber: 'INV-2025-005',
    businessName: 'Retail Connect LLC',
    amount: 20000, // $20,000 face value
    dueDate: BigInt(now + 45 * oneDay), // Due in 45 days
    status: 1, // APPROVED
  },
  '1006': {
    invoiceNumber: 'INV-2025-006',
    businessName: 'Precision Manufacturing',
    amount: 40000, // $40,000 face value
    dueDate: BigInt(now + 75 * oneDay), // Due in 75 days
    status: 1, // APPROVED
  },
}

/**
 * Check if we should use mock data for demo purposes
 *
 * To control this behavior:
 * 1. Set NEXT_PUBLIC_USE_MOCK_MARKETPLACE=true in your .env.local file, OR
 * 2. Change the default value below from `true` to `false` to disable mock data
 *
 * Mock data will be shown when:
 * - Environment variable is set to 'true', OR
 * - Default is true AND there are no real listings from the blockchain
 */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_MARKETPLACE === 'true' || true
