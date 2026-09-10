/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full-stack mode: the route handlers under app/api are the backend.
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: false,

  // Turbopack is the default bundler from Next 16 on. It resolves `node:`
  // builtins (node:sqlite, node:child_process) natively on the server, so the
  // webpack externals shim Next 14 needed here is gone. instrumentation.ts is
  // also stable now — no experimental flag.
  turbopack: {},
};

export default nextConfig;
