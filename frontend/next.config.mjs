/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Disable server-side rendering for graph visualization libraries
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  experimental: {
    // Enable optimizations for client-side graph libraries
    optimizePackageImports: ['cytoscape', 'd3'],
  },
};
