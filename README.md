# InvoiceX Protocol 🧾

> **Get paid TODAY for invoices due in 90 days** — Powered by DeFi liquidity and AI risk scoring on Mantle Network

[![Foundry][foundry-badge]][foundry]
[![License: MIT][license-badge]][license]

[foundry]: https://getfoundry.sh/
[foundry-badge]: https://img.shields.io/badge/Built%20with-Foundry-FFDB1C.svg
[license]: https://opensource.org/licenses/MIT
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg

## 🏆 Mantle Global Hackathon 2025 Submission

**Track Participation:**
- 🎯 **Primary:** RWA / RealFi (Invoice Tokenization)
- 🤖 **Secondary:** AI & Oracles (Credit Scoring)
- 🔐 **Tertiary:** ZK & Privacy (Business Verification)
- 💰 **Quaternary:** DeFi & Composability (Liquidity Pools)

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh/) - Ethereum development toolkit
- [Git](https://git-scm.com/) - Version control
- [Node.js](https://nodejs.org/) v18+ (optional, for frontend)

### Installation

```bash
# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone the repository
git clone https://github.com/your-team/invoicex.git
cd invoicex

# Install dependencies
forge install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Build contracts
forge build

# Run tests
forge test -vvv

# Deploy to Mantle Testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url mantle_testnet --broadcast
```

## 📋 Smart Contracts

| # | Contract | Purpose | Status |
|---|----------|---------|--------|
| 1 | `InvoiceToken.sol` | ERC-721 NFT for tokenized invoices | 📝 Next |
| 2 | `BusinessRegistry.sol` | Verified business management | 📝 Planned |
| 3 | `BuyerRegistry.sol` | Invoice buyers + credit data | 📝 Planned |
| 4 | `KYBRegistry.sol` | Know Your Business compliance | 📝 Planned |
| 5 | `CreditOracle.sol` | AI-powered risk assessment | 📝 Planned |
| 6 | `LiquidityPool.sol` | Tiered investor pools | 📝 Planned |
| 7 | `YieldDistributor.sol` | Payment handling + yield distribution | 📝 Planned |
| 8 | `InvoiceXCore.sol` | Main coordinator contract | 📝 Planned |
| 9 | `InsurancePool.sol` | Default protection | 📝 Planned |
| 10 | `InvoiceMarketplace.sol` | Secondary trading | 📝 Planned |

## 🧪 Testing

```bash
# Run all tests
forge test -vvv

# Run with gas report
forge test --gas-report

# Run coverage
forge coverage

# Create snapshot
forge snapshot
```

## 📦 Deployment

```bash
# Mantle Testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url mantle_testnet --broadcast --verify -vvvv

# Mantle Mainnet
forge script script/Deploy.s.sol:DeployScript --rpc-url mantle --broadcast --verify -vvvv
```

## 🛠 Technology Stack

- **Smart Contracts**: Solidity ^0.8.20
- **Framework**: Foundry (forge, cast, anvil)
- **Libraries**: OpenZeppelin Contracts v5
- **Blockchain**: Mantle Network (EVM L2)
- **Stablecoin**: USDT (6 decimals)

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

**Built with ❤️ for the Mantle Global Hackathon 2025**