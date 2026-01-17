export const INSURANCE_POOL_ABI = [
  // Read functions
  {
    type: 'function',
    name: 'getPoolMetrics',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalStaked', type: 'uint256' },
          { name: 'totalShares', type: 'uint256' },
          { name: 'totalPremiumsCollected', type: 'uint256' },
          { name: 'totalClaimsPaid', type: 'uint256' },
          { name: 'activeCoverageCount', type: 'uint256' },
          { name: 'activeCoverageAmount', type: 'uint256' },
          { name: 'availableCapital', type: 'uint256' },
          { name: 'reserveRatio', type: 'uint256' },
          { name: 'currentAPY', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakerPosition',
    inputs: [{ name: 'staker', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'shares', type: 'uint256' },
          { name: 'stakedAt', type: 'uint256' },
          { name: 'lockEndTime', type: 'uint256' },
          { name: 'pendingYield', type: 'uint256' },
          { name: 'totalYieldClaimed', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCoverage',
    inputs: [{ name: 'coverageId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'coverageId', type: 'uint256' },
          { name: 'invoiceId', type: 'uint256' },
          { name: 'tier', type: 'uint8' },
          { name: 'coverageAmount', type: 'uint256' },
          { name: 'premiumPaid', type: 'uint256' },
          { name: 'startDate', type: 'uint256' },
          { name: 'endDate', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'claimAmount', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculatePremium',
    inputs: [
      { name: 'invoiceAmount', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'stake',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockDays', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unstake',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimStakingYield',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'purchaseCoverage',
    inputs: [
      { name: 'invoiceId', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'Staked',
    inputs: [
      { name: 'staker', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
      { name: 'lockEndTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CoveragePurchased',
    inputs: [
      { name: 'coverageId', type: 'uint256', indexed: true },
      { name: 'invoiceId', type: 'uint256', indexed: true },
      { name: 'tier', type: 'uint8', indexed: false },
      { name: 'premium', type: 'uint256', indexed: false },
    ],
  },
] as const

// Enums
export enum CoverageTier {
  BASIC = 0,
  STANDARD = 1,
  PREMIUM = 2,
}

export enum CoverageStatus {
  ACTIVE = 0,
  EXPIRED = 1,
  CLAIMED = 2,
  CANCELLED = 3,
}

export enum ClaimStatus {
  PENDING = 0,
  APPROVED = 1,
  PAID = 2,
  REJECTED = 3,
  PARTIALLY_PAID = 4,
}

// Types
export type PoolMetrics = {
  totalStaked: bigint
  totalShares: bigint
  totalPremiumsCollected: bigint
  totalClaimsPaid: bigint
  activeCoverageCount: bigint
  activeCoverageAmount: bigint
  availableCapital: bigint
  reserveRatio: bigint
  currentAPY: bigint
}

export type StakerPosition = {
  stakedAmount: bigint
  shares: bigint
  stakedAt: bigint
  lockEndTime: bigint
  pendingYield: bigint
  totalYieldClaimed: bigint
}

export type Coverage = {
  coverageId: bigint
  invoiceId: bigint
  tier: CoverageTier
  coverageAmount: bigint
  premiumPaid: bigint
  startDate: bigint
  endDate: bigint
  status: CoverageStatus
  claimAmount: bigint
  claimedAt: bigint
}
