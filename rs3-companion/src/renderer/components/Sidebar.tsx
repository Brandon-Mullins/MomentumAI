import type { ReactElement } from 'react'
import type { CompanionPlugin } from '@/plugins/registry'

interface SidebarProps {
  plugins: CompanionPlugin[]
  activePluginId: string
  onSelectPlugin: (id: string) => void
}

export function Sidebar({ plugins, activePluginId, onSelectPlugin }: SidebarProps): ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">RS3</div>
        <div>
          <strong>Companion</strong>
          <p>RuneLite-style toolkit</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {plugins.map((plugin) => (
          <button
            key={plugin.id}
            className={[
              'sidebar__nav-item',
              plugin.id === activePluginId ? 'sidebar__nav-item--active' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectPlugin(plugin.id)}
          >
            <span className="sidebar__nav-icon">{plugin.icon}</span>
            <span>
              <strong>{plugin.name}</strong>
              <small>{plugin.description}</small>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
