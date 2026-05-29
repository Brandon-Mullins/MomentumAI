import type { ReactElement } from 'react'
import type { PlayerProfile } from '@/types/quest'
import { getQuestPointsAvailable, getQuestPointsEarned } from '@/services/runemetrics'

interface TopBarProps {
  username: string
  profile: PlayerProfile | null
  loading: boolean
  error: string | null
  onUsernameChange: (value: string) => void
  onSync: () => void
}

export function TopBar({
  username,
  profile,
  loading,
  error,
  onUsernameChange,
  onSync
}: TopBarProps): ReactElement {
  const earned = profile ? getQuestPointsEarned(profile.quests) : 0
  const total = profile ? getQuestPointsAvailable(profile.quests) : 0

  return (
    <header className="topbar">
      <div>
        <p className="panel-kicker">Player sync</p>
        <h1>RuneScape 3 Companion</h1>
        <p className="topbar__subtitle">
          Quest helper, overlay guides, and plugin architecture inspired by RuneLite and Alt1.
        </p>
      </div>

      <div className="topbar__sync">
        <input
          className="input"
          placeholder="RuneScape display name"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSync()
          }}
        />
        <button className="button" disabled={loading} onClick={onSync}>
          {loading ? 'Syncing…' : 'Sync Quests'}
        </button>
      </div>

      <div className="topbar__stats">
        {profile ? (
          <>
            <Stat label="Profile" value={profile.username} />
            <Stat label="Quest points" value={`${earned} / ${total}`} />
            <Stat
              label="Last sync"
              value={new Date(profile.fetchedAt).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short'
              })}
            />
          </>
        ) : (
          <p className="muted">Sync a profile to highlight completed quests from RuneMetrics.</p>
        )}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
