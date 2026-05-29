import { useEffect, useState, type ReactElement } from 'react'
import type { OverlayQuestState } from '@/types/quest'

export function OverlayPanel(): ReactElement {
  const [state, setState] = useState<OverlayQuestState | null>(null)

  useEffect(() => {
    const unsubscribe = window.rs3Companion.overlay.onState((next: OverlayQuestState) => {
      setState(next)
    })

    return unsubscribe
  }, [])

  if (!state) {
    return (
      <div className="overlay-shell">
        <div className="overlay-card overlay-card--empty">
          <p className="overlay-kicker">Quest Helper Overlay</p>
          <h2>Waiting for an active quest</h2>
          <p>Select a quest in RS3 Companion and click “Show Overlay”.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overlay-shell">
      <div className="overlay-card">
        <div className="overlay-header">
          <span className="overlay-kicker">Quest Helper</span>
          <span className="overlay-progress">
            Step {state.stepIndex + 1}/{state.totalSteps}
          </span>
        </div>
        <h2>{state.questTitle}</h2>
        <h3>{state.stepTitle}</h3>
        <p>{state.stepBody}</p>
      </div>
    </div>
  )
}
