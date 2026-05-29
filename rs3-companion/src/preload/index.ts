import { contextBridge, ipcRenderer } from 'electron'

export interface OverlayQuestState {
  questTitle: string
  stepIndex: number
  totalSteps: number
  stepTitle: string
  stepBody: string
}

const api = {
  overlay: {
    open: (): Promise<boolean> => ipcRenderer.invoke('overlay:open'),
    close: (): Promise<boolean> => ipcRenderer.invoke('overlay:close'),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke('overlay:is-open'),
    update: (state: OverlayQuestState): void => ipcRenderer.send('overlay:update', state),
    onState: (callback: (state: OverlayQuestState) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: OverlayQuestState): void => {
        callback(state)
      }
      ipcRenderer.on('overlay:state', listener)
      return () => ipcRenderer.removeListener('overlay:state', listener)
    },
    onClosed: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('overlay:closed', listener)
      return () => ipcRenderer.removeListener('overlay:closed', listener)
    }
  },
  isOverlayMode: (): boolean => {
    return new URLSearchParams(window.location.search).get('overlay') === '1'
  }
}

contextBridge.exposeInMainWorld('rs3Companion', api)

export type Rs3CompanionApi = typeof api
