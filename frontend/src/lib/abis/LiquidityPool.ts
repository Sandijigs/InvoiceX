export const LIQUIDITY_POOL_ABI = [
  // Read Functions
  {
    type: 'function',
    name: 'getPool',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'tier', type: 'uint8' },
          { name: 'totalDeposits', type: 'uint256' },
          { name: 'totalShares', type: 'uint256' },
          { name: 'availableLiquidity', type: 'uint256' },
          { name: 'deployedLiquidity', type: 'uint256' },
          { name: 'pendingReturns', type: 'uint256' },
          { name: 'totalYieldEarned', type: 'uint256' },
          { name: 'totalLosses', type: 'uint256' },
          { name: 'targetAPY', type: 'uint256' },
          { name: 'minDeposit', type: 'uint256' },
          { name: 'maxDeposit', type: 'uint256' },
          { name: 'maxPoolSize', type: 'uint256' },
          { name: 'acceptingDeposits', type: 'bool' },
          { name: 'lastYieldDistribution', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getUserPosition',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'tier', type: 'uint8' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'shares', type: 'uint256' },
          { name: 'depositedValue', type: 'uint256' },
          { name: 'lastDepositAt', type: 'uint256' },
          { name: 'pendingYield', type: 'uint256' },
          { name: 'totalYieldClaimed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'calculateShareValue',
    stateMutability: 'view',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'shares', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'stablecoin',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },

  // Write Functions
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'shares', type: 'uint256' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimYield',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'compoundYield',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: 'newShares', type: 'uint256' }],
  },

  // Events
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'tier', type: 'uint8', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'tier', type: 'uint8', indexed: true },
      { name: 'shares', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'YieldClaimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'tier', type: 'uint8', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  // Errors
  {
    type: 'error',
    name: 'PoolNotInitialized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PoolNotAcceptingDeposits',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientDeposit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExceedsMaxDeposit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientShares',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientLiquidity',
    inputs: [],
  },
] as const

// Enums
export enum RiskTier {
  TIER_A = 0,
  TIER_B = 1,
  TIER_C = 2,
}

export enum DeploymentStatus {
  ACTIVE = 0,
  RETURNED_FULL = 1,
  RETURNED_PARTIAL = 2,
  DEFAULTED = 3,
}

// Types
export type Pool = {
  tier: RiskTier
  totalDeposits: bigint
  totalShares: bigint
  availableLiquidity: bigint
  deployedLiquidity: bigint
  pendingReturns: bigint
  totalYieldEarned: bigint
  totalLosses: bigint
  targetAPY: bigint
  minDeposit: bigint
  maxDeposit: bigint
  maxPoolSize: bigint
  acceptingDeposits: boolean
  lastYieldDistribution: bigint
}

export type UserPosition = {
  shares: bigint
  depositedValue: bigint
  lastDepositAt: bigint
  pendingYield: bigint
  totalYieldClaimed: bigint
}

export type Deployment = {
  deploymentId: bigint
  invoiceId: bigint
  tier: RiskTier
  principalAmount: bigint
  expectedReturn: bigint
  actualReturn: bigint
  deployedAt: bigint
  expectedReturnDate: bigint
  returnedAt: bigint
  status: DeploymentStatus
}
