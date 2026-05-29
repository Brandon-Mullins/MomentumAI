import { featuredQuestTitles, getStarterWalkthrough } from '@/data/starterQuests'
import { fetchPlayerQuests } from '@/services/runemetrics'
import {
  filterQuests,
  loadCachedProfile,
  loadQuestProgress,
  loadSettings,
  saveCachedProfile,
  saveSettings,
  upsertQuestProgress,
  type QuestStatusFilter
} from '@/services/storage'
import { fetchQuestWalkthrough } from '@/services/wiki'
import type { OverlayQuestState, PlayerProfile, QuestSummary, QuestWalkthrough } from '@/types/quest'
import { QuestHelperPanel } from '@/components/QuestHelperPanel'
import { QuestList } from '@/components/QuestList'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { registeredPlugins } from '@/plugins/registry'
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'

function buildFallbackQuests(): QuestSummary[] {
  return featuredQuestTitles.map((title) => ({
    title,
    status: 'NOT_STARTED',
    difficulty: 'Novice',
    members: false,
    questPoints: 1,
    userEligible: true
  }))
}

function buildOverlayState(
  walkthrough: QuestWalkthrough,
  stepIndex: number
): OverlayQuestState {
  const step = walkthrough.steps[stepIndex]
  return {
    questTitle: walkthrough.title,
    stepIndex,
    totalSteps: walkthrough.steps.length,
    stepTitle: step.title,
    stepBody: step.body
  }
}

