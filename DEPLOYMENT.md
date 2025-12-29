# InvoiceX Protocol - Deployment Guide

Complete deployment guide for the InvoiceX decentralized invoice factoring protocol.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Steps](#deployment-steps)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Foundry** (latest version)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

- **Node.js** v18+ (for frontend integration)
- **Git**

### Required Information

- **Private Key** for deployment wallet
- **RPC URL** for target network
- **Stablecoin Address** (USDT/USDC) on target network
- **Block Explorer API Key** (for contract verification)

### Supported Networks

- **Mantle Mainnet**
  - Chain ID: 5000
  - RPC: https://rpc.mantle.xyz
  - Explorer: https://explorer.mantle.xyz

- **Mantle Sepolia (Testnet)**
  - Chain ID: 5003
  - RPC: https://rpc.sepolia.mantle.xyz
  - Explorer: https://explorer.sepolia.mantle.xyz
  - Faucet: https://faucet.sepolia.mantle.xyz

- **Local Development**
  - Chain ID: 31337
  - RPC: http://localhost:8545

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/invoicex.git
cd invoicex
```

### 2. Install Dependencies

```bash
forge install
```

### 3. Create Environment File

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Deployment Configuration
PRIVATE_KEY=your_private_key_here
ADMIN_ADDRESS=0x...  # Optional, defaults to deployer
ORACLE_OPERATOR=0x...  # Optional, defaults to deployer

# Network Configuration
RPC_URL=https://rpc.sepolia.mantle.xyz
CHAIN_NAME=mantle-sepolia

# Contract Addresses
STABLECOIN_ADDRESS=0x...  # USDT/USDC address on target network

# Block Explorer
ETHERSCAN_API_KEY=your_api_key_here

# Post-Deployment (filled after deployment)
INVOICE_TOKEN_ADDRESS=
KYB_REGISTRY_ADDRESS=
BUYER_REGISTRY_ADDRESS=
BUSINESS_REGISTRY_ADDRESS=
CREDIT_ORACLE_ADDRESS=
LIQUIDITY_POOL_ADDRESS=
YIELD_DISTRIBUTOR_ADDRESS=
INSURANCE_POOL_ADDRESS=
INVOICE_MARKETPLACE_ADDRESS=
INVOICEX_CORE_ADDRESS=
```

### 4. Fund Deployment Wallet

Ensure your deployment wallet has sufficient native tokens for gas:

- **Mantle Mainnet**: ~5 MNT
- **Mantle Sepolia**: Get test MNT from [faucet](https://faucet.sepolia.mantle.xyz)

---

## Deployment Steps

### Step 1: Deploy All Contracts

Run the main deployment script:

```bash
forge script script/DeployInvoiceX.s.sol:DeployInvoiceX \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

**What this does:**
1. Deploys all 10 protocol contracts in correct dependency order
2. Configures all roles and permissions
3. Links contracts together
4. Initializes liquidity pools with default parameters
5. Exports all contract addresses

**Expected Output:**
```
=== InvoiceX Protocol Deployment ===
Chain ID: 5003
Deployer: 0x...
Admin: 0x...

Step 1: Deploying contracts...
1/10: Deploying InvoiceToken...
  InvoiceToken deployed at: 0x...
2/10: Deploying KYBRegistry...
  KYBRegistry deployed at: 0x...
...
10/10: Deploying InvoiceXCore...
  InvoiceXCore deployed at: 0x...

All contracts deployed successfully!

Step 2: Configuring roles and permissions...
...

=== Deployment Complete ===
```

### Step 2: Save Contract Addresses

The script will output a JSON object with all contract addresses. Save this to `deployments/mantle-sepolia.json`:

```json
{
  "invoiceToken": "0x...",
  "invoiceXCore": "0x...",
  "businessRegistry": "0x...",
  "buyerRegistry": "0x...",
  "kybRegistry": "0x...",
  "creditOracle": "0x...",
  "liquidityPool": "0x...",
  "yieldDistributor": "0x...",
  "insurancePool": "0x...",
  "invoiceMarketplace": "0x...",
  "stablecoin": "0x..."
}
```

### Step 3: Update .env File

Add the deployed addresses to your `.env` file for use in configuration and verification scripts.

---

## Configuration

### Advanced Configuration (Optional)

If you need to customize parameters beyond the defaults:

```bash
# Update .env with your deployed contract addresses first
export ADMIN_PRIVATE_KEY=$PRIVATE_KEY

forge script script/ConfigureInvoiceX.s.sol:ConfigureInvoiceX \
    --rpc-url $RPC_URL \
    --broadcast \
    -vvvv
```

**This configures:**
- Invoice amount limits ($5K - $1M)
- Payment term limits (15-120 days)
- Protocol fees (1.5%)
- Liquidity pool parameters
- Insurance coverage tiers
- Supported KYB jurisdictions

---

## Verification

### Automatic Verification

If deployment was run with `--verify` flag, contracts should auto-verify. If not, run:

```bash
forge script script/VerifyInvoiceX.s.sol:VerifyInvoiceX \
    --rpc-url $RPC_URL
```

This generates verification commands for all contracts.

### Manual Verification

Example for InvoiceToken:

```bash
forge verify-contract \
    --chain-id 5003 \
    --watch \
    $INVOICE_TOKEN_ADDRESS \
    src/core/InvoiceToken.sol:InvoiceToken
```

For contracts with constructor args (e.g., InvoiceXCore):

```bash
forge verify-contract \
    --chain-id 5003 \
    --watch \
    --constructor-args $(cast abi-encode 'constructor(address,address,address,address,address,address,address,address,address)' \
        $STABLECOIN_ADDRESS \
        $INVOICE_TOKEN_ADDRESS \
        $BUSINESS_REGISTRY_ADDRESS \
        $BUYER_REGISTRY_ADDRESS \
        $KYB_REGISTRY_ADDRESS \
        $CREDIT_ORACLE_ADDRESS \
        $LIQUIDITY_POOL_ADDRESS \
        $YIELD_DISTRIBUTOR_ADDRESS \
        $ADMIN_ADDRESS) \
    $INVOICEX_CORE_ADDRESS \
    src/core/InvoiceXCore.sol:InvoiceXCore
```

---

## Post-Deployment

### 1. Export ABIs for Frontend

```bash
# Create ABI directory
mkdir -p ../frontend/src/lib/abis

# Export all contract ABIs
forge inspect InvoiceToken abi > ../frontend/src/lib/abis/InvoiceToken.json
forge inspect InvoiceXCore abi > ../frontend/src/lib/abis/InvoiceXCore.json
forge inspect BusinessRegistry abi > ../frontend/src/lib/abis/BusinessRegistry.json
forge inspect BuyerRegistry abi > ../frontend/src/lib/abis/BuyerRegistry.json
forge inspect KYBRegistry abi > ../frontend/src/lib/abis/KYBRegistry.json
forge inspect CreditOracle abi > ../frontend/src/lib/abis/CreditOracle.json
forge inspect LiquidityPool abi > ../frontend/src/lib/abis/LiquidityPool.json
forge inspect YieldDistributor abi > ../frontend/src/lib/abis/YieldDistributor.json
forge inspect InsurancePool abi > ../frontend/src/lib/abis/InsurancePool.json
forge inspect InvoiceMarketplace abi > ../frontend/src/lib/abis/InvoiceMarketplace.json
```

### 2. Initial Setup Tasks

After deployment, perform these tasks as admin:

#### a) Register Test Businesses (Testnet Only)

```bash
# Example: Register a test business
cast send $BUSINESS_REGISTRY_ADDRESS \
    "registerBusiness(bytes32,string)" \
    $(cast keccak "TEST_BUSINESS_001") \
    "ipfs://business_metadata" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

#### b) Register Test Buyers

```bash
# Example: Register a test buyer
cast send $BUYER_REGISTRY_ADDRESS \
    "registerBuyer(bytes32)" \
    $(cast keccak "TEST_BUYER_001") \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

#### c) Add Initial Liquidity (Testnet Only)

```bash
# Approve stablecoin
cast send $STABLECOIN_ADDRESS \
    "approve(address,uint256)" \
    $LIQUIDITY_POOL_ADDRESS \
    1000000000000 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Deposit to TIER_A pool
cast send $LIQUIDITY_POOL_ADDRESS \
    "deposit(uint8,uint256)" \
    0 \
    1000000000 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

### 3. Set Up Oracle Operator

Grant oracle role to your backend oracle service:

```bash
cast send $CREDIT_ORACLE_ADDRESS \
    "grantRole(bytes32,address)" \
    $(cast keccak "ORACLE_ROLE") \
    $ORACLE_OPERATOR_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $ADMIN_PRIVATE_KEY
```

### 4. Configure Monitoring

Set up monitoring for:
- Contract events
- Transaction failures
- Pool utilization
- Default rates
- Oracle uptime

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Insufficient Funds"

**Solution:** Ensure deployment wallet has enough native tokens for gas.

```bash
# Check balance
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL
```

#### 2. Contract Verification Fails

**Solution:** Wait 1-2 minutes after deployment, then retry verification.

```bash
# Check if contract is deployed
cast code $CONTRACT_ADDRESS --rpc-url $RPC_URL

# Retry verification
forge verify-contract ...
```

#### 3. "Nonce Too Low" Error

**Solution:** Reset nonce or wait for pending transactions to confirm.

```bash
# Check pending transactions
cast nonce $YOUR_ADDRESS --rpc-url $RPC_URL
```

#### 4. Role Assignment Fails

**Solution:** Ensure you're using the admin account that was set during deployment.

```bash
# Check who has admin role
cast call $CONTRACT_ADDRESS \
    "hasRole(bytes32,address)(bool)" \
    $(cast keccak "DEFAULT_ADMIN_ROLE") \
    $ADMIN_ADDRESS \
    --rpc-url $RPC_URL
```

### Gas Estimation

Approximate gas costs for deployment:

| Contract | Estimated Gas | Cost (@20 Gwei) |
|----------|---------------|------------------|
| InvoiceToken | 2.5M | ~0.05 ETH |
| KYBRegistry | 1.8M | ~0.036 ETH |
| BuyerRegistry | 1.5M | ~0.03 ETH |
| BusinessRegistry | 2.0M | ~0.04 ETH |
| CreditOracle | 2.2M | ~0.044 ETH |
| LiquidityPool | 3.0M | ~0.06 ETH |
| YieldDistributor | 2.8M | ~0.056 ETH |
| InsurancePool | 2.8M | ~0.056 ETH |
| InvoiceMarketplace | 2.5M | ~0.05 ETH |
| InvoiceXCore | 3.6M | ~0.072 ETH |
| **TOTAL** | **~24.7M** | **~0.494 ETH** |

*Note: Mantle network has significantly lower gas costs than Ethereum mainnet.*

---

## Security Considerations

### Pre-Deployment Checklist

- [ ] Audit all contracts before mainnet deployment
- [ ] Test all functions on testnet
- [ ] Verify all role assignments
- [ ] Set appropriate access controls
- [ ] Configure emergency pause mechanisms
- [ ] Set up multisig for admin operations (recommended)
- [ ] Prepare incident response plan

### Post-Deployment Security

1. **Transfer Admin to Multisig** (Recommended)
   ```bash
   cast send $INVOICEX_CORE_ADDRESS \
       "grantRole(bytes32,address)" \
       $(cast keccak "DEFAULT_ADMIN_ROLE") \
       $MULTISIG_ADDRESS \
       --rpc-url $RPC_URL \
       --private-key $ADMIN_PRIVATE_KEY
   ```

2. **Enable Timelock** for critical operations

3. **Set up monitoring** for suspicious activities

---

## Support

For deployment assistance:
- GitHub Issues: https://github.com/your-org/invoicex/issues
- Documentation: https://docs.invoicex.xyz
- Discord: https://discord.gg/invoicex

---

## License

MIT License - see LICENSE file for details
