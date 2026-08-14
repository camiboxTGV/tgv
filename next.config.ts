import type { NextConfig } from "next";
import { supplierImageRemotePatterns } from "./suppliers/suppliers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supplierImageRemotePatterns,
  },
};

export default nextConfig;
