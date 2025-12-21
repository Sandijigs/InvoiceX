# Contributing to InvoiceX Protocol

Thank you for your interest in contributing to InvoiceX! This document provides guidelines and instructions for contributing to the project.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## 🔄 Development Workflow

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/invoicex.git
cd invoicex

# Add upstream remote
git remote add upstream https://github.com/invoicex/invoicex.git
```

### 2. Create a Branch
```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bug fix branch
git checkout -b fix/issue-description
```

### 3. Make Changes
- Follow the coding standards below
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Changes
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature description"
# Or
git commit -m "fix: resolve issue with..."
```

#### Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

### 5. Push and Create PR
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## 📝 Coding Standards

### Solidity
- Use Solidity 0.8.20 or higher
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.20/style-guide.html)
- Include NatSpec comments for all public functions
- Use explicit function visibility
- Implement comprehensive error handling
- Gas optimization is important

Example:
```solidity
/**
 * @notice Submits an invoice for factoring
 * @dev Validates business and creates NFT token
 * @param seller Address of the business submitting invoice
 * @param buyerHash Hashed identifier of the buyer
 * @param amount Invoice amount in USDT (6 decimals)
 * @return invoiceId The ID of the created invoice token
 */
function submitInvoice(
    address seller,
    bytes32 buyerHash,
    uint256 amount
) external returns (uint256 invoiceId) {
    // Implementation
}
```

### TypeScript
- Use TypeScript for all scripts and tests
- Enable strict mode
- Use async/await over callbacks
- Proper error handling with try/catch
- Type all function parameters and returns

Example:
```typescript
async function deployContract(
  contractName: string,
  args: any[] = []
): Promise<Contract> {
  try {
    const Factory = await ethers.getContractFactory(contractName);
    const contract = await Factory.deploy(...args);
    await contract.waitForDeployment();
    return contract;
  } catch (error) {
    console.error(`Failed to deploy ${contractName}:`, error);
    throw error;
  }
}
```

## 🧪 Testing Guidelines

### Test Structure
```typescript
describe("ContractName", () => {
  describe("Deployment", () => {
    it("Should deploy with correct initial values", async () => {
      // Test implementation
    });
  });

  describe("Function Name", () => {
    it("Should perform expected behavior", async () => {
      // Test implementation
    });

    it("Should revert when conditions not met", async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage
- Aim for 100% code coverage
- Test both success and failure cases
- Include edge cases
- Test gas optimization

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test test/InvoiceToken.test.ts

# Run with coverage
npm run test:coverage
```

## 📚 Documentation

### Code Documentation
- Add NatSpec comments to all contracts
- Include inline comments for complex logic
- Update README for new features
- Add examples for new functionality

### API Documentation
- Document all external functions
- Include parameter descriptions
- Provide usage examples
- Note any breaking changes

## 🐛 Reporting Issues

### Before Submitting an Issue
- Check existing issues
- Ensure you're using the latest version
- Try to reproduce in a clean environment

### Issue Template
```markdown
**Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Node version:
- Network:
- Browser/Wallet:
```

## 🚀 Feature Requests

### Proposal Template
```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you solve it?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any other relevant information
```

## 📋 Pull Request Process

1. **Update Documentation** - Include any necessary documentation updates
2. **Add Tests** - Include tests for new functionality
3. **Pass CI/CD** - Ensure all checks pass
4. **Code Review** - Address reviewer feedback
5. **Squash Commits** - Clean commit history if requested

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated existing tests

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No warnings generated
```

## 🏗 Project Structure

```
invoicex/
├── contracts/         # Solidity contracts
│   ├── core/         # Core protocol contracts
│   ├── interfaces/   # Contract interfaces
│   └── libraries/    # Shared libraries
├── scripts/          # Deployment scripts
├── test/            # Test files
├── docs/            # Documentation
└── frontend/        # Frontend application
```

## 🔗 Useful Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Mantle Network Docs](https://docs.mantle.xyz)
- [Solidity Documentation](https://docs.soliditylang.org)

## 📞 Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/invoicex)
- **GitHub Issues**: For bugs and feature requests
- **Email**: dev@invoicex.finance

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website

Thank you for contributing to InvoiceX Protocol!