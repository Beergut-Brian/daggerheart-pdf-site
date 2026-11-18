import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // HTML-in-Canvas test page (Kaden, Nov 17): the static table lives in public/table/.
  async rewrites() {
    return [{ source: "/table", destination: "/table/index.html" }];
  },
};

export default nextConfig;
