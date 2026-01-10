/**
 * InvoiceX Protocol - Contract Configuration
 * This file contains all contract addresses and ABIs for frontend integration
 */

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Local development (Anvil)
  localhost: {
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    contracts: {
      invoiceToken: '0xCB71bBc104Bd23859abb3cb6B7347F7FFc674984',
      invoiceXCore: '',
      businessRegistry: '0x2E92C12c2724672B4E49E229062b50D4422454Ab',
      buyerRegistry: '0xe81e6985571e46Cb52017F4c14c3637A398761cC',
      kybRegistry: '0x4da606C64b349E7c589fe9fD3AA8e8F88794D7DE',
      creditOracle: '',
      liquidityPool: '',
      yieldDistributor: '',
      insurancePool: '',
      invoiceMarketplace: '',
      stablecoin: '0xF24Fc80BeD2620b58f4D78223a94444c7d470289'
    }
  },

  // Mantle Sepolia Testnet
  mantleTestnet: {
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://explorer.sepolia.mantle.xyz',
    contracts: {
      // Will be filled after testnet deployment
      invoiceToken: '',
      invoiceXCore: '',
      businessRegistry: '',
      buyerRegistry: '',
      kybRegistry: '',
      creditOracle: '',
      liquidityPool: '',
      yieldDistributor: '',
      insurancePool: '',
      invoiceMarketplace: '',
      stablecoin: ''
    }
  },

  // Mantle Mainnet
  mantle: {
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    explorer: 'https://explorer.mantle.xyz',
    contracts: {
      // Will be filled after mainnet deployment
      invoiceToken: '',
      invoiceXCore: '',
      businessRegistry: '',
      buyerRegistry: '',
      kybRegistry: '',
      creditOracle: '',
      liquidityPool: '',
      yieldDistributor: '',
      insurancePool: '',
      invoiceMarketplace: '',
      stablecoin: ''
    }
  }
};

// Get contract addresses for current network
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 31337:
      return CONTRACT_ADDRESSES.localhost.contracts;
    case 5003:
      return CONTRACT_ADDRESSES.mantleTestnet.contracts;
    case 5000:
      return CONTRACT_ADDRESSES.mantle.contracts;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// Contract configuration
export const CONTRACT_CONFIG = {
  // Protocol fees (in basis points)
  PROTOCOL_FEE_BPS: 150, // 1.5%

  // Invoice limits
  MIN_INVOICE_AMOUNT: 5000 * 1e6, // $5,000 USDT
  MAX_INVOICE_AMOUNT: 1000000 * 1e6, // $1M USDT

  // Payment terms (in days)
  MIN_PAYMENT_TERM_DAYS: 15,
  MAX_PAYMENT_TERM_DAYS: 120,

  // Liquidity pool tiers
  RISK_TIERS: {
    TIER_A: {
      name: 'Conservative',
      targetAPY: 10,
      minDeposit: 1000 * 1e6, // $1,000
      color: '#10B981' // Green
    },
    TIER_B: {
      name: 'Balanced',
      targetAPY: 17.5,
      minDeposit: 5000 * 1e6, // $5,000
      color: '#3B82F6' // Blue
    },
    TIER_C: {
      name: 'Growth',
      targetAPY: 26,
      minDeposit: 10000 * 1e6, // $10,000
      color: '#F59E0B' // Orange
    }
  },

  // Insurance coverage tiers
  INSURANCE_TIERS: {
    BASIC: {
      coverage: 50, // 50% coverage
      premium: 0.5 // 0.5% premium
    },
    STANDARD: {
      coverage: 75, // 75% coverage
      premium: 1.0 // 1.0% premium
    },
    PREMIUM: {
      coverage: 100, // 100% coverage
      premium: 1.5 // 1.5% premium
    }
  }
};

// Helper functions for contract interaction
export const contractHelpers = {
  // Format USDT amount (6 decimals)
  formatUSDT: (amount: bigint): string => {
    return (Number(amount) / 1e6).toFixed(2);
  },

  // Parse USDT amount to contract format
  parseUSDT: (amount: string): bigint => {
    return BigInt(Math.floor(parseFloat(amount) * 1e6));
  },

  // Calculate advance amount
  calculateAdvance: (faceValue: bigint, advanceRate: number): bigint => {
    return (faceValue * BigInt(advanceRate)) / BigInt(10000);
  },

  // Calculate protocol fee
  calculateProtocolFee: (amount: bigint): bigint => {
    return (amount * BigInt(CONTRACT_CONFIG.PROTOCOL_FEE_BPS)) / BigInt(10000);
  },

  // Format date for display
  formatDate: (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  },

  // Calculate days until due
  daysUntilDue: (dueDate: bigint): number => {
    const now = Math.floor(Date.now() / 1000);
    const due = Number(dueDate);
    return Math.floor((due - now) / 86400);
  }
};

// Export type definitions
export interface Invoice {
  id: bigint;
  seller: string;
  buyerHash: string;
  faceValue: bigint;
  advanceAmount: bigint;
  dueDate: bigint;
  status: InvoiceStatus;
  fundedAt: bigint;
  paidAt: bigint;
}

export enum InvoiceStatus {
  PENDING = 0,
  FUNDED = 1,
  PAID = 2,
  DEFAULTED = 3,
  CANCELLED = 4
}

export enum RiskTier {
  TIER_A = 0,
  TIER_B = 1,
  TIER_C = 2
}

export interface Business {
  id: bigint;
  name: string;
  registrationNumber: string;
  address: string;
  verified: boolean;
  kybStatus: boolean;
  totalFactored: bigint;
  totalRepaid: bigint;
  defaultCount: number;
}

export interface LiquidityPosition {
  tier: RiskTier;
  amount: bigint;
  shares: bigint;
  depositedAt: bigint;
  currentValue: bigint;
  pendingYield: bigint;
}