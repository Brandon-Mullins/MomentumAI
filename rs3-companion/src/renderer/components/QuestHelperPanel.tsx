import type { ReactElement } from 'react'
import type { QuestStep, QuestWalkthrough } from '@/types/quest'

interface QuestHelperPanelProps {
  walkthrough: QuestWalkthrough | null
  activeStepIndex: number
  loading: boolean
  error: string | null
  overlayOpen: boolean
  onSelectStep: (index: number) => void
  onCompleteStep: () => void
  onResetProgress: () => void
  onToggleOverlay: () => void
  onRefresh: () => void
}

export function QuestHelperPanel({
  walkthrough,
  activeStepIndex,
  loading,
  error,
  overlayOpen,
  onSelectStep,
  onCompleteStep,
  onResetProgress,
  onToggleOverlay,
  onRefresh
}: QuestHelperPanelProps): ReactElement {
  if (loading) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>Quest Helper</h2>
        </div>
        <p className="muted">Loading walkthrough from the RuneScape Wiki…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>Quest Helper</h2>
          <button className="button button--ghost" onClick={onRefresh}>
            Retry
          </button>
        </div>
        <p className="error-text">{error}</p>
      </section>
    )
  }

  if (!walkthrough) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>Quest Helper</h2>
        </div>
        <p className="muted">Pick a quest from the list to load a step-by-step guide.</p>
      </section>
    )
  }

  const activeStep = walkthrough.steps[activeStepIndex]
  const isLastStep = activeStepIndex >= walkthrough.steps.length - 1

  return (
    <section className="panel quest-helper">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Active guide</p>
          <h2>{walkthrough.title}</h2>
        </div>
        <div className="panel-actions">
          <button className="button button--ghost" onClick={onToggleOverlay}>
            {overlayOpen ? 'Hide Overlay' : 'Show Overlay'}
          </button>
          <a className="button button--ghost" href={walkthrough.wikiUrl} target="_blank" rel="noreferrer">
            Wiki
          </a>
        </div>
      </div>

      {walkthrough.description ? <p className="quest-description">{walkthrough.description}</p> : null}

      {walkthrough.requirements.length > 0 ? (
        <div className="chip-row">
          {walkthrough.requirements.map((item) => (
            <span className="chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="quest-helper-grid">
        <div className="step-list">
          {walkthrough.steps.map((step, index) => (
            <StepListItem
              key={step.id}
              step={step}
              index={index}
              active={index === activeStepIndex}
              completed={index < activeStepIndex}
              onSelect={() => onSelectStep(index)}
            />
          ))}
        </div>

        <article className="step-detail">
          <p className="panel-kicker">
            Step {activeStepIndex + 1} of {walkthrough.steps.length}
          </p>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.body}</p>
          <div className="step-detail-actions">
            <button className="button" onClick={onCompleteStep}>
              {isLastStep ? 'Mark Quest Complete' : 'Complete Step'}
            </button>
            <button className="button button--ghost" onClick={onResetProgress}>
              Reset Progress
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}

function StepListItem({
  step,
  index,
  active,
  completed,
  onSelect
}: {
  step: QuestStep
  index: number
  active: boolean
  completed: boolean
  onSelect: () => void
}): ReactElement {
  return (
    <button
      className={[
        'step-list-item',
        active ? 'step-list-item--active' : '',
        completed ? 'step-list-item--completed' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
    >
      <span className="step-list-item__index">{index + 1}</span>
      <span>{step.title}</span>
    </button>
  )
}
