// Contract addresses from the successful deployment
// Using Mantle Sepolia by default
export const CONTRACTS = {
  MockUSDT: '0x730116Ded8eDB4c6f5Eae19f549D8129cd2cDe5D' as `0x${string}`,
  InvoiceToken: '0x1666095Ee7ce94d92A09e1A120446cB10D62368F' as `0x${string}`,
  InvoiceXCore: '0x673FBa3576d4AF2ae3a2FFC93780877CeEAD42C2' as `0x${string}`,
  BusinessRegistry: '0xa08Ae8c611737021d80e19231CF7c5602092d22A' as `0x${string}`,
  BuyerRegistry: '0x979D45817d636a01F31eDaEb2043dF5edFa67D1A' as `0x${string}`,
  KYBRegistry: '0x00057f627Ba4c038c9a721448041F81392b72139' as `0x${string}`,
  CreditOracle: '0xD75273b57c135300A5D82b48042bCec9aa7C4C4B' as `0x${string}`,
  LiquidityPool: '0xEc98b4be3aa5f55B418E07E2895cb316364318cC' as `0x${string}`,
  YieldDistributor: '0x7474a38BA2028382169F989B5B1f055c1cCaF413' as `0x${string}`,
  InsurancePool: '0xc56e14bF5D9944A67AaE32Af6d46ed8Cb7d98AAB' as `0x${string}`,
  InvoiceMarketplace: '0xC9443C35e6aCACB6F3c8341af3465cD270aDd5E9' as `0x${string}`,
}

// Legacy structure for backwards compatibility
export const CONTRACTS_BY_CHAIN = {
  mantleSepolia: CONTRACTS,
  mantleMainnet: {
    MockUSDT: '' as `0x${string}`,
    InvoiceToken: '' as `0x${string}`,
    InvoiceXCore: '' as `0x${string}`,
    BusinessRegistry: '' as `0x${string}`,
    BuyerRegistry: '' as `0x${string}`,
    KYBRegistry: '' as `0x${string}`,
    CreditOracle: '' as `0x${string}`,
    LiquidityPool: '' as `0x${string}`,
    YieldDistributor: '' as `0x${string}`,
    InsurancePool: '' as `0x${string}`,
    InvoiceMarketplace: '' as `0x${string}`,
  }
}

export type ContractName = keyof typeof CONTRACTS

export const getContractAddress = (chainId: number, contractName: ContractName): `0x${string}` => {
  if (chainId === 5003) {
    return CONTRACTS_BY_CHAIN.mantleSepolia[contractName]
  } else if (chainId === 5000) {
    return CONTRACTS_BY_CHAIN.mantleMainnet[contractName]
  }
  throw new Error(`Unsupported chain ID: ${chainId}`)
}