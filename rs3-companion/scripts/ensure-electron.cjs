const path = require('path')
const { installElectron, isElectronReady } = require('./electron-install-lib.cjs')

const projectRoot = path.join(__dirname, '..')

async function main() {
  if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
    console.error('\n[rs3-companion] ELECTRON_SKIP_BINARY_DOWNLOAD is set.')
    console.error('Run: set ELECTRON_SKIP_BINARY_DOWNLOAD=\n')
    process.exit(1)
  }

  if (!isElectronReady(projectRoot)) {
    await installElectron(projectRoot)
  }
}

main().catch((error) => {
  console.error('\n[rs3-companion] Electron install failed:', error.message)
  console.error('\nRun manually: node fix-electron.js\n')
  process.exit(1)
})
