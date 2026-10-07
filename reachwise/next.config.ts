import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // This app lives in a subfolder of the repo; pin the root so the parent lockfile isn't picked up.
    turbopack: { root: __dirname },
}

export default nextConfig
