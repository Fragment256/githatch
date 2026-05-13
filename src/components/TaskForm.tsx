import { useState } from 'react'
import {
  generateWorkflowYaml,
  slugify,
  type TaskConfig,
  type OutputDestination,
} from '@/lib/yamlGenerator'

export interface TaskFormValues {
  name: string
  schedule: string
  customCron: string
  provider: 'claude_oauth'
  prompt: string
  outputType: 'issue_comment' | 'new_issue' | 'file' | 'pull_request' | 'agent_managed'
  issueNumber: string
  filePath: string
}

interface Props {
  onSubmit: (yaml: string, slug: string, config: TaskConfig) => void
  loading?: boolean
  initialConfig?: TaskConfig
}

const SCHEDULE_PRESETS = [
  { label: 'Manual only (no schedule)', value: '' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Daily 8am', value: '0 8 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Custom cron…', value: 'custom' },
] as const

const DEFAULT_VALUES: TaskFormValues = {
  name: '',
  schedule: '',
  customCron: '',
  provider: 'claude_oauth',
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

export function TaskForm({ onSubmit, loading = false, initialConfig }: Props) {
  const isEditing = !!initialConfig
  const [values, setValues] = useState<TaskFormValues>(() =>
    initialConfig ? configToFormValues(initialConfig) : DEFAULT_VALUES,
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const resolvedSchedule = values.schedule === 'custom' ? values.customCron.trim() : values.schedule

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!values.name.trim()) return setError('Task name is required')
    if (!values.prompt.trim()) return setError('Prompt is required')

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
      prompt: values.prompt.trim(),
      outputDestination,
    }

    const yaml = generateWorkflowYaml(config)
    const slug = slugify(config.name)
    onSubmit(yaml, slug, config)
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
          onChange={(e) => set('provider', e.target.value as 'claude_oauth')}
          className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="claude_oauth">Claude (OAuth)</option>
        </select>
      </div>

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
          <input
            type="text"
            value={values.filePath}
            onChange={(e) => set('filePath', e.target.value)}
            placeholder="e.g. reports/weekly.md"
            className="mt-2 block w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm focus:outline-none"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
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
