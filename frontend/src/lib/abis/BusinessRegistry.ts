export const BUSINESS_REGISTRY_ABI = [
  // Registration Functions
  {
    type: 'function',
    name: 'registerBusiness',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'businessHash', type: 'bytes32' },
      { name: 'businessURI', type: 'string' }
    ],
    outputs: [{ name: 'businessId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'addAuthorizedSigner',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'businessId', type: 'uint256' },
      { name: 'signer', type: 'address' }
    ],
    outputs: []
  },

  // Verification Functions (Admin only)
  {
    type: 'function',
    name: 'verifyBusiness',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'businessId', type: 'uint256' },
      { name: 'zkProofHash', type: 'bytes32' },
      { name: 'initialCreditScore', type: 'uint256' }
    ],
    outputs: []
  },

  // View Functions
  {
    type: 'function',
    name: 'getBusiness',
    stateMutability: 'view',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'businessId', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'authorizedSigners', type: 'address[]' },
          { name: 'businessHash', type: 'bytes32' },
          { name: 'zkProofHash', type: 'bytes32' },
          { name: 'businessURI', type: 'string' },
          { name: 'creditScore', type: 'uint256' },
          {
            name: 'stats',
            type: 'tuple',
            components: [
              { name: 'totalInvoicesSubmitted', type: 'uint256' },
              { name: 'totalInvoicesFunded', type: 'uint256' },
              { name: 'totalValueFunded', type: 'uint256' },
              { name: 'totalValueRepaid', type: 'uint256' },
              { name: 'successfulRepayments', type: 'uint256' },
              { name: 'lateRepayments', type: 'uint256' },
              { name: 'defaults', type: 'uint256' },
              { name: 'averageDaysToCollection', type: 'uint256' }
            ]
          },
          { name: 'status', type: 'uint8' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'verifiedAt', type: 'uint256' },
          { name: 'lastActivityAt', type: 'uint256' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'getBusinessByOwner',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'businessId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'isBusinessVerified',
    stateMutability: 'view',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'canSubmitInvoices',
    stateMutability: 'view',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },

  // Role Management
  {
    type: 'function',
    name: 'VERIFIER_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },

  // Events
  {
    type: 'event',
    name: 'BusinessRegistered',
    inputs: [
      { name: 'businessId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'BusinessVerified',
    inputs: [
      { name: 'businessId', type: 'uint256', indexed: true },
      { name: 'creditScore', type: 'uint256', indexed: false }
    ]
  },

  // Errors
  {
    type: 'error',
    name: 'BusinessNotFound',
    inputs: []
  },
  {
    type: 'error',
    name: 'BusinessAlreadyExists',
    inputs: []
  },
  {
    type: 'error',
    name: 'NotBusinessOwner',
    inputs: []
  }
] as const

// Type for Business Status enum
export enum BusinessStatus {
  PENDING = 0,
  VERIFIED = 1,
  ACTIVE = 2,
  SUSPENDED = 3,
  BLACKLISTED = 4
}

// Type for Business struct
export type Business = {
  businessId: bigint
  owner: `0x${string}`
  authorizedSigners: `0x${string}`[]
  businessHash: `0x${string}`
  zkProofHash: `0x${string}`
  businessURI: string
  creditScore: bigint
  stats: BusinessStats
  status: BusinessStatus
  registeredAt: bigint
  verifiedAt: bigint
  lastActivityAt: bigint
}

// Type for BusinessStats struct
export type BusinessStats = {
  totalInvoicesSubmitted: bigint
  totalInvoicesFunded: bigint
  totalValueFunded: bigint
  totalValueRepaid: bigint
  successfulRepayments: bigint
  lateRepayments: bigint
  defaults: bigint
  averageDaysToCollection: bigint
}
