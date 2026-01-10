/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle node modules that don't work in browser
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }

      // Mock React Native modules for web
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      }
    }

    // External packages that should not be bundled
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Ignore optional dependencies warnings
    config.ignoreWarnings = [
      { module: /@metamask\/sdk/ },
      { module: /@react-native-async-storage/ },
    ]

    return config
  },
}

module.exports = nextConfig