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
    // Use fallback with multiple RPC endpoints and longer timeout
    [mantleSepoliaTestnet.id]: fallback([
      http('https://rpc.sepolia.mantle.xyz', {
        timeout: 30_000, // 30 seconds
        retryCount: 3,
        retryDelay: 1000,
      }),
      http('https://rpc.testnet.mantle.xyz', {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    ]),
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