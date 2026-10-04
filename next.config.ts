import type { NextConfig } from "next";
import { supplierImageRemotePatterns } from "./suppliers/image-sources";

const nextConfig: NextConfig = {
  // Offer PDF fonts live outside public/: if standalone tracing copies any
  // public/ file, Firebase App Hosting skips copying the rest of public/.
  outputFileTracingIncludes: {
    "/api/offer-pdf": ["./lib/offer/fonts/*.ttf"],
  },
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
