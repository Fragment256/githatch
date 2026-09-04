import { useState, useEffect, useRef } from 'react'
import type { GithatchTask, WorkflowRun } from '@/lib/workflows'
import type { OutputDestination } from '@/lib/yamlGenerator'
import { describeCron, nextCronRun, formatRelativeTime } from '@/lib/cronLabel'
import {
  triggerWorkflow,
  getWorkflowRuns,
  enableWorkflow,
  disableWorkflow,
  fetchRunOutput,
} from '@/lib/workflows'
import type { RunOutput } from '@/lib/workflows'
import { deleteWorkflowFile } from '@/lib/github'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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
  onDuplicate: (task: GithatchTask) => void
}

function hasFailed(run: WorkflowRun | null): boolean {
  return run !== null && run.status === 'completed' && run.conclusion !== 'success'
}

function describeOutputDestination(dest: OutputDestination): string | null {
  if (dest.type === 'issue_comment') return `→ Issue #${dest.issueNumber}`
  if (dest.type === 'new_issue') return '→ New issue'
  if (dest.type === 'file') return `→ ${dest.filePath}`
  if (dest.type === 'pull_request') return '→ Pull request'
  return null
}

function LastRunIndicator({ run, queued }: { run: WorkflowRun | null; queued?: boolean }) {
  if (queued) {
    return (
      <span className="inline-flex items-center border border-black bg-black px-2 py-0.5 font-mono text-xs tracking-widest text-white uppercase">
        Queued
      </span>
    )
  }
  if (!run) return null
  if (run.status === 'completed' && run.conclusion === 'success') return null
  const label =
    run.status !== 'completed' ? 'Running' : run.conclusion === 'cancelled' ? 'Cancelled' : 'Failed'
  return (
    <a
      href={run.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center border border-black bg-black px-2 py-0.5 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black"
    >
      {label}
    </a>
  )
}

function RunStatus({ run }: { run: WorkflowRun }) {
  if (run.status !== 'completed') {
    return (
      <span className="inline-flex items-center bg-black px-2 py-0.5 font-mono text-xs tracking-widest text-white uppercase">
        {run.status === 'queued' ? 'Queued' : 'Running'}
      </span>
    )
  }
  if (run.conclusion === 'success') {
    return (
      <span className="inline-flex items-center border border-black px-2 py-0.5 font-mono text-xs tracking-widest uppercase">
        Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center border border-black bg-black px-2 py-0.5 font-mono text-xs tracking-widest text-white uppercase">
      {run.conclusion ?? 'Failed'}
    </span>
  )
}

function RunOutputViewer({ output, onClose }: { output: RunOutput; onClose: () => void }) {
  const label =
    output.type === 'issue'
      ? 'Created issue'
      : output.type === 'comment'
        ? 'Posted comment'
        : output.type === 'pr'
          ? 'Created pull request'
          : 'Committed to file'

  return (
    <div className="mt-2 border border-black bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase">{label}</span>
        <div className="flex gap-2">
          <a
            href={output.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
          >
            Open in GitHub
          </a>
          <button
            onClick={onClose}
            className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
          >
            Close
          </button>
        </div>
      </div>
      {output.title && <p className="mb-2 text-sm font-semibold text-black">{output.title}</p>}
      {output.body !== undefined && (
        <pre className="max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-black/70">
          {output.body || '(no content)'}
        </pre>
      )}
    </div>
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
  const [viewingOutput, setViewingOutput] = useState<{ runId: number; output: RunOutput } | null>(
    null,
  )
  const [loadingOutput, setLoadingOutput] = useState<number | null>(null)
  const [outputErrors, setOutputErrors] = useState<Record<number, string>>({})
  const outputRequestId = useRef(0)
  const fetchRunsRequestId = useRef(0)

  const fetchRuns = () => {
    if (!task.workflowId) return
    const id = ++fetchRunsRequestId.current
    setLoadingRuns(true)
    setRunsError(null)
    getWorkflowRuns({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
      .then((result) => {
        if (id === fetchRunsRequestId.current) setRuns(result)
      })
      .catch((err: unknown) => {
        if (id === fetchRunsRequestId.current)
          setRunsError(err instanceof Error ? err.message : 'Failed to load runs')
      })
      .finally(() => {
        if (id === fetchRunsRequestId.current) setLoadingRuns(false)
      })
  }

  useEffect(() => {
    fetchRuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canViewOutput =
    task.outputDestination.type === 'new_issue' ||
    task.outputDestination.type === 'issue_comment' ||
    task.outputDestination.type === 'pull_request' ||
    task.outputDestination.type === 'file'

  const handleViewOutput = async (run: WorkflowRun) => {
    if (viewingOutput?.runId === run.id) {
      setViewingOutput(null)
      return
    }
    const id = ++outputRequestId.current
    setLoadingOutput(run.id)
    setOutputErrors((prev) => ({ ...prev, [run.id]: '' }))
    try {
      const output = await fetchRunOutput({
        token,
        owner,
        repo,
        run,
        outputDestination: task.outputDestination,
        defaultBranch,
      })
      if (id !== outputRequestId.current) return
      if (!output) {
        setOutputErrors((prev) => ({ ...prev, [run.id]: 'No output found for this run.' }))
      } else {
        setViewingOutput({ runId: run.id, output })
      }
    } catch (err) {
      if (id !== outputRequestId.current) return
      setOutputErrors((prev) => ({
        ...prev,
        [run.id]: err instanceof Error ? err.message : 'Failed to load output',
      }))
    } finally {
      if (id === outputRequestId.current) {
        setLoadingOutput(null)
      }
    }
  }

  return (
    <div className="mt-2 border border-black bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase">Run history</span>
        <div className="flex gap-2">
          <button
            onClick={fetchRuns}
            disabled={loadingRuns}
            className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
          >
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
        <ul className="space-y-2">
          {runs.map((run) => (
            <li key={run.id}>
              <div className="flex items-center justify-between gap-2">
                <RunStatus run={run} />
                <span className="flex-1 text-xs text-gray-400">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
                {canViewOutput && run.status === 'completed' && run.conclusion === 'success' && (
                  <button
                    onClick={() => void handleViewOutput(run)}
                    disabled={loadingOutput === run.id}
                    className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
                  >
                    {loadingOutput === run.id
                      ? 'Loading…'
                      : viewingOutput?.runId === run.id
                        ? 'Hide output'
                        : 'View output'}
                  </button>
                )}
                <a
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  View logs
                </a>
              </div>
              {outputErrors[run.id] && (
                <p className="mt-1 text-xs text-red-600">{outputErrors[run.id]}</p>
              )}
              {viewingOutput?.runId === run.id && (
                <RunOutputViewer
                  output={viewingOutput.output}
                  onClose={() => setViewingOutput(null)}
                />
              )}
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
  onDuplicate,
  onLastRunChange,
}: {
  task: GithatchTask
  token: string
  owner: string
  repo: string
  defaultBranch: string
  onRefresh: () => void
  onEdit: (task: GithatchTask) => void
  onDuplicate: (task: GithatchTask) => void
  onLastRunChange: (slug: string, run: WorkflowRun | null) => void
}) {
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(task.enabled)
  const [lastRun, setLastRun] = useState<WorkflowRun | null>(null)
  const [polling, setPolling] = useState(false)
  const [triggeredOutput, setTriggeredOutput] = useState<RunOutput | null>(null)
  const prevRunIdRef = useRef<number | null>(null)
  const outputDestRef = useRef(task.outputDestination)
  outputDestRef.current = task.outputDestination
  const onLastRunChangeRef = useRef(onLastRunChange)
  onLastRunChangeRef.current = onLastRunChange

  useEffect(() => {
    if (!task.workflowId) return
    getWorkflowRuns({ token, owner, repo, workflowId: task.workflowId, defaultBranch, perPage: 1 })
      .then((runs) => {
        const run = runs[0] ?? null
        setLastRun(run)
        onLastRunChangeRef.current(task.slug, run)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.workflowId])

  useEffect(() => {
    if (!polling || !task.workflowId) return
    const startedAt = Date.now()
    const POLL_INTERVAL = 8_000
    const MAX_DURATION = 5 * 60_000
    const workflowId = task.workflowId
    const slug = task.slug
    const id = setInterval(() => {
      if (Date.now() - startedAt > MAX_DURATION) {
        clearInterval(id)
        setPolling(false)
        return
      }
      void getWorkflowRuns({ token, owner, repo, workflowId, defaultBranch, perPage: 1 })
        .then((runs) => {
          const run = runs[0]
          if (!run || run.id === prevRunIdRef.current) return
          setLastRun(run)
          onLastRunChangeRef.current(slug, run)
          if (run.status === 'completed') {
            clearInterval(id)
            setPolling(false)
            if (run.conclusion === 'success') {
              const od = outputDestRef.current
              if (
                od.type === 'new_issue' ||
                od.type === 'issue_comment' ||
                od.type === 'pull_request' ||
                od.type === 'file'
              ) {
                void fetchRunOutput({
                  token,
                  owner,
                  repo,
                  run,
                  outputDestination: od,
                  defaultBranch,
                })
                  .then((out) => {
                    if (out) setTriggeredOutput(out)
                  })
                  .catch(() => {})
              }
            }
          }
        })
        .catch(() => {})
    }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [polling, task.workflowId, task.slug, token, owner, repo, defaultBranch])

  const handleTrigger = async () => {
    if (!task.workflowId) return
    setTriggering(true)
    setTriggerError(null)
    try {
      prevRunIdRef.current = lastRun?.id ?? null
      await triggerWorkflow({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
      setTriggered(true)
      setPolling(true)
      setTimeout(() => setTriggered(false), 3000)
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger')
    } finally {
      setTriggering(false)
    }
  }

  const handleToggle = async () => {
    if (!task.workflowId) return
    setToggling(true)
    setToggleError(null)
    try {
      if (enabled) {
        await disableWorkflow({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
        setEnabled(false)
      } else {
        await enableWorkflow({ token, owner, repo, workflowId: task.workflowId, defaultBranch })
        setEnabled(true)
      }
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Failed to update workflow state')
    } finally {
      setToggling(false)
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
    <li
      className={`border-2 p-4 ${enabled ? 'border-black bg-white' : 'border-black/30 bg-white'}`}
    >
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-semibold ${enabled ? 'text-black' : 'text-black/40'}`}>
              {task.displayName}
              {!enabled && (
                <span className="ml-2 font-mono text-xs tracking-widest text-black/30 uppercase">
                  Paused
                </span>
              )}
            </p>
            <LastRunIndicator
              run={lastRun}
              queued={polling && (lastRun === null || lastRun.id === prevRunIdRef.current)}
            />
          </div>
          {task.schedule && (
            <p className="mt-0.5 font-mono text-xs text-black/50">{describeCron(task.schedule)}</p>
          )}
          {describeOutputDestination(task.outputDestination) && (
            <p className="font-mono text-xs text-black/40">
              {describeOutputDestination(task.outputDestination)}
            </p>
          )}
          {task.schedule &&
            enabled &&
            (() => {
              const next = nextCronRun(task.schedule)
              return next ? (
                <p className="font-mono text-xs text-black/30">Next: {formatRelativeTime(next)}</p>
              ) : null
            })()}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {task.workflowId === undefined ? (
            <span className="font-mono text-xs tracking-widest text-gray-400 uppercase">
              Registering…
            </span>
          ) : (
            <>
              <button
                onClick={() => onEdit(task)}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
              >
                Edit
              </button>
              <button
                onClick={() => onDuplicate(task)}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
              >
                Duplicate
              </button>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
              >
                {showHistory ? 'Hide history' : 'History'}
              </button>
              <button
                onClick={() => setShowPrompt((v) => !v)}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
              >
                {showPrompt ? 'Hide prompt' : 'Prompt'}
              </button>
              <button
                onClick={handleToggle}
                disabled={toggling}
                aria-label={enabled ? 'Pause task' : 'Resume task'}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white disabled:opacity-50"
              >
                {toggling ? '…' : enabled ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={handleTrigger}
                disabled={triggering || !enabled || polling}
                className="border-2 border-black bg-black px-3 py-1.5 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
              >
                {triggering ? 'Triggering…' : triggered ? 'Triggered!' : 'Run now'}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete task"
                className="ml-1 p-1 text-black/30 transition-colors duration-100 hover:text-black"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {triggerError && <p className="mt-1 text-xs text-red-600">{triggerError}</p>}
      {toggleError && <p className="mt-1 text-xs text-red-600">{toggleError}</p>}
      {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}

      {triggeredOutput && (
        <RunOutputViewer output={triggeredOutput} onClose={() => setTriggeredOutput(null)} />
      )}

      {showPrompt && (
        <div className="mt-2 border border-black bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs tracking-widest uppercase">Prompt</span>
            <button
              onClick={() => setShowPrompt(false)}
              className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
            >
              Close
            </button>
          </div>
          <pre className="max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-black/70">
            {task.prompt || '(no prompt)'}
          </pre>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message={`Remove "${task.displayName}" and its workflow file from the repo? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

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
  onDuplicate,
}: Props) {
  const [lastRuns, setLastRuns] = useState<Record<string, WorkflowRun | null>>({})
  const [filterQuery, setFilterQuery] = useState('')

  const handleLastRunChange = (slug: string, run: WorkflowRun | null) => {
    setLastRuns((prev) => ({ ...prev, [slug]: run }))
  }

  if (loading) {
    return (
      <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">Loading tasks…</p>
    )
  }

  if (error) {
    return (
      <div className="border-2 border-black px-4 py-3 text-sm text-black">
        {error}{' '}
        <button onClick={onRefresh} className="underline">
          Retry
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center font-mono text-sm tracking-widest text-gray-500 uppercase">
        <p>No tasks yet.</p>
        <p className="mt-1">Create your first task with the "+ New task" button.</p>
      </div>
    )
  }

  const failedCount = Object.values(lastRuns).filter(hasFailed).length
  const filteredTasks = tasks.filter((task) =>
    task.displayName.toLowerCase().includes(filterQuery.trim().toLowerCase()),
  )

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-widest text-black uppercase">
          Tasks ({filteredTasks.length})
        </h2>
        <button
          onClick={onRefresh}
          className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
        >
          Refresh
        </button>
      </div>
      <div className="mb-4">
        <label htmlFor="task-filter" className="sr-only">
          Filter tasks
        </label>
        <input
          id="task-filter"
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter tasks by name…"
          className="block w-full max-w-sm border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
        />
      </div>
      {failedCount > 0 && (
        <div className="mb-3 border-2 border-black bg-black px-4 py-2 font-mono text-xs tracking-widest text-white uppercase">
          {failedCount} of {tasks.length} tasks failed last run
        </div>
      )}
      {filteredTasks.length === 0 ? (
        <p className="text-center font-mono text-sm tracking-widest text-gray-500 uppercase">
          No tasks match "{filterQuery}".
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.slug}
              task={task}
              token={token}
              owner={owner}
              repo={repo}
              defaultBranch={defaultBranch}
              onRefresh={onRefresh}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onLastRunChange={handleLastRunChange}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
