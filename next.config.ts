import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "macma.ro",
        pathname: "/products/**",
      },
    ],
  },
};

export default nextConfig;
