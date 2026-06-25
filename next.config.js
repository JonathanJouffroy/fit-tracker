const { execSync } = require('child_process')

// Génère une version unique à chaque build : timestamp + hash git si disponible
function getBuildVersion() {
  const timestamp = Date.now()
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim()
    return `${timestamp}-${hash}`
  } catch {
    return `${timestamp}`
  }
}

const buildVersion = getBuildVersion() 

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Injecte la version dans le Service Worker au moment du build
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },

  // Remplace __SW_VERSION__ dans sw.js par la vraie version au build
  webpack(config, { isServer }) {
    if (!isServer) {
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          'self.__SW_VERSION__': JSON.stringify(buildVersion),
        })
      )
    }
    return config
  },
}

console.log(`🏋️  Fit Tracker build version: ${buildVersion}`)

module.exports = nextConfig
