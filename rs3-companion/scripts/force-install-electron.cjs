const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const electronDir = path.join(projectRoot, 'node_modules', 'electron')
const distDir = path.join(electronDir, 'dist')
const pathFile = path.join(electronDir, 'path.txt')
const executable = path.join(distDir, 'electron.exe')

async function main() {
  console.log('\n[rs3-companion] Force-installing Electron for Windows...\n')

  if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
    throw new Error(
      'ELECTRON_SKIP_BINARY_DOWNLOAD is set. Run: set ELECTRON_SKIP_BINARY_DOWNLOAD='
    )
  }

  if (!fs.existsSync(path.join(electronDir, 'package.json'))) {
    throw new Error('electron package missing. Run: npm install electron@36.2.0 --save-dev')
  }

  const { version } = require(path.join(electronDir, 'package.json'))
  const { downloadArtifact } = require('@electron/get')
  const extract = require('extract-zip')

  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  console.log(`Target: Electron v${version} win32-${arch}`)
  console.log('Step 1/3: Clearing old files...')

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
  }
  if (fs.existsSync(pathFile)) {
    fs.rmSync(pathFile)
  }
  fs.mkdirSync(distDir, { recursive: true })

  console.log('Step 2/3: Downloading (~100MB). This may take 1-3 minutes...')
  console.log('If this hangs or fails, check antivirus / firewall / VPN.\n')

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch,
    force: true
  })

  console.log('\nDownload complete:', zipPath)
  console.log('Step 3/3: Extracting...\n')

  await extract(zipPath, { dir: distDir })

  if (!fs.existsSync(executable)) {
    console.error('Extract finished but electron.exe is missing.')
    console.error('dist folder contains:', fs.readdirSync(distDir).join(', ') || '(empty)')
    throw new Error('electron.exe not found after extract')
  }

  fs.writeFileSync(pathFile, 'electron.exe')
  fs.writeFileSync(path.join(distDir, 'version'), version)

  console.log('[rs3-companion] SUCCESS!')
  console.log('Installed:', executable)
  console.log('\nNow run: npm run dev\n')
}

main().catch((error) => {
  console.error('\n[rs3-companion] FAILED:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  console.error('\nTry:')
  console.error('  1) Temporarily disable antivirus')
  console.error('  2) Use a different network / turn off VPN')
  console.error('  3) Run Command Prompt as Administrator')
  console.error('')
  process.exit(1)
})
