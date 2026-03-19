import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The Next.js Turbopack type-checker worker crashes (stack overflow) when
    // inferring deep literal union types from large JSON imports such as
    // formulaMapExpanded.json (121 formulas × N herb_ids per formula).
    // npx tsc --noEmit is the authoritative type-check gate and must remain
    // clean. This flag only skips the redundant in-build worker check.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
