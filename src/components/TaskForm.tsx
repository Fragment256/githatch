import { useState } from 'react'
import {
  generateWorkflowYaml,
  slugify,
  type TaskConfig,
  type OutputDestination,
  type Provider,
  PROVIDER_MODELS,
} from '@/lib/yamlGenerator'
import { describeCron, nextCronRuns, isValidCron } from '@/lib/cronLabel'
import { computeLineDiff } from '@/lib/utils'

export interface TaskFormValues {
  name: string
  schedule: string
  customCron: string
  provider: Provider
  model: string
  prompt: string
  outputType: 'issue_comment' | 'new_issue' | 'file' | 'pull_request' | 'agent_managed'
  issueNumber: string
  filePath: string
}

interface Props {
  onSubmit: (yaml: string, slug: string, config: TaskConfig) => void
  loading?: boolean
  initialConfig?: TaskConfig
  originalYaml?: string
  existingSlugs?: string[]
  isDuplicating?: boolean
}

const SCHEDULE_PRESETS = [
  { label: 'Manual only (no schedule)', value: '' },
  { label: 'Daily 8am UTC (weekdays)', value: '0 8 * * 1-5' },
  { label: 'Daily 8am UTC', value: '0 8 * * *' },
  { label: 'Every Monday 9am UTC', value: '0 9 * * 1' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Custom cron…', value: 'custom' },
] as const

const PROVIDER_OPTIONS: { value: Provider; label: string; secret: string }[] = [
  { value: 'claude_oauth', label: 'Claude (OAuth)', secret: 'CLAUDE_CODE_OAUTH_TOKEN' },
  { value: 'codex', label: 'Codex (OpenAI)', secret: 'OPENAI_API_KEY' },
  { value: 'synthetic', label: 'Synthetic ($30/mo flat)', secret: 'SYNTHETIC_API_KEY' },
]

function defaultModel(provider: Provider): string {
  return PROVIDER_MODELS[provider][0].value
}

const DEFAULT_VALUES: TaskFormValues = {
  name: '',
  schedule: '',
  customCron: '',
  provider: 'claude_oauth',
  model: defaultModel('claude_oauth'),
  prompt: '',
  outputType: 'issue_comment',
  issueNumber: '',
  filePath: '',
}

function configToFormValues(config: TaskConfig): TaskFormValues {
  const matchedPreset = SCHEDULE_PRESETS.find(
    (p) => p.value !== 'custom' && p.value === (config.schedule ?? ''),
  )
  const schedule = config.schedule ? (matchedPreset ? config.schedule : 'custom') : ''
  const customCron = !matchedPreset && config.schedule ? config.schedule : ''

  const dest = config.outputDestination
  const outputType = dest.type
  const issueNumber = dest.type === 'issue_comment' ? String(dest.issueNumber) : ''
  const filePath = dest.type === 'file' ? dest.filePath : ''

  return {
    name: config.name,
    schedule,
    customCron,
    provider: config.provider,
    model: config.model ?? defaultModel(config.provider),
    prompt: config.prompt,
    outputType,
    issueNumber,
    filePath,
  }
}

function buildOutputDestination(values: TaskFormValues): OutputDestination {
  if (values.outputType === 'issue_comment') {
    const n = parseInt(values.issueNumber, 10)
    if (!n || n < 1) throw new Error('Issue number must be a positive integer')
    return { type: 'issue_comment', issueNumber: n }
  }
  if (values.outputType === 'file') {
    if (!values.filePath.trim()) throw new Error('File path is required')
    return { type: 'file', filePath: values.filePath.trim() }
  }
  if (values.outputType === 'pull_request') return { type: 'pull_request' }
  if (values.outputType === 'agent_managed') return { type: 'agent_managed' }
  return { type: 'new_issue' }
}

function formatUTC(d: Date): string {
  const yr = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hr = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yr}-${mo}-${day} ${hr}:${min}`
}

function formatLocal(d: Date): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '??'
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

function SchedulePreview({ expr }: { expr: string }) {
  if (!expr) return null

  if (!isValidCron(expr)) {
    return <p className="mt-2 font-mono text-xs text-red-600">Invalid cron expression</p>
  }

  const runs = nextCronRuns(expr, 3)
  if (runs.length === 0) {
    return (
      <p className="mt-2 font-mono text-xs text-black/60">
        Schedule preview not available for day-of-month or month-specific expressions.
      </p>
    )
  }
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const showLocal = localTz !== 'UTC'

  return (
    <div className="mt-2 font-mono text-xs text-black/60">
      <div className="mb-1 flex gap-6 font-semibold text-black/80">
        <span className="w-36">Next runs (UTC)</span>
        {showLocal && <span>{localTz}</span>}
      </div>
      {runs.map((d, i) => (
        <div key={i} className="flex gap-6">
          <span className="w-36">{formatUTC(d)}</span>
          {showLocal && <span>{formatLocal(d)}</span>}
        </div>
      ))}
    </div>
  )
}

interface PendingSubmit {
  yaml: string
  slug: string
  config: TaskConfig
}

export function TaskForm({
  onSubmit,
  loading = false,
  initialConfig,
  originalYaml,
  existingSlugs = [],
  isDuplicating = false,
}: Props) {
  const isEditing = !!initialConfig && !isDuplicating
  const [values, setValues] = useState<TaskFormValues>(() =>
    initialConfig ? configToFormValues(initialConfig) : DEFAULT_VALUES,
  )
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState<'form' | 'preview'>('form')
  const [pending, setPending] = useState<PendingSubmit | null>(null)

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const resolvedSchedule = values.schedule === 'custom' ? values.customCron.trim() : values.schedule
  const customCronInvalid =
    values.schedule === 'custom' && resolvedSchedule.length > 0 && !isValidCron(resolvedSchedule)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!values.name.trim()) return setError('Task name is required')
    if (!values.prompt.trim()) return setError('Prompt is required')

    const slugCandidate = slugify(values.name.trim())
    if (!slugCandidate)
      return setError('Task name must contain at least one letter, number, or hyphen.')
    if (existingSlugs.includes(slugCandidate)) {
      return setError(
        `A task already exists with this name ("${slugCandidate}"). Choose a different name — submitting would overwrite the existing task's workflow.`,
      )
    }

    let outputDestination: OutputDestination
    try {
      outputDestination = buildOutputDestination(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid output configuration')
      return
    }

    const config: TaskConfig = {
      name: values.name.trim(),
      schedule: resolvedSchedule || undefined,
      provider: values.provider,
      model: values.model || undefined,
      prompt: values.prompt.trim(),
      outputDestination,
    }

    const yaml = generateWorkflowYaml(config)
    const slug = slugify(config.name)
    setPending({ yaml, slug, config })
    setViewState('preview')
  }

  const handleConfirmCommit = () => {
    if (pending) onSubmit(pending.yaml, pending.slug, pending.config)
  }

  const handleBackToEdit = () => {
    setViewState('form')
  }

  if (viewState === 'preview' && pending) {
    const diff = originalYaml ? computeLineDiff(originalYaml, pending.yaml) : null
    const hasDiff = diff?.some((l) => l.type !== ' ')

    return (
      <div className="flex w-full max-w-lg flex-col gap-5">
        <h2 className="font-display text-2xl font-bold tracking-tight">Review YAML</h2>

        {diff && hasDiff && (
          <div>
            <p className="mb-1 font-mono text-xs tracking-widest text-black uppercase">Changes</p>
            <div
              data-testid="yaml-diff"
              className="max-h-48 overflow-auto border-2 border-black bg-white p-3 font-mono text-xs leading-relaxed"
            >
              {diff.map((l, idx) => (
                <div
                  key={idx}
                  className={
                    l.type === '+'
                      ? 'text-black'
                      : l.type === '-'
                        ? 'text-black/40 line-through'
                        : 'text-black/50'
                  }
                >
                  {l.type}
                  {l.line}
                </div>
              ))}
            </div>
          </div>
        )}

        {diff && !hasDiff && (
          <p className="font-mono text-xs text-black/50">No changes from current file.</p>
        )}

        <div>
          <p className="mb-1 font-mono text-xs tracking-widest text-black uppercase">
            YAML to be committed
          </p>
          <pre
            data-testid="yaml-preview"
            className="max-h-80 overflow-auto border-2 border-black bg-white p-3 font-mono text-xs leading-relaxed whitespace-pre"
          >
            {pending.yaml}
          </pre>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBackToEdit}
            className="border-2 border-black px-4 py-3 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
          >
            ← Edit
          </button>
          <button
            type="button"
            onClick={handleConfirmCommit}
            disabled={loading}
            className="flex-1 border-2 border-black bg-black px-4 py-3 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
          >
            {loading ? 'Committing…' : 'Commit to repo'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-5">
      <h2 className="font-display text-2xl font-bold tracking-tight">
        {isEditing ? 'Edit task' : 'New task'}
      </h2>

      {error && <div className="border-2 border-black px-4 py-3 text-sm">{error}</div>}

      {/* Name */}
      <div>
        <label
          htmlFor="task-name"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Task name
        </label>
        <input
          id="task-name"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Weekly GSD digest"
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Schedule */}
      <div>
        <label
          htmlFor="task-schedule"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Schedule
        </label>
        <select
          id="task-schedule"
          value={values.schedule}
          onChange={(e) => set('schedule', e.target.value)}
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        >
          {SCHEDULE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {values.schedule === 'custom' && (
          <input
            type="text"
            value={values.customCron}
            onChange={(e) => set('customCron', e.target.value)}
            placeholder="e.g. 0 9 * * 1"
            className="mt-2 block w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm focus:outline-none"
          />
        )}
        {values.schedule && values.schedule !== 'custom' && (
          <p className="mt-1 font-mono text-xs text-black/40">cron: {values.schedule}</p>
        )}
        {values.schedule === 'custom' && values.customCron.trim() && !customCronInvalid && (
          <p className="mt-1 font-mono text-xs text-black/40">
            {describeCron(values.customCron.trim())}
          </p>
        )}
        <SchedulePreview expr={resolvedSchedule} />
      </div>

      {/* Provider */}
      <div>
        <label
          htmlFor="task-provider"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Provider
        </label>
        <select
          id="task-provider"
          value={values.provider}
          onChange={(e) => {
            const p = e.target.value as Provider
            setValues((v) => ({ ...v, provider: p, model: defaultModel(p) }))
          }}
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        >
          {PROVIDER_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 font-mono text-xs text-black/50">
          Requires repo secret:{' '}
          <span className="font-semibold">
            {PROVIDER_OPTIONS.find((p) => p.value === values.provider)?.secret}
          </span>
        </p>
      </div>

      {/* Model */}
      {PROVIDER_MODELS[values.provider].length > 1 && (
        <div>
          <label
            htmlFor="task-model"
            className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
          >
            Model
          </label>
          <select
            id="task-model"
            value={values.model}
            onChange={(e) => set('model', e.target.value)}
            className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
          >
            {PROVIDER_MODELS[values.provider].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label
          htmlFor="task-prompt"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Prompt / instructions
        </label>
        <textarea
          id="task-prompt"
          value={values.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          rows={5}
          placeholder="Summarise the last week of Practice Thinkers actions and post as a comment on issue #42."
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Output destination */}
      <div>
        <label
          htmlFor="task-output"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Output destination
        </label>
        <select
          id="task-output"
          value={values.outputType}
          onChange={(e) => set('outputType', e.target.value as TaskFormValues['outputType'])}
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="issue_comment">Comment on existing issue</option>
          <option value="new_issue">Create new issue</option>
          <option value="file">Commit to file</option>
          <option value="pull_request">Open pull request</option>
          <option value="agent_managed">Agent-managed</option>
        </select>

        {values.outputType === 'issue_comment' && (
          <input
            type="number"
            min="1"
            value={values.issueNumber}
            onChange={(e) => set('issueNumber', e.target.value)}
            placeholder="Issue number (e.g. 42)"
            className="mt-2 block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
          />
        )}

        {values.outputType === 'file' && (
          <>
            <input
              type="text"
              value={values.filePath}
              onChange={(e) => set('filePath', e.target.value)}
              placeholder="e.g. reports/weekly.md"
              className="mt-2 block w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm focus:outline-none"
            />
            {values.filePath.trim().endsWith('/') && (
              <p className="mt-1 font-mono text-xs text-black/50">
                Directory path — each run creates a new dated file (e.g. {values.filePath.trim()}
                YYYY-MM-DD-report.md)
              </p>
            )}
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || customCronInvalid}
        className="border-2 border-black bg-black px-4 py-3 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
      >
        {loading
          ? isEditing
            ? 'Saving…'
            : 'Creating…'
          : isEditing
            ? 'Save changes'
            : 'Create task'}
      </button>
    </form>
  )
}
