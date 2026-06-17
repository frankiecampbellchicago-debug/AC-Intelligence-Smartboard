import { ALL_RESOURCES } from '@shared/levels'
import { Card } from '../components/ui'
import { LevelPill } from '../components/ui'
import { openExternal } from '../lib/util'
import { IconExternal } from '../components/icons'

export function Resources(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted">
        Every curated link from the cookbook, grouped by the level it belongs to. Opens in your
        browser.
      </p>
      {ALL_RESOURCES.map((group) => (
        <Card key={group.level} className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <LevelPill level={group.level} />
            <h3 className="font-semibold text-text">{group.title}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {group.links.map((link) => (
              <button
                key={link.url}
                onClick={() => openExternal(link.url)}
                className="group flex items-center justify-between rounded-xl border border-border bg-bg px-4 py-3 text-left transition hover:border-accent"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text group-hover:text-accent">
                    {link.label}
                  </div>
                  <div className="truncate text-xs text-subtle">
                    {link.url.replace(/^https?:\/\//, '')}
                  </div>
                </div>
                <IconExternal className="ml-2 h-4 w-4 shrink-0 text-subtle group-hover:text-accent" />
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
