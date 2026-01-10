/**
 * InvoiceX Protocol - React Hook for Contract Interaction
 * This hook provides all the functions needed to interact with the InvoiceX protocol
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite } from 'wagmi';
import { getContractAddresses, contractHelpers, Invoice, Business, LiquidityPosition, RiskTier } from './contracts';

// Import ABIs (these will be generated from the contracts)
import InvoiceXCoreABI from '../abis/InvoiceXCore.json';
import InvoiceTokenABI from '../abis/InvoiceToken.json';
import BusinessRegistryABI from '../abis/BusinessRegistry.json';
import LiquidityPoolABI from '../abis/LiquidityPool.json';
import YieldDistributorABI from '../abis/YieldDistributor.json';

export function useInvoiceX() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [contracts, setContracts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contracts based on network
  useEffect(() => {
    if (chain?.id) {
      try {
        const addresses = getContractAddresses(chain.id);
        setContracts(addresses);
      } catch (err) {
        setError('Unsupported network');
      }
    }
  }, [chain]);

  // ============================================
  // Business Functions
  // ============================================

  const registerBusiness = useCallback(async (
    businessName: string,
    registrationNumber: string,
    metadataURI: string
  ) => {
    if (!contracts || !address) return;

    setLoading(true);
    setError(null);

    try {
      // Prepare and execute transaction
      const tx = await writeContract({
        address: contracts.businessRegistry,
        abi: BusinessRegistryABI,
        functionName: 'registerBusiness',
        args: [
          ethers.utils.id(registrationNumber), // businessHash
          metadataURI
        ]
      });

      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to register business');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  const getBusinessInfo = useCallback(async (businessId: bigint): Promise<Business | null> => {
    if (!contracts) return null;

    const { data } = await readContract({
      address: contracts.businessRegistry,
      abi: BusinessRegistryABI,
      functionName: 'getBusinessInfo',
      args: [businessId]
    });

    return data as Business;
  }, [contracts]);

  // ============================================
  // Invoice Functions
  // ============================================

  const submitInvoice = useCallback(async (
    buyerHash: string,
    faceValue: bigint,
    dueDate: bigint,
    documentHash: string,
    invoiceNumber: string
  ) => {
    if (!contracts || !address) return;

    setLoading(true);
    setError(null);

    try {
      const tx = await writeContract({
        address: contracts.invoiceXCore,
        abi: InvoiceXCoreABI,
        functionName: 'submitInvoice',
        args: [buyerHash, faceValue, dueDate, documentHash, invoiceNumber]
      });

      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to submit invoice');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  const getInvoice = useCallback(async (invoiceId: bigint): Promise<Invoice | null> => {
    if (!contracts) return null;

    const { data } = await readContract({
      address: contracts.invoiceToken,
      abi: InvoiceTokenABI,
      functionName: 'getInvoice',
      args: [invoiceId]
    });

    return data as Invoice;
  }, [contracts]);

  const getMyInvoices = useCallback(async (): Promise<bigint[]> => {
    if (!contracts || !address) return [];

    const { data } = await readContract({
      address: contracts.invoiceXCore,
      abi: InvoiceXCoreABI,
      functionName: 'getActiveInvoices',
      args: [address]
    });

    return data as bigint[];
  }, [contracts, address]);

  // ============================================
  // Liquidity Provider Functions
  // ============================================

  const depositLiquidity = useCallback(async (
    tier: RiskTier,
    amount: bigint
  ) => {
    if (!contracts || !address) return;

    setLoading(true);
    setError(null);

    try {
      // First approve stablecoin
      const approveTx = await writeContract({
        address: contracts.stablecoin,
        abi: ['function approve(address,uint256) returns (bool)'],
        functionName: 'approve',
        args: [contracts.liquidityPool, amount]
      });

      await approveTx.wait();

      // Then deposit
      const depositTx = await writeContract({
        address: contracts.liquidityPool,
        abi: LiquidityPoolABI,
        functionName: 'deposit',
        args: [tier, amount]
      });

      await depositTx.wait();
      return depositTx.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to deposit liquidity');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  const withdrawLiquidity = useCallback(async (
    tier: RiskTier,
    shares: bigint
  ) => {
    if (!contracts || !address) return;

    setLoading(true);
    setError(null);

    try {
      const tx = await writeContract({
        address: contracts.liquidityPool,
        abi: LiquidityPoolABI,
        functionName: 'withdraw',
        args: [tier, shares]
      });

      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw liquidity');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  const getMyLiquidityPositions = useCallback(async (): Promise<LiquidityPosition[]> => {
    if (!contracts || !address) return [];

    const positions: LiquidityPosition[] = [];

    // Check all three tiers
    for (let tier = 0; tier < 3; tier++) {
      const { data } = await readContract({
        address: contracts.liquidityPool,
        abi: LiquidityPoolABI,
        functionName: 'getPosition',
        args: [address, tier]
      });

      if (data && data.shares > 0) {
        positions.push({
          tier: tier as RiskTier,
          ...data
        });
      }
    }

    return positions;
  }, [contracts, address]);

  // ============================================
  // Buyer Functions
  // ============================================

  const payInvoice = useCallback(async (invoiceId: bigint, amount: bigint) => {
    if (!contracts || !address) return;

    setLoading(true);
    setError(null);

    try {
      // First approve stablecoin
      const approveTx = await writeContract({
        address: contracts.stablecoin,
        abi: ['function approve(address,uint256) returns (bool)'],
        functionName: 'approve',
        args: [contracts.invoiceXCore, amount]
      });

      await approveTx.wait();

      // Then pay invoice
      const payTx = await writeContract({
        address: contracts.invoiceXCore,
        abi: InvoiceXCoreABI,
        functionName: 'recordBuyerPayment',
        args: [invoiceId, amount]
      });

      await payTx.wait();
      return payTx.hash;
    } catch (err: any) {
      setError(err.message || 'Failed to pay invoice');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  // ============================================
  // Stats and Info Functions
  // ============================================

  const getProtocolStats = useCallback(async () => {
    if (!contracts) return null;

    const { data } = await readContract({
      address: contracts.invoiceXCore,
      abi: InvoiceXCoreABI,
      functionName: 'getProtocolStats'
    });

    return data;
  }, [contracts]);

  const getPoolInfo = useCallback(async (tier: RiskTier) => {
    if (!contracts) return null;

    const { data } = await readContract({
      address: contracts.liquidityPool,
      abi: LiquidityPoolABI,
      functionName: 'getPoolInfo',
      args: [tier]
    });

    return data;
  }, [contracts]);

  // ============================================
  // Helper Functions
  // ============================================

  const calculateAdvanceOffer = useCallback(async (
    buyerHash: string,
    faceValue: bigint,
    dueDate: bigint
  ) => {
    if (!contracts) return null;

    const { data } = await readContract({
      address: contracts.invoiceXCore,
      abi: InvoiceXCoreABI,
      functionName: 'calculateAdvanceOffer',
      args: [buyerHash, faceValue, dueDate]
    });

    return data;
  }, [contracts]);

  const isEligibleForFactoring = useCallback(async (
    businessId: bigint,
    buyerHash: string,
    faceValue: bigint
  ) => {
    if (!contracts) return { eligible: false, reason: 'No contracts' };

    const { data } = await readContract({
      address: contracts.invoiceXCore,
      abi: InvoiceXCoreABI,
      functionName: 'isEligibleForFactoring',
      args: [businessId, buyerHash, faceValue]
    });

    return data;
  }, [contracts]);

  return {
    // Connection state
    isConnected,
    address,
    chain,
    contracts,
    loading,
    error,

    // Business functions
    registerBusiness,
    getBusinessInfo,

    // Invoice functions
    submitInvoice,
    getInvoice,
    getMyInvoices,

    // Liquidity functions
    depositLiquidity,
    withdrawLiquidity,
    getMyLiquidityPositions,

    // Buyer functions
    payInvoice,

    // Stats functions
    getProtocolStats,
    getPoolInfo,

    // Helper functions
    calculateAdvanceOffer,
    isEligibleForFactoring,

    // Utilities
    ...contractHelpers
  };
}