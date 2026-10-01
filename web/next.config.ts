import type { NextConfig } from "next";

// The hosted API (public URL, not a secret). Local development talks to localhost;
// either can be overridden with the API_URL / NEXT_PUBLIC_SOCKET_URL env vars.
const HOSTED_API = "https://worknest-api-ts91.onrender.com";
const onVercel = !!process.env.VERCEL;
const API_URL = process.env.API_URL ?? (onVercel ? HOSTED_API : "http://localhost:4000");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL,
  },
  // Proxy the API through the web origin so the httpOnly auth cookie is first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
