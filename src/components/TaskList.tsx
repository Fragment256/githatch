import { useState, useEffect } from 'react'
import type { GithatchTask, WorkflowRun } from '@/lib/workflows'
import { triggerWorkflow, getWorkflowRuns, updateWorkflowSchedule } from '@/lib/workflows'
import { deleteWorkflowFile } from '@/lib/github'

const SCHEDULE_OPTIONS = [
  { label: 'Remove schedule', value: '' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Daily 8am', value: '0 8 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Custom cron…', value: 'custom' },
]

interface Props {
  tasks: GithatchTask[]
  token: string
  owner: string
  repo: string
  defaultBranch: string
  loading: boolean
  error: string | null
  onRefresh: () => void
}

function RunStatus({ run }: { run: WorkflowRun }) {
  if (run.status !== 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        {run.status === 'queued' ? 'Queued' : 'Running'}
      </span>
    )
  }
  if (run.conclusion === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {run.conclusion ?? 'Failed'}
    </span>
  )
}

function RunHistoryPanel({
  task,
  token,
  owner,
  repo,
  defaultBranch,
  onClose,
}: {
  task: GithatchTask
  token: string
  owner: string
  repo: string
  defaultBranch: string
  onClose: () => void
}) {
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [runsError, setRunsError] = useState<string | null>(null)

  const fetchRuns = () => {
    if (!task.workflowId) return
    setLoadingRuns(true)
    setRunsError(null)
    getWorkflowRuns({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
      .then(setRuns)
      .catch((err: unknown) =>
        setRunsError(err instanceof Error ? err.message : 'Failed to load runs'),
      )
      .finally(() => setLoadingRuns(false))
  }

  useEffect(() => {
    fetchRuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Run history</span>
        <div className="flex gap-2">
          <button
            onClick={fetchRuns}
            disabled={loadingRuns}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            Refresh
          </button>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>
      </div>
      {loadingRuns && <p className="text-xs text-gray-500">Loading…</p>}
      {runsError && <p className="text-xs text-red-600">{runsError}</p>}
      {runs && runs.length === 0 && (
        <p className="text-xs text-gray-500">No runs yet for this workflow.</p>
      )}
      {runs && runs.length > 0 && (
        <ul className="space-y-1.5">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between">
              <RunStatus run={run} />
              <span className="text-xs text-gray-400">
                {new Date(run.createdAt).toLocaleString()}
              </span>
              <a
                href={run.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                View logs
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScheduleEditPanel({
  task,
  token,
  owner,
  repo,
  onClose,
  onSaved,
}: {
  task: GithatchTask
  token: string
  owner: string
  repo: string
  onClose: () => void
  onSaved: () => void
}) {
  const currentPreset =
    SCHEDULE_OPTIONS.find((o) => o.value === task.schedule) && task.schedule !== ''
      ? task.schedule
      : task.schedule
        ? 'custom'
        : ''
  const [selected, setSelected] = useState(currentPreset)
  const [customCron, setCustomCron] = useState(
    task.schedule && !SCHEDULE_OPTIONS.find((o) => o.value === task.schedule) ? task.schedule : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedSchedule =
    selected === 'custom' ? customCron.trim() || undefined : selected || undefined

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateWorkflowSchedule({ token, owner, repo, task, schedule: resolvedSchedule })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule')
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4">
      <p className="mb-2 text-sm font-medium text-gray-700">Edit schedule</p>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
      >
        {SCHEDULE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {selected === 'custom' && (
        <input
          type="text"
          value={customCron}
          onChange={(e) => setCustomCron(e.target.value)}
          placeholder="e.g. 0 9 * * 1"
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-500 focus:outline-none"
        />
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  token,
  owner,
  repo,
  defaultBranch,
  onRefresh,
}: {
  task: GithatchTask
  token: string
  owner: string
  repo: string
  defaultBranch: string
  onRefresh: () => void
}) {
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showScheduleEdit, setShowScheduleEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleTrigger = async () => {
    if (!task.workflowId) return
    setTriggering(true)
    setTriggerError(null)
    try {
      await triggerWorkflow({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
      setTriggered(true)
      setTimeout(() => setTriggered(false), 3000)
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger')
    } finally {
      setTriggering(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteWorkflowFile({ token, owner, repo, path: task.path })
      onRefresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{task.displayName}</p>
          {task.schedule && (
            <p className="mt-0.5 font-mono text-xs text-gray-500">{task.schedule}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {task.workflowId === undefined ? (
            <span className="text-xs text-gray-400 italic">Registering…</span>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowScheduleEdit((v) => !v)
                  setShowHistory(false)
                }}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {task.schedule ? 'Edit schedule' : 'Set schedule'}
              </button>
              <button
                onClick={() => {
                  setShowHistory((v) => !v)
                  setShowScheduleEdit(false)
                }}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {showHistory ? 'Hide history' : 'Run history'}
              </button>
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {triggering ? 'Triggering…' : triggered ? 'Triggered!' : 'Run now'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete row */}
      <div className="mt-2 flex items-center justify-end gap-2">
        {confirmDelete ? (
          <>
            <span className="text-xs text-gray-500">Delete this task?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-gray-400 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>

      {triggerError && <p className="mt-1 text-xs text-red-600">{triggerError}</p>}
      {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}

      {showHistory && (
        <RunHistoryPanel
          task={task}
          token={token}
          owner={owner}
          repo={repo}
          defaultBranch={defaultBranch}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showScheduleEdit && (
        <ScheduleEditPanel
          task={task}
          token={token}
          owner={owner}
          repo={repo}
          onClose={() => setShowScheduleEdit(false)}
          onSaved={() => {
            setShowScheduleEdit(false)
            onRefresh()
          }}
        />
      )}
    </li>
  )
}

function TaskSection({
  title,
  tasks,
  token,
  owner,
  repo,
  defaultBranch,
  onRefresh,
}: {
  title: string
  tasks: GithatchTask[]
  token: string
  owner: string
  repo: string
  defaultBranch: string
  onRefresh: () => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">{title}</p>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskRow
            key={task.slug}
            task={task}
            token={token}
            owner={owner}
            repo={repo}
            defaultBranch={defaultBranch}
            onRefresh={onRefresh}
          />
        ))}
      </ul>
    </div>
  )
}

export function TaskList({
  tasks,
  token,
  owner,
  repo,
  defaultBranch,
  loading,
  error,
  onRefresh,
}: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500">Loading tasks…</p>
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}{' '}
        <button onClick={onRefresh} className="underline">
          Retry
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500">
        <p>No tasks yet.</p>
        <p className="mt-1">Create your first task with the "+ New task" button.</p>
      </div>
    )
  }

  const scheduled = tasks.filter((t) => t.schedule)
  const manual = tasks.filter((t) => !t.schedule)

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Tasks ({tasks.length})</h2>
        <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600">
          Refresh
        </button>
      </div>
      <div className="space-y-6">
        {scheduled.length > 0 && (
          <TaskSection
            title="Scheduled"
            tasks={scheduled}
            token={token}
            owner={owner}
            repo={repo}
            defaultBranch={defaultBranch}
            onRefresh={onRefresh}
          />
        )}
        {manual.length > 0 && (
          <TaskSection
            title="Manual"
            tasks={manual}
            token={token}
            owner={owner}
            repo={repo}
            defaultBranch={defaultBranch}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  )
}