export default function App(): ReactElement {
  const [settings, setSettings] = useState(loadSettings)
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadCachedProfile())
  const [quests, setQuests] = useState<QuestSummary[]>(
    () => loadCachedProfile()?.quests ?? buildFallbackQuests()
  )
  const [selectedQuestTitle, setSelectedQuestTitle] = useState<string | null>(
    settings.pinnedQuestTitle ?? featuredQuestTitles[0] ?? null
  )
  const [walkthrough, setWalkthrough] = useState<QuestWalkthrough | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuestStatusFilter>('incomplete')
  const [activePluginId, setActivePluginId] = useState('quest-helper')
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [guideLoading, setGuideLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [guideError, setGuideError] = useState<string | null>(null)

  const enabledPlugins = useMemo(
    () => registeredPlugins.filter((entry) => settings.enabledPluginIds.includes(entry.plugin.id)),
    [settings.enabledPluginIds]
  )

  const filteredQuests = useMemo(
    () => filterQuests(quests, query, statusFilter),
    [quests, query, statusFilter]
  )

  const pushOverlayState = useCallback(
    (nextWalkthrough: QuestWalkthrough, stepIndex: number) => {
      if (!overlayOpen) return
      window.rs3Companion.overlay.update(buildOverlayState(nextWalkthrough, stepIndex))
    },
    [overlayOpen]
  )

  const loadQuestGuide = useCallback(
    async (title: string) => {
      setGuideLoading(true)
      setGuideError(null)

      try {
        const cached = getStarterWalkthrough(title)
        const loaded = cached ?? (await fetchQuestWalkthrough(title))
        const savedProgress = loadQuestProgress()[title]
        const stepIndex = Math.min(
          savedProgress?.activeStepIndex ?? 0,
          Math.max(loaded.steps.length - 1, 0)
        )

        setWalkthrough(loaded)
        setActiveStepIndex(stepIndex)
        pushOverlayState(loaded, stepIndex)
      } catch (error) {
        setWalkthrough(null)
        setGuideError(error instanceof Error ? error.message : 'Failed to load quest guide.')
      } finally {
        setGuideLoading(false)
      }
    },
    [pushOverlayState]
  )

  useEffect(() => {
    if (!selectedQuestTitle) return
    void loadQuestGuide(selectedQuestTitle)
  }, [selectedQuestTitle, loadQuestGuide])

  useEffect(() => {
    const unsubscribe = window.rs3Companion.overlay.onClosed(() => {
      setOverlayOpen(false)
    })
    return unsubscribe
  }, [])

  const handleSync = async (): Promise<void> => {
    setSyncLoading(true)
    setSyncError(null)

    try {
      const nextProfile = await fetchPlayerQuests(settings.username)
      setProfile(nextProfile)
      setQuests(nextProfile.quests)
      saveCachedProfile(nextProfile)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Failed to sync quest data.')
    } finally {
      setSyncLoading(false)
    }
  }

  const handleSelectQuest = (title: string): void => {
    setSelectedQuestTitle(title)
    const nextSettings = { ...settings, pinnedQuestTitle: title }
    setSettings(nextSettings)
    saveSettings(nextSettings)
  }

  const handleCompleteStep = (): void => {
    if (!walkthrough) return

    const nextIndex = Math.min(activeStepIndex + 1, walkthrough.steps.length - 1)
    setActiveStepIndex(nextIndex)
    upsertQuestProgress({
      questTitle: walkthrough.title,
      completedStepIds: walkthrough.steps.slice(0, nextIndex + 1).map((step) => step.id),
      activeStepIndex: nextIndex,
      startedAt: loadQuestProgress()[walkthrough.title]?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    pushOverlayState(walkthrough, nextIndex)
  }

  const handleSelectStep = (index: number): void => {
    if (!walkthrough) return
    setActiveStepIndex(index)
    pushOverlayState(walkthrough, index)
  }

  const handleResetProgress = (): void => {
    if (!walkthrough) return
    setActiveStepIndex(0)
    upsertQuestProgress({
      questTitle: walkthrough.title,
      completedStepIds: [],
      activeStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    pushOverlayState(walkthrough, 0)
  }

  const handleToggleOverlay = async (): Promise<void> => {
    if (overlayOpen) {
      await window.rs3Companion.overlay.close()
      setOverlayOpen(false)
      return
    }

    await window.rs3Companion.overlay.open()
    setOverlayOpen(true)

    if (walkthrough) {
      window.rs3Companion.overlay.update(buildOverlayState(walkthrough, activeStepIndex))
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        plugins={enabledPlugins.map((entry) => entry.plugin)}
        activePluginId={activePluginId}
        onSelectPlugin={setActivePluginId}
      />

      <main className="app-main">
        <TopBar
          username={settings.username}
          profile={profile}
          loading={syncLoading}
          error={syncError}
          onUsernameChange={(username) => {
            const nextSettings = { ...settings, username }
            setSettings(nextSettings)
            saveSettings(nextSettings)
          }}
          onSync={() => void handleSync()}
        />

        {activePluginId === 'quest-helper' ? (
          <div className="content-grid">
            <QuestList
              quests={filteredQuests}
              selectedTitle={selectedQuestTitle}
              query={query}
              statusFilter={statusFilter}
              featuredTitles={featuredQuestTitles}
              onQueryChange={setQuery}
              onStatusFilterChange={setStatusFilter}
              onSelectQuest={handleSelectQuest}
            />
            <QuestHelperPanel
              walkthrough={walkthrough}
              activeStepIndex={activeStepIndex}
              loading={guideLoading}
              error={guideError}
              overlayOpen={overlayOpen}
              onSelectStep={handleSelectStep}
              onCompleteStep={handleCompleteStep}
              onResetProgress={handleResetProgress}
              onToggleOverlay={() => void handleToggleOverlay()}
              onRefresh={() => {
                if (selectedQuestTitle) void loadQuestGuide(selectedQuestTitle)
              }}
            />
          </div>
        ) : (
          <section className="panel coming-soon">
            <h2>{registeredPlugins.find((entry) => entry.plugin.id === activePluginId)?.plugin.name}</h2>
            <p className="muted">
              This plugin slot is reserved for future Alt1-style tools. The core plugin loader and overlay
              shell are already wired up.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
