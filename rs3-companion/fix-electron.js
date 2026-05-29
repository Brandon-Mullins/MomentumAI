const path = require('path')
const { installElectron } = require('./scripts/electron-install-lib.cjs')

installElectron(__dirname).catch((error) => {
  console.error('\n[rs3-companion] FAILED:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
