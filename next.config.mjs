/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full-stack mode: route handlers under app/api are the backend.
  // (Was `output: "export"` while the app was a static prototype.)
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: false,
  experimental: {
    // runs instrumentation.ts once per server boot: migrate -> seed -> job worker
    instrumentationHook: true,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      // node:sqlite / node:child_process must stay real requires, never bundled
      config.externals = config.externals || [];
      const kind = "commonjs";
      config.externals.push(({ request }, cb) =>
        request && request.startsWith("node:") ? cb(null, `${kind} ${request}`) : cb()
      );
    } else {
      // instrumentation.ts is also compiled for the edge/client graph even though
      // register() bails out there — stub the node-only modules so it resolves.
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "node:sqlite": false,
        "node:child_process": false,
        "node:fs": false,
        "node:fs/promises": false,
        "node:os": false,
        "node:path": false,
        "node:crypto": false,
        "node:stream": false,
        "node:util": false,
        "node:module": false,
        fs: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
