// Contract addresses from the successful deployment
// Using Mantle Sepolia - Updated from deployments/mantle-sepolia-full.json
export const CONTRACTS = {
  mockUSDT: '0x5aAdFB43eF8dAF45DD80F4676345b7676f1D70e3' as `0x${string}`,
  invoiceToken: '0x0dA7A699bA5881Be099caD405E49BDF94C3E31a5' as `0x${string}`,
  invoiceXCore: '0xd67BA7f3fbae1c3B9Ad55c56274e47c859e6d301' as `0x${string}`,
  businessRegistry: '0xEe1fFe183002c22607E84A335d29fa2E94538ffc' as `0x${string}`,
  buyerRegistry: '0x554dc44df2AA9c718F6388ef057282893f31C04C' as `0x${string}`,
  kybRegistry: '0x7d6FfE6Bae45120cdf907026A6757DbE633d7a50' as `0x${string}`,
  creditOracle: '0x4E0C6E13eAee2C879D075c285b31272AE6b3967C' as `0x${string}`,
  liquidityPool: '0x605F80DcFd708465474E9D130b5c06202e79e2c6' as `0x${string}`,
  yieldDistributor: '0xCB5d6d80535a5F50f33C457eEf4ca2E9F712E864' as `0x${string}`,
  insurancePool: '0x99907915Ef1836a00ce88061B75B2cfC4537B5A6' as `0x${string}`,
  invoiceMarketplace: '0x35b95450Eaab790de5a8067064B9ce75a57d4d8f' as `0x${string}`,
}

// Legacy structure for backwards compatibility
export const CONTRACTS_BY_CHAIN = {
  mantleSepolia: CONTRACTS,
  mantleMainnet: {
    mockUSDT: '' as `0x${string}`,
    invoiceToken: '' as `0x${string}`,
    invoiceXCore: '' as `0x${string}`,
    businessRegistry: '' as `0x${string}`,
    buyerRegistry: '' as `0x${string}`,
    kybRegistry: '' as `0x${string}`,
    creditOracle: '' as `0x${string}`,
    liquidityPool: '' as `0x${string}`,
    yieldDistributor: '' as `0x${string}`,
    insurancePool: '' as `0x${string}`,
    invoiceMarketplace: '' as `0x${string}`,
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