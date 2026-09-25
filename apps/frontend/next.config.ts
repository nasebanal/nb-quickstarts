import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Scenario 1's page moved from /docs/testing to /docs/scenario-testing, named like the other
  // scenario pages. The old path keeps working for bookmarks and links already shared.
  async redirects() {
    return [{ source: "/docs/testing", destination: "/docs/scenario-testing", permanent: true }];
  },
};

export default nextConfig;
