export type QuestDifficulty = 'Novice' | 'Intermediate' | 'Experienced' | 'Master' | 'Grandmaster' | 'Special'

export type QuestStatus =
  | 'NOT_STARTED'
  | 'STARTED'
  | 'COMPLETED'
  | 'REQUIRES_UNLOCK'
  | 'UNKNOWN'

export interface QuestSummary {
  title: string
  status: QuestStatus
  difficulty: QuestDifficulty | string
  members: boolean
  questPoints: number
  userEligible: boolean
}

export interface QuestStep {
  id: string
  title: string
  body: string
  wikiAnchor?: string
}

export interface QuestWalkthrough {
  title: string
  description?: string
  wikiUrl: string
  requirements: string[]
  recommended: string[]
  steps: QuestStep[]
}

export interface QuestProgress {
  questTitle: string
  completedStepIds: string[]
  activeStepIndex: number
  startedAt: string
  updatedAt: string
}

export interface PlayerProfile {
  username: string
  quests: QuestSummary[]
  fetchedAt: string
}

export interface CompanionSettings {
  username: string
  pinnedQuestTitle: string | null
  enabledPluginIds: string[]
}

export interface OverlayQuestState {
  questTitle: string
  stepIndex: number
  totalSteps: number
  stepTitle: string
  stepBody: string
}
