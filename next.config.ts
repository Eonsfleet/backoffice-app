import { execSync } from 'node:child_process'
import type { NextConfig } from 'next'

/**
 * Picks the API base URL from the branch being built:
 *   main            → NEXT_PUBLIC_API_BASE_URL   (production)
 *   any other branch → NEXT_STAGING_API_BASE_URL (staging / sandbox)
 *
 * Set APP_ENV=production|staging to override branch detection (e.g. in Docker,
 * where .git is not available).
 */
function currentBranch(): string | undefined {
  const fromCi =
    process.env.VERCEL_GIT_COMMIT_REF ?? // Vercel
    process.env.GITHUB_HEAD_REF ??       // GitHub Actions (pull_request)
    process.env.GITHUB_REF_NAME ??       // GitHub Actions (push)
    process.env.CF_PAGES_BRANCH ??       // Cloudflare Pages
    process.env.BRANCH                   // Netlify
  if (fromCi) return fromCi

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return undefined
  }
}

function resolveApiBaseUrl(): string | undefined {
  const production = process.env.NEXT_PUBLIC_API_BASE_URL
  const staging = process.env.NEXT_STAGING_API_BASE_URL

  const appEnv = process.env.APP_ENV
  const branch = currentBranch()
  // Unknown branch and no override → production, so existing deploys keep working.
  const isStaging = appEnv ? appEnv === 'staging' : branch !== undefined && branch !== 'main'

  if (isStaging && !staging) {
    console.warn('[env] Staging build but NEXT_STAGING_API_BASE_URL is not set, falling back to production URL.')
  }

  const url = isStaging && staging ? staging : production
  console.log(`[env] branch=${branch ?? 'unknown'} → API ${url}`)
  return url
}

const apiBaseUrl = resolveApiBaseUrl()

const nextConfig: NextConfig = {
  output: 'standalone',
  // Overrides the value from .env so lib/env.ts sees the branch-appropriate URL.
  env: apiBaseUrl ? { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl } : {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
