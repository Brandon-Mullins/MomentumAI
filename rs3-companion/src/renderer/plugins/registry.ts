export interface CompanionPlugin {
  id: string
  name: string
  description: string
  icon: string
}

export interface PluginContext {
  notify: (message: string) => void
}

export interface PluginModule {
  plugin: CompanionPlugin
  onEnable?: (context: PluginContext) => void
  onDisable?: () => void
}

export const questHelperPlugin: PluginModule = {
  plugin: {
    id: 'quest-helper',
    name: 'Quest Helper',
    description: 'Step-by-step quest guides sourced from the RuneScape Wiki with progress tracking.',
    icon: '🗺️'
  }
}

export const clueSolverPlugin: PluginModule = {
  plugin: {
    id: 'clue-solver',
    name: 'Clue Solver',
    description: 'Treasure Trail helpers (coming soon). Screen-reading puzzle detection planned.',
    icon: '🧩'
  }
}

export const xpTrackerPlugin: PluginModule = {
  plugin: {
    id: 'xp-tracker',
    name: 'XP Tracker',
    description: 'Session XP tracking overlay (coming soon). Inspired by Alt1 app toolkit patterns.',
    icon: '📈'
  }
}

export const registeredPlugins: PluginModule[] = [
  questHelperPlugin,
  clueSolverPlugin,
  xpTrackerPlugin
]

export function getPluginById(id: string): PluginModule | undefined {
  return registeredPlugins.find((entry) => entry.plugin.id === id)
}
