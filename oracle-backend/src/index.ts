/**
 * InvoiceX Oracle Backend Service
 * This service provides AI-powered credit risk assessment for invoice factoring
 */

import express from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Import contract ABIs
import CreditOracleABI from '../abis/CreditOracle.json';

// Configuration
const app = express();
const PORT = process.env.ORACLE_PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
const CREDIT_ORACLE_ADDRESS = process.env.CREDIT_ORACLE_ADDRESS || '';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
const creditOracle = new ethers.Contract(CREDIT_ORACLE_ADDRESS, CreditOracleABI, wallet);

// Risk assessment thresholds
const RISK_THRESHOLDS = {
  TIER_A: {
    minCreditScore: 850,
    maxDefaultRate: 0.01, // 1%
    minPaymentHistory: 24, // months
    maxDaysLate: 5,
    advanceRateMin: 85, // 85%
    advanceRateMax: 90  // 90%
  },
  TIER_B: {
    minCreditScore: 700,
    maxDefaultRate: 0.03, // 3%
    minPaymentHistory: 12, // months
    maxDaysLate: 15,
    advanceRateMin: 75, // 75%
    advanceRateMax: 85  // 85%
  },
  TIER_C: {
    minCreditScore: 600,
    maxDefaultRate: 0.05, // 5%
    minPaymentHistory: 6, // months
    maxDaysLate: 30,
    advanceRateMin: 65, // 65%
    advanceRateMax: 75  // 75%
  }
};

// ============================================
// Credit Assessment Engine
// ============================================

interface CreditData {
  creditScore: number;
  paymentHistory: number[];
  defaultCount: number;
  totalTransactions: number;
  averageDaysLate: number;
  industryRisk: number;
  businessAge: number;
}

interface AssessmentResult {
  approved: boolean;
  riskTier: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'REJECTED';
  advanceRate: number;
  riskScore: number;
  reasons: string[];
}

async function assessCreditRisk(
  buyerHash: string,
  sellerHash: string,
  faceValue: bigint,
  paymentTermDays: number
): Promise<AssessmentResult> {
  console.log('Assessing credit risk for:', {
    buyer: buyerHash,
    seller: sellerHash,
    amount: ethers.formatUnits(faceValue, 6),
    terms: paymentTermDays
  });

  // Fetch credit data (in production, this would query real credit bureaus)
  const buyerCredit = await fetchCreditData(buyerHash);
  const sellerCredit = await fetchCreditData(sellerHash);

  // Calculate risk scores
  const buyerScore = calculateRiskScore(buyerCredit);
  const sellerScore = calculateRiskScore(sellerCredit);
  const combinedScore = (buyerScore * 0.7) + (sellerScore * 0.3); // Buyer weighs more

  // Determine risk tier and advance rate
  let riskTier: AssessmentResult['riskTier'] = 'REJECTED';
  let advanceRate = 0;
  const reasons: string[] = [];

  if (combinedScore >= 85 && buyerCredit.creditScore >= RISK_THRESHOLDS.TIER_A.minCreditScore) {
    riskTier = 'TIER_A';
    advanceRate = RISK_THRESHOLDS.TIER_A.advanceRateMin +
      Math.floor(Math.random() * (RISK_THRESHOLDS.TIER_A.advanceRateMax - RISK_THRESHOLDS.TIER_A.advanceRateMin));
    reasons.push('Excellent credit profile');
  } else if (combinedScore >= 70 && buyerCredit.creditScore >= RISK_THRESHOLDS.TIER_B.minCreditScore) {
    riskTier = 'TIER_B';
    advanceRate = RISK_THRESHOLDS.TIER_B.advanceRateMin +
      Math.floor(Math.random() * (RISK_THRESHOLDS.TIER_B.advanceRateMax - RISK_THRESHOLDS.TIER_B.advanceRateMin));
    reasons.push('Good credit profile');
  } else if (combinedScore >= 60 && buyerCredit.creditScore >= RISK_THRESHOLDS.TIER_C.minCreditScore) {
    riskTier = 'TIER_C';
    advanceRate = RISK_THRESHOLDS.TIER_C.advanceRateMin +
      Math.floor(Math.random() * (RISK_THRESHOLDS.TIER_C.advanceRateMax - RISK_THRESHOLDS.TIER_C.advanceRateMin));
    reasons.push('Acceptable credit profile');
  } else {
    reasons.push('Credit score below minimum threshold');
    reasons.push('High default risk detected');
  }

  // Additional risk factors
  if (paymentTermDays > 60) {
    advanceRate -= 5; // Reduce advance rate for longer payment terms
    reasons.push('Extended payment terms');
  }

  const approved = riskTier !== 'REJECTED';

  return {
    approved,
    riskTier,
    advanceRate: advanceRate * 100, // Convert to basis points
    riskScore: combinedScore,
    reasons
  };
}

