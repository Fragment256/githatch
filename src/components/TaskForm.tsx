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
  outputType: 'issue_comment' | 'new_issue' | 'file'
  issueNumber: string
  filePath: string
}

interface Props {
  onSubmit: (yaml: string, slug: string, config: TaskConfig) => void
  loading?: boolean
}

const SCHEDULE_PRESETS = [
  { label: 'Manual only (no schedule)', value: '' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Daily 8am', value: '0 8 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Custom cron…', value: 'custom' },
] as const

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
  return { type: 'new_issue' }
}

export function TaskForm({ onSubmit, loading = false }: Props) {
  const [values, setValues] = useState<TaskFormValues>({
    name: '',
    schedule: '',
    customCron: '',
    provider: 'claude_oauth',
    prompt: '',
    outputType: 'issue_comment',
    issueNumber: '',
    filePath: '',
  })
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
      <h2 className="text-lg font-semibold text-gray-900">New task</h2>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Name */}
      <div>
        <label htmlFor="task-name" className="mb-1 block text-sm font-medium text-gray-700">
          Task name
        </label>
        <input
          id="task-name"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Weekly GSD digest"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        />
      </div>

      {/* Schedule */}
      <div>
        <label htmlFor="task-schedule" className="mb-1 block text-sm font-medium text-gray-700">
          Schedule
        </label>
        <select
          id="task-schedule"
          value={values.schedule}
          onChange={(e) => set('schedule', e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
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
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          />
        )}
      </div>

      {/* Provider */}
      <div>
        <label htmlFor="task-provider" className="mb-1 block text-sm font-medium text-gray-700">
          Provider
        </label>
        <select
          id="task-provider"
          value={values.provider}
          onChange={(e) => set('provider', e.target.value as 'claude_oauth')}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        >
          <option value="claude_oauth">Claude (OAuth)</option>
        </select>
      </div>

      {/* Prompt */}
      <div>
        <label htmlFor="task-prompt" className="mb-1 block text-sm font-medium text-gray-700">
          Prompt / instructions
        </label>
        <textarea
          id="task-prompt"
          value={values.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          rows={5}
          placeholder="Summarise the last week of Practice Thinkers actions and post as a comment on issue #42."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        />
      </div>

      {/* Output destination */}
      <div>
        <label htmlFor="task-output" className="mb-1 block text-sm font-medium text-gray-700">
          Output destination
        </label>
        <select
          id="task-output"
          value={values.outputType}
          onChange={(e) => set('outputType', e.target.value as TaskFormValues['outputType'])}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        >
          <option value="issue_comment">Comment on existing issue</option>
          <option value="new_issue">Create new issue</option>
          <option value="file">Commit to file</option>
        </select>

        {values.outputType === 'issue_comment' && (
          <input
            type="number"
            min="1"
            value={values.issueNumber}
            onChange={(e) => set('issueNumber', e.target.value)}
            placeholder="Issue number (e.g. 42)"
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          />
        )}

        {values.outputType === 'file' && (
          <input
            type="text"
            value={values.filePath}
            onChange={(e) => set('filePath', e.target.value)}
            placeholder="e.g. reports/weekly.md"
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create task'}
      </button>
    </form>
  )
}
