const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.join(__dirname, '..')
const electronDir = path.join(projectRoot, 'node_modules', 'electron')
const pathFile = path.join(electronDir, 'path.txt')
const installScript = path.join(electronDir, 'install.js')

function isElectronReady() {
  try {
    const platformPath = fs.readFileSync(pathFile, 'utf-8').trim()
    const executable = path.join(electronDir, 'dist', platformPath)
    return fs.existsSync(executable)
  } catch {
    return false
  }
}

if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
  console.error(
    '\n[rs3-companion] ELECTRON_SKIP_BINARY_DOWNLOAD is set. Unset it, then rerun npm install.\n'
  )
  process.exit(1)
}

if (!fs.existsSync(installScript)) {
  console.error('\n[rs3-companion] electron package is missing. Run: npm install\n')
  process.exit(1)
}

if (!isElectronReady()) {
  console.log('\n[rs3-companion] Electron binary not found. Downloading now...\n')

  const result = spawnSync(process.execPath, [installScript], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env
  })

  if (result.status !== 0) {
    console.error('\n[rs3-companion] Electron install failed.')
    console.error('Run manually: node node_modules\\electron\\install.js')
    console.error('If download fails, check antivirus, VPN, or corporate firewall.\n')
    process.exit(result.status ?? 1)
  }

  if (!isElectronReady()) {
    console.error('\n[rs3-companion] Electron install finished but binary is still missing.\n')
    process.exit(1)
  }

  console.log('\n[rs3-companion] Electron installed successfully.\n')
}
