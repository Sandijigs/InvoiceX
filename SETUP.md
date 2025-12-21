# InvoiceX Protocol - Setup Guide

## 📋 Prerequisites

Before setting up InvoiceX, ensure you have the following installed:

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   # Check version
   node --version

   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **npm or yarn**
   ```bash
   # npm comes with Node.js
   npm --version

   # Or install yarn
   npm install -g yarn
   ```

3. **Git**
   ```bash
   # Check version
   git --version
   ```

4. **MetaMask or Web3 Wallet**
   - Install from [metamask.io](https://metamask.io)
   - Create a development wallet
   - **NEVER use your main wallet for development**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/invoicex/invoicex.git
cd invoicex
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Never commit your .env file!
```

### 4. Configure Your `.env` File

```env
# Network Configuration
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
PRIVATE_KEY=your_wallet_private_key_here

# Optional: API Keys for enhanced features
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_cmc_api_key
```

### 5. Compile Contracts
```bash
npm run compile
```

### 6. Run Tests
```bash
npm test
```

## 🔧 Detailed Setup

### Setting Up Mantle Testnet

1. **Add Mantle Testnet to MetaMask**
   - Network Name: `Mantle Testnet`
   - RPC URL: `https://rpc.testnet.mantle.xyz`
   - Chain ID: `5001`
   - Currency Symbol: `MNT`
   - Block Explorer: `https://explorer.testnet.mantle.xyz`

2. **Get Testnet MNT**
   - Visit [Mantle Faucet](https://faucet.testnet.mantle.xyz)
   - Enter your wallet address
   - Receive test MNT tokens

3. **Verify Connection**
   ```bash
   npx hardhat console --network mantleTestnet
   > const balance = await ethers.provider.getBalance("YOUR_ADDRESS")
   > console.log(ethers.formatEther(balance))
   ```

### Local Development Setup

1. **Start Local Hardhat Node**
   ```bash
   npm run node
   ```

2. **Deploy Contracts Locally**
   ```bash
   # In a new terminal
   npm run deploy:localhost
   ```

3. **Run Frontend (if applicable)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📦 Package Installation Issues

### Common Issues and Solutions

#### Issue: `node-gyp` errors
**Solution:**
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
npm install --global windows-build-tools
```

#### Issue: Permission errors
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Or use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### Issue: Hardhat compilation errors
**Solution:**
```bash
# Clear artifacts and cache
npm run clean
npm run compile
```

## 🧪 Testing Setup

### Running Different Test Suites

```bash
# Run all tests
npm test

# Run specific test file
npm test test/InvoiceToken.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests with gas reporting
REPORT_GAS=true npm test
```

### Test Network Forking

For integration testing with Mantle mainnet state:

```bash
# Update .env
FORK_ENABLED=true
FORK_BLOCK_NUMBER=latest

# Run forked tests
npm run test:fork
```

## 🚀 Deployment Setup

### Deploy to Mantle Testnet

1. **Ensure you have testnet MNT**
   ```bash
   npx hardhat balance --account YOUR_ADDRESS --network mantleTestnet
   ```

2. **Deploy contracts**
   ```bash
   npm run deploy:testnet
   ```

3. **Verify contracts**
   ```bash
   npm run verify -- --network mantleTestnet CONTRACT_ADDRESS
   ```

### Deploy to Mantle Mainnet

⚠️ **WARNING**: Mainnet deployment uses real funds!

1. **Double-check configuration**
2. **Audit contracts**
3. **Test thoroughly on testnet**
4. **Deploy**
   ```bash
   npm run deploy:mainnet
   ```

## 🐳 Docker Setup (Optional)

### Using Docker

```dockerfile
# Dockerfile is provided
docker build -t invoicex .
docker run -p 8545:8545 invoicex
```

### Using Docker Compose

```bash
docker-compose up
```

## 🔍 Troubleshooting

### Debug Mode

Enable debug output:
```bash
DEBUG=* npm test
```

### Reset Hardhat

```bash
npx hardhat clean
rm -rf cache artifacts
npm run compile
```

### Check Contract Size

```bash
npx hardhat size-contracts
```

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Mantle Developer Docs](https://docs.mantle.xyz)
- [OpenZeppelin Wizard](https://wizard.openzeppelin.com)
- [Ethereum Development Best Practices](https://consensys.github.io/smart-contract-best-practices)

## 🆘 Getting Help

If you encounter issues:

1. Check [GitHub Issues](https://github.com/invoicex/invoicex/issues)
2. Join our [Discord](https://discord.gg/invoicex)
3. Read the [FAQ](./docs/FAQ.md)
4. Contact: support@invoicex.finance

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] Git configured
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Contracts compiled successfully
- [ ] Tests passing
- [ ] MetaMask configured with Mantle Testnet
- [ ] Testnet MNT received
- [ ] Local deployment successful

## 🎉 Next Steps

Once setup is complete:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
2. Explore the contract architecture in `/contracts`
3. Review test examples in `/test`
4. Start building your feature!

---

**Happy Building! 🚀**