import { useState } from 'react'
import { useStore, type NewProjectInput } from '../store/useStore'
import { Card, Button, StatusBadge, LevelPill, CategoryBadge } from '../components/ui'
import { LEVELS, TOTAL_LEVELS } from '@shared/levels'
import {
  PROJECT_STATUSES,
  STATUS_LABELS,
  PROJECT_CATEGORIES,
  CATEGORY_LABELS,
  type Project,
  type ProjectStatus,
  type ProjectCategory
} from '@shared/types'
import { openExternal, revealPath, relativeTime, cn } from '../lib/util'
import { SitePreview } from '../components/SitePreview'
import {
  IconPlus,
  IconExternal,
  IconGit,
  IconFolder,
  IconTrash,
  IconChevronLeft,
  IconCheck,
  IconCode
} from '../components/icons'

/* ----------------------------- Add / Edit modal ---------------------------- */

export function ProjectForm({
  initial,
  onSave,
  onClose
}: {
  initial?: Project
  onSave: (data: NewProjectInput) => void
  onClose: () => void
}): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'planning')
  const [category, setCategory] = useState<ProjectCategory>(initial?.category ?? 'website')
  const [currentLevel, setCurrentLevel] = useState(initial?.currentLevel ?? 1)
  const [liveUrl, setLiveUrl] = useState(initial?.liveUrl ?? '')
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '')
  const [localPath, setLocalPath] = useState(initial?.localPath ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const field =
    'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent'
  const labelCls = 'mb-1.5 block text-xs font-semibold text-muted'

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name, status, category, currentLevel, liveUrl, repoUrl, localPath, notes })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      onClick={onClose}
    >
      <Card interactive={false} className="w-full max-w-lg p-5" >
        <form onClick={(e) => e.stopPropagation()} onSubmit={submit}>
          <h2 className="mb-4 text-lg font-bold text-text">
            {initial ? 'Edit site' : 'Add a site'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Site name</label>
              <input
                autoFocus
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Contracting"
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={field}
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
              >
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={field}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Current level</label>
                <select
                  className={field}
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(Number(e.target.value))}
                >
                  {LEVELS.map((l) => (
                    <option key={l.number} value={l.number}>
                      L{l.number} — {l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Live URL</label>
              <input
                className={field}
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://acme.com"
              />
            </div>
            <div>
              <label className={labelCls}>Repo URL</label>
              <input
                className={field}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/you/acme"
              />
            </div>
            <div>
              <label className={labelCls}>Local path</label>
              <input
                className={field}
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="/Users/kaiden/Sites/acme"
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={cn(field, 'min-h-20 resize-y')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {initial ? 'Save changes' : 'Add site'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/* ------------------------------- Detail view ------------------------------- */

function LinkChip({
  label,
  onClick,
  Icon
}: {
  label: string
  onClick: () => void
  Icon: (p: { className?: string }) => React.JSX.Element
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-border-strong hover:text-accent"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function ProjectDetail({ project }: { project: Project }): React.JSX.Element {
  const setView = useStore((s) => s.setView)
  const setSelected = (id: string | null): void =>
    useStore.setState({ selectedProjectId: id })
  const updateProject = useStore((s) => s.updateProject)
  const removeProject = useStore((s) => s.removeProject)
  const toggleSkill = useStore((s) => s.toggleSkill)
  const openStudio = useStore((s) => s.openStudio)
  const [editing, setEditing] = useState(false)

  function back(): void {
    setSelected(null)
    setView('hub')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button
        onClick={back}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-text"
      >
        <IconChevronLeft className="h-4 w-4" /> Back to GitHub
      </button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-text">{project.name}</h2>
              <StatusBadge status={project.status} />
              <CategoryBadge category={project.category} />
            </div>
            <div className="mt-1 text-sm text-muted">
              Level {project.currentLevel} of {TOTAL_LEVELS} ·{' '}
              {LEVELS[project.currentLevel - 1].title} · updated{' '}
              {relativeTime(project.updatedAt)}
            </div>
          </div>
          <div className="flex gap-2">
            {(project.repoFullName || project.localPath) && (
              <Button onClick={() => openStudio(project.id)}>
                <IconCode className="h-4 w-4" /> Edit code
              </Button>
            )}
            <Button variant="subtle" onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                  removeProject(project.id)
                }
              }}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-2">
          {project.liveUrl && (
            <LinkChip
              label="Live site"
              Icon={IconExternal}
              onClick={() => openExternal(project.liveUrl)}
            />
          )}
          {project.repoUrl && (
            <LinkChip label="Repo" Icon={IconGit} onClick={() => openExternal(project.repoUrl)} />
          )}
          {project.localPath && (
            <LinkChip
              label="Local folder"
              Icon={IconFolder}
              onClick={() => revealPath(project.localPath)}
            />
          )}
          {!project.liveUrl && !project.repoUrl && !project.localPath && (
            <span className="text-xs text-subtle">No links yet — add them via Edit.</span>
          )}
        </div>

        {project.notes && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-bg p-4 text-sm text-text">
            {project.notes}
          </p>
        )}
      </Card>

      {/* Level progress */}
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold text-text">Level progress</h3>
          <button
            onClick={() => setView('wizard')}
            className="text-xs font-medium text-accent hover:underline"
          >
            Open the wizard
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Tick the skills you've mastered for this site. The level you're on is set via Edit.
        </p>
        <div className="space-y-2">
          {LEVELS.map((level) => {
            const checked = project.levelProgress[String(level.number)] ?? []
            const isCurrent = level.number === project.currentLevel
            const done = checked.length === level.skills.length
            return (
              <div
                key={level.number}
                className={cn(
                  'rounded-xl border p-4 transition',
                  isCurrent ? 'border-accent bg-accent-soft/40' : 'border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <LevelPill level={level.number} />
                  <span className="text-sm font-semibold text-text">{level.title}</span>
                  {done && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green">
                      <IconCheck className="h-3.5 w-3.5" /> complete
                    </span>
                  )}
                  {isCurrent && !done && (
                    <span className="ml-auto text-xs font-medium text-accent">current</span>
                  )}
                </div>
                <div className="mt-3 space-y-1.5">
                  {level.skills.map((skill) => {
                    const on = checked.includes(skill.id)
                    return (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(project.id, level.number, skill.id)}
                        className="flex w-full items-center gap-2.5 text-left text-sm text-text"
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                            on
                              ? 'border-accent bg-accent text-white'
                              : 'border-border-strong text-transparent'
                          )}
                        >
                          <IconCheck className="h-3 w-3" />
                        </span>
                        <span className={on ? 'text-muted line-through' : ''}>{skill.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {editing && (
        <ProjectForm
          initial={project}
          onClose={() => setEditing(false)}
          onSave={(data) => {
            // Editing details is a deliberate category choice — lock it from re-sync.
            updateProject(project.id, { ...data, categoryLocked: true })
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------- List view -------------------------------- */

function SiteCard({ project }: { project: Project }): React.JSX.Element {
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)
  const canEdit = Boolean(project.repoFullName || project.localPath)
  return (
    <Card className="group overflow-hidden">
      <div className="relative">
        <SitePreview url={project.liveUrl} />
        {/* click overlay (preview itself is non-interactive) */}
        <button
          onClick={() => openProject(project.id)}
          className="absolute inset-0 transition group-hover:bg-accent/5"
          aria-label={`Open ${project.name}`}
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StatusBadge status={project.status} />
          <CategoryBadge category={project.category} />
        </div>
        {project.source === 'github' && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
            <IconGit className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate font-semibold text-text">{project.name}</h3>
          <LevelPill level={project.currentLevel} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
          {project.language && <span>{project.language}</span>}
          {project.language && <span>·</span>}
          <span>updated {relativeTime(project.updatedAt)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {canEdit && (
            <button
              onClick={() => openStudio(project.id)}
              className="bg-brand inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-95"
            >
              <IconCode className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {project.liveUrl && (
            <button
              onClick={() => openExternal(project.liveUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
            >
              <IconExternal className="h-3.5 w-3.5" /> Live
            </button>
          )}
          {project.repoUrl && (
            <button
              onClick={() => openExternal(project.repoUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
            >
              <IconGit className="h-3.5 w-3.5" /> Repo
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function Projects(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const selectedId = useStore((s) => s.selectedProjectId)
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)
  const addProject = useStore((s) => s.addProject)
  const githubStatus = useStore((s) => s.githubStatus)
  const githubSyncing = useStore((s) => s.githubSyncing)
  const syncFromGitHub = useStore((s) => s.syncFromGitHub)
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState<'gallery' | 'list'>('gallery')

  const selected = projects.find((p) => p.id === selectedId) ?? null
  if (selected) return <ProjectDetail project={selected} />

  const connected = githubStatus?.connected

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {projects.length} {projects.length === 1 ? 'site' : 'sites'} tracked
        </p>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex rounded-lg border border-border bg-bg p-0.5">
            {(['gallery', 'list'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition',
                  mode === m ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {connected && (
            <Button variant="subtle" onClick={() => void syncFromGitHub()} disabled={githubSyncing}>
              <IconGit className="h-4 w-4" /> {githubSyncing ? 'Syncing…' : 'Sync GitHub'}
            </Button>
          )}
          <Button onClick={() => setAdding(true)}>
            <IconPlus className="h-4 w-4" /> Add site
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-text">No sites yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {connected
              ? 'Sync your GitHub repos to pull in your sites, or add one manually.'
              : 'Add your first website to track it through the 7 levels.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {connected && (
              <Button onClick={() => void syncFromGitHub()} disabled={githubSyncing}>
                <IconGit className="h-4 w-4" /> {githubSyncing ? 'Syncing…' : 'Sync from GitHub'}
              </Button>
            )}
            <Button variant={connected ? 'subtle' : 'primary'} onClick={() => setAdding(true)}>
              <IconPlus className="h-4 w-4" /> Add a site
            </Button>
          </div>
        </Card>
      ) : mode === 'gallery' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <SiteCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-6 py-3 font-medium">Site</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Level</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Links</th>
                <th className="px-6 py-3 font-medium">Updated</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="cursor-pointer border-b border-border last:border-0 transition hover:bg-bg"
                >
                  <td className="px-6 py-4 font-medium text-text">{p.name}</td>
                  <td className="px-6 py-4">
                    <CategoryBadge category={p.category} />
                  </td>
                  <td className="px-6 py-4">
                    <LevelPill level={p.currentLevel} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 text-subtle">
                      {p.liveUrl && <IconExternal className="h-4 w-4" />}
                      {p.repoUrl && <IconGit className="h-4 w-4" />}
                      {p.localPath && <IconFolder className="h-4 w-4" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted">{relativeTime(p.updatedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    {(p.repoFullName || p.localPath) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openStudio(p.id)
                        }}
                        className="bg-brand inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-95"
                      >
                        <IconCode className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {adding && (
        <ProjectForm
          onClose={() => setAdding(false)}
          onSave={(data) => {
            addProject(data)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}