async function fetchCreditData(entityHash: string): Promise<CreditData> {
  // In production, this would query real credit bureaus
  // For now, generate mock data based on the hash
  const hashNum = parseInt(entityHash.slice(2, 10), 16);
  const seed = hashNum % 1000;

  return {
    creditScore: 600 + (seed % 250), // 600-850 range
    paymentHistory: Array(24).fill(0).map(() => Math.floor(Math.random() * 30)), // Days late per month
    defaultCount: seed % 3,
    totalTransactions: 50 + (seed % 200),
    averageDaysLate: seed % 15,
    industryRisk: (seed % 5) + 1, // 1-5 scale
    businessAge: (seed % 10) + 1 // Years
  };
}

function calculateRiskScore(creditData: CreditData): number {
  let score = 100;

  // Credit score impact (40%)
  const creditScoreRatio = (creditData.creditScore - 300) / 550; // Normalize 300-850 to 0-1
  score *= (0.6 + creditScoreRatio * 0.4);

  // Payment history impact (30%)
  const avgDaysLate = creditData.paymentHistory.reduce((a, b) => a + b, 0) / creditData.paymentHistory.length;
  const paymentScore = Math.max(0, 1 - (avgDaysLate / 30));
  score *= (0.7 + paymentScore * 0.3);

  // Default rate impact (20%)
  const defaultRate = creditData.defaultCount / Math.max(1, creditData.totalTransactions);
  score *= (1 - defaultRate * 2); // Heavy penalty for defaults

  // Industry risk impact (10%)
  score *= (1.1 - creditData.industryRisk * 0.02);

  return Math.max(0, Math.min(100, score));
}

// ============================================
// API Endpoints
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    oracle: CREDIT_ORACLE_ADDRESS,
    network: RPC_URL
  });
});

// Process assessment request from blockchain event
app.post('/assess', async (req, res) => {
  try {
    const {
      assessmentId,
      requestId,
      buyerHash,
      sellerHash,
      faceValue,
      paymentTermDays
    } = req.body;

    console.log(`Processing assessment ${assessmentId} for request ${requestId}`);

    // Perform credit assessment
    const assessment = await assessCreditRisk(
      buyerHash,
      sellerHash,
      BigInt(faceValue),
      paymentTermDays
    );

    // Map tier to contract enum
    const tierMap = {
      'TIER_A': 0,
      'TIER_B': 1,
      'TIER_C': 2,
      'REJECTED': 0
    };

    // Submit assessment back to blockchain
    const tx = await creditOracle.completeAssessment(
      assessmentId,
      assessment.approved,
      tierMap[assessment.riskTier],
      assessment.advanceRate
    );

    await tx.wait();

    res.json({
      success: true,
      assessmentId,
      result: assessment,
      txHash: tx.hash
    });

  } catch (error: any) {
    console.error('Assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get credit score (for UI)
app.get('/credit-score/:entityHash', async (req, res) => {
  try {
    const creditData = await fetchCreditData(req.params.entityHash);
    const riskScore = calculateRiskScore(creditData);

    res.json({
      entityHash: req.params.entityHash,
      creditScore: creditData.creditScore,
      riskScore,
      creditData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual assessment trigger (for testing)
app.post('/manual-assess', async (req, res) => {
  try {
    const { assessmentId } = req.body;

    // Fetch assessment details from contract
    const assessment = await creditOracle.getAssessment(assessmentId);

    // Perform assessment
    const result = await assessCreditRisk(
      assessment.buyerHash,
      assessment.sellerHash,
      assessment.amount,
      assessment.paymentTermDays
    );

    res.json({
      assessmentId,
      result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Event Listeners
// ============================================

// Listen for assessment requests from blockchain
async function startEventListeners() {
  console.log('Starting blockchain event listeners...');

  creditOracle.on('AssessmentRequested', async (
    assessmentId: bigint,
    requestId: bigint,
    buyerHash: string,
    sellerHash: string,
    amount: bigint,
    paymentTermDays: bigint
  ) => {
    console.log(`New assessment requested: ${assessmentId}`);

    try {
      const assessment = await assessCreditRisk(
        buyerHash,
        sellerHash,
        amount,
        Number(paymentTermDays)
      );

      // Map tier to contract enum
      const tierMap = {
        'TIER_A': 0,
        'TIER_B': 1,
        'TIER_C': 2,
        'REJECTED': 0
      };

      // Submit assessment
      const tx = await creditOracle.completeAssessment(
        assessmentId,
        assessment.approved,
        tierMap[assessment.riskTier],
        assessment.advanceRate
      );

      console.log(`Assessment ${assessmentId} completed: ${tx.hash}`);
    } catch (error) {
      console.error(`Failed to process assessment ${assessmentId}:`, error);
    }
  });
}

// ============================================
// Server Initialization
// ============================================

async function startServer() {
  try {
    // Verify connection to blockchain
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.chainId}`);

    // Verify oracle contract
    const code = await provider.getCode(CREDIT_ORACLE_ADDRESS);
    if (code === '0x') {
      throw new Error('CreditOracle contract not deployed at specified address');
    }

    // Start event listeners
    await startEventListeners();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Oracle backend running on port ${PORT}`);
      console.log(`Network: ${RPC_URL}`);
      console.log(`Oracle address: ${CREDIT_ORACLE_ADDRESS}`);
    });

  } catch (error) {
    console.error('Failed to start oracle backend:', error);
    process.exit(1);
  }
}

// Start the server
startServer();