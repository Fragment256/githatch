import { useState, useEffect } from 'react'
import type { GithatchTask, WorkflowRun } from '@/lib/workflows'
import { triggerWorkflow, getWorkflowRuns, updateWorkflowSchedule } from '@/lib/workflows'
import { deleteWorkflowFile } from '@/lib/github'

interface Props {
  tasks: GithatchTask[]
  token: string
  owner: string
  repo: string
  defaultBranch: string
  loading: boolean
  error: string | null
  onRefresh: () => void
  onEdit: (task: GithatchTask) => void
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

function TaskRow({
  task,
  token,
  owner,
  repo,
  defaultBranch,
  onRefresh,
  onEdit,
}: {
  task: GithatchTask
  token: string
  owner: string
  repo: string
  defaultBranch: string
  onRefresh: () => void
  onEdit: (task: GithatchTask) => void
}) {
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
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
                onClick={() => onEdit(task)}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {showHistory ? 'Hide history' : 'History'}
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
    </li>
  )
}

function ScheduledRow({
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
  const [showHistory, setShowHistory] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      await updateWorkflowSchedule({ token, owner, repo, task, schedule: undefined })
      onRefresh()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel schedule')
      setCancelling(false)
    }
  }

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-gray-900">{task.displayName}</span>
          <span className="ml-2 font-mono text-xs text-gray-500">{task.schedule}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
      </div>
      {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
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
    </li>
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
  onEdit,
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

  return (
    <div className="w-full space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Tasks ({tasks.length})</h2>
          <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600">
            Refresh
          </button>
        </div>
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
              onEdit={onEdit}
            />
          ))}
        </ul>
      </div>

      {scheduled.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Scheduled ({scheduled.length})
          </h2>
          <ul className="space-y-2">
            {scheduled.map((task) => (
              <ScheduledRow
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
      )}
    </div>
  )
}
