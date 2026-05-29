import type { ReactElement } from 'react'
import type { QuestSummary } from '@/types/quest'
import type { QuestStatusFilter } from '@/services/storage'
import { difficultyRank } from '@/services/storage'

interface QuestListProps {
  quests: QuestSummary[]
  selectedTitle: string | null
  query: string
  statusFilter: QuestStatusFilter
  featuredTitles: string[]
  onQueryChange: (value: string) => void
  onStatusFilterChange: (value: QuestStatusFilter) => void
  onSelectQuest: (title: string) => void
}

export function QuestList({
  quests,
  selectedTitle,
  query,
  statusFilter,
  featuredTitles,
  onQueryChange,
  onStatusFilterChange,
  onSelectQuest
}: QuestListProps): ReactElement {
  const sorted = [...quests].sort((a, b) => {
    const featuredDelta =
      Number(featuredTitles.includes(b.title)) - Number(featuredTitles.includes(a.title))
    if (featuredDelta !== 0) return featuredDelta

    const difficultyDelta = difficultyRank(String(a.difficulty)) - difficultyRank(String(b.difficulty))
    if (difficultyDelta !== 0) return difficultyDelta

    return a.title.localeCompare(b.title)
  })

  return (
    <section className="panel quest-list-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Quest browser</p>
          <h2>{quests.length} quests</h2>
        </div>
      </div>

      <div className="quest-list-controls">
        <input
          className="input"
          placeholder="Search quests…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as QuestStatusFilter)}
        >
          <option value="all">All quests</option>
          <option value="incomplete">Incomplete</option>
          <option value="completed">Completed</option>
          <option value="eligible">Eligible to start</option>
        </select>
      </div>

      <div className="quest-list">
        {sorted.length === 0 ? (
          <p className="muted">No quests match your filters.</p>
        ) : (
          sorted.map((quest) => (
            <QuestListRow
              key={quest.title}
              quest={quest}
              selected={quest.title === selectedTitle}
              featured={featuredTitles.includes(quest.title)}
              onSelect={() => onSelectQuest(quest.title)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function QuestListRow({
  quest,
  selected,
  featured,
  onSelect
}: {
  quest: QuestSummary
  selected: boolean
  featured: boolean
  onSelect: () => void
}): ReactElement {
  return (
    <button
      className={['quest-row', selected ? 'quest-row--selected' : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <div className="quest-row__main">
        <strong>{quest.title}</strong>
        <span className="quest-row__meta">
          {quest.difficulty} · {quest.questPoints} QP · {quest.members ? 'Members' : 'Free'}
        </span>
      </div>
      <div className="quest-row__badges">
        {featured ? <span className="badge badge--gold">Guide ready</span> : null}
        <span className={`badge badge--${quest.status.toLowerCase()}`}>{formatStatus(quest.status)}</span>
      </div>
    </button>
  )
}

function formatStatus(status: QuestSummary['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'Done'
    case 'STARTED':
      return 'Started'
    case 'REQUIRES_UNLOCK':
      return 'Locked'
    case 'NOT_STARTED':
      return 'Not started'
    default:
      return 'Unknown'
  }
}
