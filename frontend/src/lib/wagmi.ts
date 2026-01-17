import { createConfig, http, fallback } from 'wagmi'
import { mantleSepoliaTestnet, mantleMainnet } from './chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

// Create config with basic connectors and improved RPC settings
export const config = createConfig({
  chains: [mantleSepoliaTestnet, mantleMainnet],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'InvoiceX Protocol',
    }),
  ],
  transports: {
    // Use primary RPC endpoint for Mantle Sepolia
    [mantleSepoliaTestnet.id]: http('https://rpc.sepolia.mantle.xyz', {
      timeout: 60_000, // 60 seconds for transaction confirmations
      retryCount: 5,
      retryDelay: 2000,
    }),
    [mantleMainnet.id]: fallback([
      http('https://rpc.mantle.xyz', {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      }),
      http('https://mantle.drpc.org', {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    ]),
  },
  ssr: true, // Enable SSR support
  batch: {
    multicall: {
      wait: 100, // Add batching for better performance
    },
  },
})