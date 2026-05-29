const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.join(__dirname, '..')
const electronDir = path.join(projectRoot, 'node_modules', 'electron')
const installScript = path.join(electronDir, 'install.js')
const distDir = path.join(electronDir, 'dist')
const pathFile = path.join(electronDir, 'path.txt')
const executable = path.join(distDir, 'electron.exe')

console.log('\n[rs3-companion] Force-installing Electron for Windows...\n')

if (!fs.existsSync(installScript)) {
  console.error('electron package missing. Run: npm install')
  process.exit(1)
}

console.log('1) Clearing broken Electron install...')
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}
if (fs.existsSync(pathFile)) {
  fs.rmSync(pathFile)
}

console.log('2) Downloading Electron (this can take 1-3 minutes)...')
console.log('   Watch for errors below. If nothing happens, check antivirus/firewall.\n')

const env = {
  ...process.env,
  ELECTRON_SKIP_BINARY_DOWNLOAD: '',
  npm_config_platform: 'win32',
  force_no_cache: 'true'
}

const result = spawnSync(process.execPath, [installScript], {
  cwd: projectRoot,
  env,
  stdio: 'inherit'
})

if (result.status !== 0) {
  console.error('\n[rs3-companion] Electron download FAILED.\n')
  console.error('Try:')
  console.error('  npm uninstall electron')
  console.error('  npm install electron@36.2.0 --save-dev')
  console.error('  npm run fix-electron')
  process.exit(result.status ?? 1)
}

if (!fs.existsSync(executable)) {
  console.error('\n[rs3-companion] Install finished but electron.exe is still missing.\n')
  console.error('Check: npm config get ignore-scripts   (should be false)')
  console.error('Check antivirus did not quarantine the download.\n')
  process.exit(1)
}

console.log('\n[rs3-companion] SUCCESS!')
console.log('Found:', executable)
console.log('\nNow run: npm run dev\n')
