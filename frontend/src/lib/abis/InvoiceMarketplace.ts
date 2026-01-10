export const INVOICE_MARKETPLACE_ABI = [
  // Read Functions
  {
    type: 'function',
    name: 'getListing',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'listingId', type: 'uint256' },
          { name: 'invoiceId', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'askPrice', type: 'uint256' },
          { name: 'minPrice', type: 'uint256' },
          { name: 'listedAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getActiveListings',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getSellerListings',
    stateMutability: 'view',
    inputs: [{ name: 'seller', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAuction',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'auctionId', type: 'uint256' },
          { name: 'invoiceId', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'startPrice', type: 'uint256' },
          { name: 'reservePrice', type: 'uint256' },
          { name: 'highestBid', type: 'uint256' },
          { name: 'highestBidder', type: 'address' },
          { name: 'startedAt', type: 'uint256' },
          { name: 'endsAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getActiveAuctions',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getOffer',
    stateMutability: 'view',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'offerId', type: 'uint256' },
          { name: 'listingId', type: 'uint256' },
          { name: 'buyer', type: 'address' },
          { name: 'offerPrice', type: 'uint256' },
          { name: 'offeredAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getListingOffers',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getBuyerOffers',
    stateMutability: 'view',
    inputs: [{ name: 'buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'protocolFeeBps',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // Write Functions
  {
    type: 'function',
    name: 'createListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'invoiceId', type: 'uint256' },
      { name: 'askPrice', type: 'uint256' },
      { name: 'minPrice', type: 'uint256' },
      { name: 'durationDays', type: 'uint256' },
    ],
    outputs: [{ name: 'listingId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'updateListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'newAskPrice', type: 'uint256' },
      { name: 'newMinPrice', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelListing',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'buyNow',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'makeOffer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'offerPrice', type: 'uint256' },
      { name: 'validityDays', type: 'uint256' },
    ],
    outputs: [{ name: 'offerId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'acceptOffer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'rejectOffer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelOffer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'createAuction',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'invoiceId', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'reservePrice', type: 'uint256' },
      { name: 'durationDays', type: 'uint256' },
    ],
    outputs: [{ name: 'auctionId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'placeBid',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'bidAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'endAuction',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelAuction',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [],
  },

  // Events
  {
    type: 'event',
    name: 'ListingCreated',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'invoiceId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'askPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ListingUpdated',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'newAskPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ListingCancelled',
    inputs: [{ name: 'listingId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'OfferMade',
    inputs: [
      { name: 'offerId', type: 'uint256', indexed: true },
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'offerPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OfferAccepted',
    inputs: [{ name: 'offerId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'AuctionCreated',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'invoiceId', type: 'uint256', indexed: true },
      { name: 'startPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: false },
      { name: 'bidAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionEnded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'sold', type: 'bool', indexed: false },
      { name: 'finalPrice', type: 'uint256', indexed: false },
    ],
  },
] as const

// Enums
export enum ListingStatus {
  ACTIVE = 0,
  SOLD = 1,
  CANCELLED = 2,
  EXPIRED = 3,
}

export enum OfferStatus {
  PENDING = 0,
  ACCEPTED = 1,
  REJECTED = 2,
  CANCELLED = 3,
  EXPIRED = 4,
}

export enum AuctionStatus {
  ACTIVE = 0,
  ENDED_WITH_SALE = 1,
  ENDED_NO_SALE = 2,
  CANCELLED = 3,
}

export enum TradeType {
  DIRECT_SALE = 0,
  OFFER_ACCEPTED = 1,
  AUCTION = 2,
}

// Types
export type Listing = {
  listingId: bigint
  invoiceId: bigint
  seller: string
  askPrice: bigint
  minPrice: bigint
  listedAt: bigint
  expiresAt: bigint
  status: ListingStatus
}

export type Offer = {
  offerId: bigint
  listingId: bigint
  buyer: string
  offerPrice: bigint
  offeredAt: bigint
  expiresAt: bigint
  status: OfferStatus
}

export type Auction = {
  auctionId: bigint
  invoiceId: bigint
  seller: string
  startPrice: bigint
  reservePrice: bigint
  highestBid: bigint
  highestBidder: string
  startedAt: bigint
  endsAt: bigint
  status: AuctionStatus
}
