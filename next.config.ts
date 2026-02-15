import type { NextConfig } from "next";
import { createRequire } from "node:module";

type NextPlugin = (config: NextConfig) => NextConfig;
let withSerwist: NextPlugin = (config) => config;

try {
  const require = createRequire(import.meta.url);
  const packageMod = require("@serwist/next");
  const createPlugin = packageMod?.withSerwistInit ?? packageMod?.withSerwist;
  if (typeof createPlugin === 'function') {
    withSerwist = createPlugin({
      swSrc: 'src/sw.ts',
      swDest: 'public/sw.js',
      register: true,
    });
  }
} catch {
  // Optional: local setup without @serwist/next installed yet.
}

const nextConfig: NextConfig = withSerwist({
  /* config options here */
});

export default nextConfig;
