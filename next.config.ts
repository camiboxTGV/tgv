import type { NextConfig } from "next";
import { supplierImageRemotePatterns } from "./suppliers/image-sources";

const nextConfig: NextConfig = {
  images: {
    // Firebase App Hosting disables Next image optimization unless this is
    // explicitly set. Keep responsive resizing enabled for catalog imagery.
    unoptimized: false,
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/api/catalog-image/**" },
    ],
    remotePatterns: supplierImageRemotePatterns,
  },
};

export default nextConfig;
