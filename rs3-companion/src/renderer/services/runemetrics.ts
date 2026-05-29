import type { PlayerProfile, QuestDifficulty, QuestStatus, QuestSummary } from '@/types/quest'

interface RuneMetricsQuest {
  title: string
  status: string
  difficulty: number
  members: boolean
  questPoints: number
  userEligible: boolean
}

interface RuneMetricsResponse {
  quests: RuneMetricsQuest[]
  loggedIn?: string
}

const DIFFICULTY_MAP: Record<number, QuestDifficulty> = {
  0: 'Novice',
  1: 'Intermediate',
  2: 'Experienced',
  3: 'Master',
  4: 'Grandmaster',
  5: 'Special'
}

function normalizeStatus(status: string): QuestStatus {
  const upper = status.toUpperCase()
  if (upper.includes('COMPLETED')) return 'COMPLETED'
  if (upper.includes('STARTED') || upper.includes('IN_PROGRESS')) return 'STARTED'
  if (upper.includes('REQUIRES')) return 'REQUIRES_UNLOCK'
  if (upper.includes('NOT')) return 'NOT_STARTED'
  return 'UNKNOWN'
}

function normalizeDifficulty(value: number): QuestDifficulty | string {
  return DIFFICULTY_MAP[value] ?? `Tier ${value}`
}

export async function fetchPlayerQuests(username: string): Promise<PlayerProfile> {
  const trimmed = username.trim()
  if (!trimmed) {
    throw new Error('Enter a RuneScape display name to sync quest progress.')
  }

  const url = `https://apps.runescape.com/runemetrics/quests?user=${encodeURIComponent(trimmed)}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`RuneMetrics request failed (${response.status}). Try again in a moment.`)
  }

  const data = (await response.json()) as RuneMetricsResponse

  if (!Array.isArray(data.quests)) {
    throw new Error('Unexpected RuneMetrics response. The profile may be private or invalid.')
  }

  const quests: QuestSummary[] = data.quests.map((quest) => ({
    title: quest.title,
    status: normalizeStatus(quest.status),
    difficulty: normalizeDifficulty(quest.difficulty),
    members: quest.members,
    questPoints: quest.questPoints,
    userEligible: quest.userEligible
  }))

  return {
    username: trimmed,
    quests,
    fetchedAt: new Date().toISOString()
  }
}

export function getIncompleteQuests(quests: QuestSummary[]): QuestSummary[] {
  return quests.filter((quest) => quest.status !== 'COMPLETED')
}

export function getQuestPointsEarned(quests: QuestSummary[]): number {
  return quests
    .filter((quest) => quest.status === 'COMPLETED')
    .reduce((total, quest) => total + quest.questPoints, 0)
}

export function getQuestPointsAvailable(quests: QuestSummary[]): number {
  return quests.reduce((total, quest) => total + quest.questPoints, 0)
}
