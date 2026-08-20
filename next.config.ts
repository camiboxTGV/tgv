import type { NextConfig } from "next";
import { supplierImageRemotePatterns } from "./suppliers/image-sources";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supplierImageRemotePatterns,
  },
};

export default nextConfig;
