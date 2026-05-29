import type { Rs3CompanionApi } from '../../electron/preload/index'

declare global {
  interface Window {
    rs3Companion: Rs3CompanionApi
  }
}

export {}
