const fs = require('fs')
const path = require('path')

function getElectronPaths(projectRoot) {
  const electronDir = path.join(projectRoot, 'node_modules', 'electron')
  const distDir = path.join(electronDir, 'dist')
  const pathFile = path.join(electronDir, 'path.txt')

  return { electronDir, distDir, pathFile }
}

function findElectronExe(distDir) {
  const direct = path.join(distDir, 'electron.exe')
  if (fs.existsSync(direct)) {
    return { executable: direct, relativePath: 'electron.exe' }
  }

  function walk(currentDir, prefix = '') {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name)
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isFile() && entry.name.toLowerCase() === 'electron.exe') {
        return { executable: entryPath, relativePath: relativePath.replace(/\\/g, '/') }
      }

      if (entry.isDirectory()) {
        const nested = walk(entryPath, relativePath)
        if (nested) return nested
      }
    }

    return null
  }

  return walk(distDir)
}

function flattenDist(distDir) {
  const entries = fs.readdirSync(distDir, { withFileTypes: true })
  if (entries.length !== 1 || !entries[0].isDirectory()) {
    return
  }

  const nestedDir = path.join(distDir, entries[0].name)
  for (const name of fs.readdirSync(nestedDir)) {
    fs.renameSync(path.join(nestedDir, name), path.join(distDir, name))
  }
  fs.rmSync(nestedDir, { recursive: true, force: true })
}

function isElectronReady(projectRoot) {
  const { electronDir, distDir, pathFile } = getElectronPaths(projectRoot)

  try {
    const platformPath = fs.readFileSync(pathFile, 'utf-8').trim()
    const executable = path.join(distDir, ...platformPath.split('/'))
    if (fs.existsSync(executable)) {
      return true
    }
  } catch {
    // Fall through to search dist directly.
  }

  return Boolean(findElectronExe(distDir))
}

async function installElectron(projectRoot) {
  const { electronDir, distDir, pathFile } = getElectronPaths(projectRoot)
  const executable = path.join(distDir, 'electron.exe')

  if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
    throw new Error(
      'ELECTRON_SKIP_BINARY_DOWNLOAD is set. Run: set ELECTRON_SKIP_BINARY_DOWNLOAD='
    )
  }

  if (!fs.existsSync(path.join(electronDir, 'package.json'))) {
    throw new Error('electron package missing. Run: npm install electron@36.2.0 --save-dev')
  }

  if (isElectronReady(projectRoot)) {
    const found = findElectronExe(distDir)
    console.log('[rs3-companion] Electron already installed:', found?.executable ?? executable)
    return found?.executable ?? executable
  }

  const { version } = require(path.join(electronDir, 'package.json'))
  const { downloadArtifact } = require('@electron/get')
  const extract = require('extract-zip')
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  console.log(`\n[rs3-companion] Installing Electron v${version} for win32-${arch}...\n`)

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
  }
  if (fs.existsSync(pathFile)) {
    fs.rmSync(pathFile)
  }
  fs.mkdirSync(distDir, { recursive: true })

  console.log('Downloading (~100MB). This may take 1-3 minutes...\n')

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch,
    force: true
  })

  console.log('Download complete:', zipPath)
  console.log('Extracting...\n')

  await extract(zipPath, { dir: distDir })
  flattenDist(distDir)

  const found = findElectronExe(distDir)
  if (!found) {
    console.error('dist folder contains:', fs.readdirSync(distDir).join(', ') || '(empty)')
    throw new Error(
      'electron.exe not found after extract. Windows Defender may have quarantined it — add an exclusion for this project folder.'
    )
  }

  fs.writeFileSync(pathFile, found.relativePath)
  fs.writeFileSync(path.join(distDir, 'version'), version)

  console.log('[rs3-companion] SUCCESS!')
  console.log('Installed:', found.executable)
  console.log('')

  return found.executable
}

module.exports = {
  findElectronExe,
  flattenDist,
  getElectronPaths,
  installElectron,
  isElectronReady
}
