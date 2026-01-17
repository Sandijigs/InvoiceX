export const CREDIT_ORACLE_ABI = [
  // Submit Buyer Assessment
  {
    type: 'function',
    name: 'submitBuyerAssessment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      {
        name: 'assessment',
        type: 'tuple',
        components: [
          { name: 'buyerHash', type: 'bytes32' },
          { name: 'creditScore', type: 'uint256' },
          { name: 'creditLimit', type: 'uint256' },
          { name: 'defaultProbability', type: 'uint256' },
          { name: 'recommendedAdvanceRate', type: 'uint256' },
          { name: 'confidenceScore', type: 'uint256' },
          { name: 'assignedTier', type: 'uint8' },
          { name: 'riskFactors', type: 'string[]' },
          { name: 'assessedAt', type: 'uint256' },
          { name: 'validUntil', type: 'uint256' },
          { name: 'isValid', type: 'bool' },
        ],
      },
    ],
    outputs: [],
  },

  // Submit Invoice Assessment
  {
    type: 'function',
    name: 'submitInvoiceAssessment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      {
        name: 'assessment',
        type: 'tuple',
        components: [
          { name: 'invoiceId', type: 'uint256' },
          { name: 'sellerHash', type: 'bytes32' },
          { name: 'buyerHash', type: 'bytes32' },
          { name: 'invoiceAmount', type: 'uint256' },
          { name: 'riskScore', type: 'uint256' },
          { name: 'fraudProbability', type: 'uint256' },
          { name: 'recommendedAdvanceRate', type: 'uint256' },
          { name: 'recommendedInterestRate', type: 'uint256' },
          { name: 'assignedTier', type: 'uint8' },
          { name: 'approved', type: 'bool' },
          { name: 'rejectionReason', type: 'string' },
          { name: 'confidenceScore', type: 'uint256' },
          { name: 'assessedAt', type: 'uint256' },
        ],
      },
    ],
    outputs: [],
  },

  // Update Buyer Assessment
  {
    type: 'function',
    name: 'updateBuyerAssessment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'buyerHash', type: 'bytes32' },
      {
        name: 'assessment',
        type: 'tuple',
        components: [
          { name: 'buyerHash', type: 'bytes32' },
          { name: 'creditScore', type: 'uint256' },
          { name: 'creditLimit', type: 'uint256' },
          { name: 'defaultProbability', type: 'uint256' },
          { name: 'recommendedAdvanceRate', type: 'uint256' },
          { name: 'confidenceScore', type: 'uint256' },
          { name: 'assignedTier', type: 'uint8' },
          { name: 'riskFactors', type: 'string[]' },
          { name: 'assessedAt', type: 'uint256' },
          { name: 'validUntil', type: 'uint256' },
          { name: 'isValid', type: 'bool' },
        ],
      },
    ],
    outputs: [],
  },

  // View Functions
  {
    type: 'function',
    name: 'getBuyerAssessment',
    stateMutability: 'view',
    inputs: [{ name: 'buyerHash', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'buyerHash', type: 'bytes32' },
          { name: 'creditScore', type: 'uint256' },
          { name: 'creditLimit', type: 'uint256' },
          { name: 'defaultProbability', type: 'uint256' },
          { name: 'recommendedAdvanceRate', type: 'uint256' },
          { name: 'confidenceScore', type: 'uint256' },
          { name: 'assignedTier', type: 'uint8' },
          { name: 'riskFactors', type: 'string[]' },
          { name: 'assessedAt', type: 'uint256' },
          { name: 'validUntil', type: 'uint256' },
          { name: 'isValid', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getInvoiceAssessment',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'invoiceId', type: 'uint256' },
          { name: 'sellerHash', type: 'bytes32' },
          { name: 'buyerHash', type: 'bytes32' },
          { name: 'invoiceAmount', type: 'uint256' },
          { name: 'riskScore', type: 'uint256' },
          { name: 'fraudProbability', type: 'uint256' },
          { name: 'recommendedAdvanceRate', type: 'uint256' },
          { name: 'recommendedInterestRate', type: 'uint256' },
          { name: 'assignedTier', type: 'uint8' },
          { name: 'approved', type: 'bool' },
          { name: 'rejectionReason', type: 'string' },
          { name: 'confidenceScore', type: 'uint256' },
          { name: 'assessedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'hasBuyerAssessment',
    stateMutability: 'view',
    inputs: [{ name: 'buyerHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'hasInvoiceAssessment',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isBuyerAssessmentValid',
    stateMutability: 'view',
    inputs: [{ name: 'buyerHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isInvoiceApproved',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getBuyerRiskTier',
    stateMutability: 'view',
    inputs: [{ name: 'buyerHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
  },

  // Events
  {
    type: 'event',
    name: 'BuyerAssessmentSubmitted',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'buyerHash', type: 'bytes32', indexed: true },
      { name: 'creditScore', type: 'uint256', indexed: false },
      { name: 'assignedTier', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'InvoiceAssessmentSubmitted',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'invoiceId', type: 'uint256', indexed: true },
      { name: 'approved', type: 'bool', indexed: false },
      { name: 'assignedTier', type: 'uint8', indexed: false },
    ],
  },
] as const

// Enums
export enum RiskTier {
  TIER_A = 0,
  TIER_B = 1,
  TIER_C = 2,
  REJECTED = 3,
}

// Types
export type BuyerAssessment = {
  buyerHash: `0x${string}`
  creditScore: bigint
  creditLimit: bigint
  defaultProbability: bigint
  recommendedAdvanceRate: bigint
  confidenceScore: bigint
  assignedTier: RiskTier
  riskFactors: string[]
  assessedAt: bigint
  validUntil: bigint
  isValid: boolean
}

export type InvoiceAssessment = {
  invoiceId: bigint
  sellerHash: `0x${string}`
  buyerHash: `0x${string}`
  invoiceAmount: bigint
  riskScore: bigint
  fraudProbability: bigint
  recommendedAdvanceRate: bigint
  recommendedInterestRate: bigint
  assignedTier: RiskTier
  approved: boolean
  rejectionReason: string
  confidenceScore: bigint
  assessedAt: bigint
}
