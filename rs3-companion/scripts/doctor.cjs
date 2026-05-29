const fs = require('fs')
const path = require('path')

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron')
const pathFile = path.join(electronDir, 'path.txt')
const skipDownload = process.env.ELECTRON_SKIP_BINARY_DOWNLOAD

console.log('\nRS3 Companion — Electron diagnostics\n')
console.log('Project:', path.join(__dirname, '..'))
console.log('ELECTRON_SKIP_BINARY_DOWNLOAD:', skipDownload || '(not set)')

if (skipDownload) {
  console.log('\nPROBLEM: Downloads are disabled by ELECTRON_SKIP_BINARY_DOWNLOAD.')
  console.log('Fix (Command Prompt):')
  console.log('  set ELECTRON_SKIP_BINARY_DOWNLOAD=')
  console.log('  node node_modules\\electron\\install.js')
  console.log('')
  process.exit(1)
}

let platformPath = ''
try {
  platformPath = fs.readFileSync(pathFile, 'utf-8').trim()
  console.log('path.txt:', platformPath)
} catch {
  console.log('path.txt: MISSING')
}

const executable = platformPath ? path.join(electronDir, 'dist', platformPath) : ''
if (executable) {
  console.log('Executable path:', executable)
  console.log('Executable exists:', fs.existsSync(executable) ? 'YES' : 'NO')
} else {
  console.log('Executable path: (unknown — path.txt missing)')
}

const distDir = path.join(electronDir, 'dist')
if (fs.existsSync(distDir)) {
  console.log('dist contents:', fs.readdirSync(distDir).join(', ') || '(empty)')
} else {
  console.log('dist folder: MISSING')
}

console.log('')
if (platformPath && executable && fs.existsSync(executable)) {
  console.log('Status: Electron looks installed. Try: npm run dev')
} else {
  console.log('Status: Electron is NOT installed.')
  console.log('Run:')
  console.log('  set ELECTRON_SKIP_BINARY_DOWNLOAD=')
  console.log('  node node_modules\\electron\\install.js')
}
console.log('')
