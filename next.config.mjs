// next.config.mjs

const nextConfig = {
  reactStrictMode: false,
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ["exp.sip3-metawork.com"],
//  assetPrefix: "/jaka",
  basePath: "/jaka",
  env: {
    NEXT_BASE_PATH: "/jaka"
  }
};

export default nextConfig;
