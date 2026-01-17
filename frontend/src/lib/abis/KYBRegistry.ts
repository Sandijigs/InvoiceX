export const KYB_REGISTRY_ABI = [
  // Submission Functions
  {
    type: 'function',
    name: 'submitKYB',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'businessHash', type: 'bytes32' },
      { name: 'zkProofHashes', type: 'bytes32[]' },
      { name: 'jurisdiction', type: 'bytes2' },
      { name: 'businessType', type: 'string' }
    ],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'addProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'proofHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancelRequest',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: []
  },

  // Admin Functions
  {
    type: 'function',
    name: 'approveKYB',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'level', type: 'uint8' },
      {
        name: 'flags',
        type: 'tuple',
        components: [
          { name: 'businessRegistration', type: 'bool' },
          { name: 'revenueThreshold', type: 'bool' },
          { name: 'operatingHistory', type: 'bool' },
          { name: 'bankAccountVerified', type: 'bool' },
          { name: 'noLiens', type: 'bool' },
          { name: 'goodStanding', type: 'bool' }
        ]
      },
      { name: 'validityDays', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'rejectKYB',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'reason', type: 'string' }
    ],
    outputs: []
  },

  // Renewal Functions
  {
    type: 'function',
    name: 'requestRenewal',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newProofHashes', type: 'bytes32[]' }],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },

  // View Functions
  {
    type: 'function',
    name: 'getKYBData',
    stateMutability: 'view',
    inputs: [{ name: 'businessWallet', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'businessWallet', type: 'address' },
          { name: 'businessHash', type: 'bytes32' },
          { name: 'zkProofHashes', type: 'bytes32[]' },
          { name: 'level', type: 'uint8' },
          { name: 'jurisdiction', type: 'bytes2' },
          { name: 'businessType', type: 'string' },
          { name: 'verifiedAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'lastReviewAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          {
            name: 'proofFlags',
            type: 'tuple',
            components: [
              { name: 'businessRegistration', type: 'bool' },
              { name: 'revenueThreshold', type: 'bool' },
              { name: 'operatingHistory', type: 'bool' },
              { name: 'bankAccountVerified', type: 'bool' },
              { name: 'noLiens', type: 'bool' },
              { name: 'goodStanding', type: 'bool' }
            ]
          }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'getVerificationRequest',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'requestId', type: 'uint256' },
          { name: 'businessWallet', type: 'address' },
          { name: 'businessHash', type: 'bytes32' },
          { name: 'submittedProofs', type: 'bytes32[]' },
          { name: 'requestedAt', type: 'uint256' },
          { name: 'requestStatus', type: 'uint8' },
          { name: 'rejectionReason', type: 'string' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'isKYBValid',
    stateMutability: 'view',
    inputs: [{ name: 'businessWallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getVerificationLevel',
    stateMutability: 'view',
    inputs: [{ name: 'businessWallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'getKYBExpiry',
    stateMutability: 'view',
    inputs: [{ name: 'businessWallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'getDaysUntilExpiry',
    stateMutability: 'view',
    inputs: [{ name: 'businessWallet', type: 'address' }],
    outputs: [{ name: '', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'isJurisdictionSupported',
    stateMutability: 'view',
    inputs: [{ name: 'jurisdiction', type: 'bytes2' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getPendingRequests',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }]
  },

  // Events
  {
    type: 'event',
    name: 'KYBSubmitted',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'businessWallet', type: 'address', indexed: true },
      { name: 'businessHash', type: 'bytes32', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'ProofAdded',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'proofHash', type: 'bytes32', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'RequestCancelled',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true }
    ]
  },

  // Errors
  {
    type: 'error',
    name: 'KYBNotFound',
    inputs: []
  },
  {
    type: 'error',
    name: 'KYBAlreadyExists',
    inputs: []
  },
  {
    type: 'error',
    name: 'UnsupportedJurisdiction',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidJurisdiction',
    inputs: []
  },
  {
    type: 'error',
    name: 'RequestNotFound',
    inputs: []
  },
  {
    type: 'error',
    name: 'NotRequestOwner',
    inputs: []
  },
  {
    type: 'error',
    name: 'RequestNotPending',
    inputs: []
  }
] as const

// Enums
export enum VerificationLevel {
  NONE = 0,
  BASIC = 1,
  STANDARD = 2,
  ENHANCED = 3,
  PREMIUM = 4
}

export enum KYBStatus {
  NONE = 0,
  PENDING = 1,
  VERIFIED = 2,
  EXPIRED = 3,
  SUSPENDED = 4,
  REVOKED = 5
}

export enum RequestStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  CANCELLED = 3
}

// Types
export type ProofFlags = {
  businessRegistration: boolean
  revenueThreshold: boolean
  operatingHistory: boolean
  bankAccountVerified: boolean
  noLiens: boolean
  goodStanding: boolean
}

export type KYBData = {
  businessWallet: `0x${string}`
  businessHash: `0x${string}`
  zkProofHashes: `0x${string}`[]
  level: VerificationLevel
  jurisdiction: string // bytes2
  businessType: string
  verifiedAt: bigint
  expiresAt: bigint
  lastReviewAt: bigint
  status: KYBStatus
  proofFlags: ProofFlags
}

export type VerificationRequest = {
  requestId: bigint
  businessWallet: `0x${string}`
  businessHash: `0x${string}`
  submittedProofs: `0x${string}`[]
  requestedAt: bigint
  requestStatus: RequestStatus
  rejectionReason: string
}
