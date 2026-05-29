import type {
  CompanionSettings,
  PlayerProfile,
  QuestProgress,
  QuestStatus,
  QuestSummary
} from '@/types/quest'

const SETTINGS_KEY = 'rs3-companion:settings'
const PROGRESS_KEY = 'rs3-companion:quest-progress'
const PROFILE_KEY = 'rs3-companion:player-profile'

const defaultSettings: CompanionSettings = {
  username: '',
  pinnedQuestTitle: null,
  enabledPluginIds: ['quest-helper']
}

export function loadSettings(): CompanionSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaultSettings }
    return { ...defaultSettings, ...(JSON.parse(raw) as CompanionSettings) }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: CompanionSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadQuestProgress(): Record<string, QuestProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, QuestProgress>
  } catch {
    return {}
  }
}

export function saveQuestProgress(progress: Record<string, QuestProgress>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function upsertQuestProgress(entry: QuestProgress): QuestProgress {
  const all = loadQuestProgress()
  all[entry.questTitle] = entry
  saveQuestProgress(all)
  return entry
}

export function loadCachedProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlayerProfile
  } catch {
    return null
  }
}

export function saveCachedProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function filterQuests(
  quests: QuestSummary[],
  query: string,
  statusFilter: QuestStatusFilter
): QuestSummary[] {
  const normalized = query.trim().toLowerCase()

  return quests.filter((quest) => {
    const matchesQuery =
      normalized.length === 0 || quest.title.toLowerCase().includes(normalized)

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'incomplete' && quest.status !== 'COMPLETED') ||
      (statusFilter === 'completed' && quest.status === 'COMPLETED') ||
      (statusFilter === 'eligible' && quest.userEligible && quest.status !== 'COMPLETED')

    return matchesQuery && matchesStatus
  })
}

export type QuestStatusFilter = 'all' | 'incomplete' | 'completed' | 'eligible'

export function difficultyRank(difficulty: string): number {
  const order = ['Novice', 'Intermediate', 'Experienced', 'Master', 'Grandmaster', 'Special']
  const index = order.indexOf(difficulty)
  return index === -1 ? 99 : index
}
