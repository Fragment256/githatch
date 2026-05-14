import { useState, useEffect } from 'react'
import type { GithatchTask, WorkflowRun } from '@/lib/workflows'
import { getWorkflowRuns } from '@/lib/workflows'
import { getRecentCommits, getRecentPRs } from '@/lib/github'
import type { CommitSummary, PRSummary } from '@/lib/github'

interface Props {
  tasks: GithatchTask[]
  token: string
  owner: string
  repo: string
  defaultBranch: string
}

function buildDayBuckets(runs: WorkflowRun[], days: number): number[] {
  const buckets = new Array<number>(days).fill(0)
  const now = Date.now()
  for (const run of runs) {
    const age = Math.floor((now - new Date(run.createdAt).getTime()) / 86400_000)
    if (age >= 0 && age < days) buckets[days - 1 - age]++
  }
  return buckets
}

function Sparkline({ buckets, color = '#000' }: { buckets: number[]; color?: string }) {
  const max = Math.max(...buckets, 1)
  const w = 6
  const gap = 2
  const h = 28
  const totalW = buckets.length * (w + gap) - gap

  return (
    <svg width={totalW} height={h} aria-hidden="true">
      {buckets.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * h))
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={h - barH}
            width={w}
            height={barH}
            fill={v === 0 ? '#e5e7eb' : color}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

interface TaskActivity {
  task: GithatchTask
  runs: WorkflowRun[]
  loading: boolean
  error: string | null
}

export function ActivityPanel({ tasks, token, owner, repo, defaultBranch }: Props) {
  const [taskActivity, setTaskActivity] = useState<TaskActivity[]>(
    tasks.map((task) => ({ task, runs: [], loading: true, error: null })),
  )
  const [commits, setCommits] = useState<CommitSummary[] | null>(null)
  const [prs, setPRs] = useState<PRSummary[] | null>(null)
  const [repoLoading, setRepoLoading] = useState(true)

  useEffect(() => {
    setTaskActivity(tasks.map((task) => ({ task, runs: [], loading: true, error: null })))

    tasks.forEach((task, idx) => {
      if (!task.workflowId) {
        setTaskActivity((prev) => prev.map((a, i) => (i === idx ? { ...a, loading: false } : a)))
        return
      }
      getWorkflowRuns({
        token,
        owner,
        repo,
        workflowId: task.workflowId,
        defaultBranch,
        perPage: 100,
      })
        .then((runs) =>
          setTaskActivity((prev) =>
            prev.map((a, i) => (i === idx ? { ...a, runs, loading: false } : a)),
          ),
        )
        .catch((err: unknown) =>
          setTaskActivity((prev) =>
            prev.map((a, i) =>
              i === idx
                ? {
                    ...a,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Failed',
                  }
                : a,
            ),
          ),
        )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, owner, repo])

  useEffect(() => {
    setRepoLoading(true)
    Promise.all([
      getRecentCommits({ token, owner, repo, days: 30 }),
      getRecentPRs({ token, owner, repo }),
    ])
      .then(([c, p]) => {
        setCommits(c)
        setPRs(p)
      })
      .catch(() => {
        setCommits([])
        setPRs([])
      })
      .finally(() => setRepoLoading(false))
     
  }, [token, owner, repo])

  const DAYS = 14
  const totalRuns = taskActivity.reduce((s, a) => s + a.runs.length, 0)
  const runsThisWeek = taskActivity.reduce(
    (s, a) =>
      s + a.runs.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 7 * 86400_000).length,
    0,
  )
  const openPRs = prs?.filter((p) => p.state === 'open').length ?? '…'
  const mergedPRs = prs?.filter((p) => p.merged).length ?? '…'

  return (
    <div className="w-full space-y-8">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Runs this week', value: runsThisWeek },
          { label: 'Total runs', value: totalRuns },
          { label: 'Open PRs', value: openPRs },
          { label: 'Merged PRs', value: mergedPRs },
        ].map(({ label, value }) => (
          <div key={label} className="border-2 border-black bg-white p-3">
            <p className="font-mono text-xs tracking-widest text-black/40 uppercase">{label}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-black">
              {typeof value === 'number'
                ? taskActivity.some((a) => a.loading) || repoLoading
                  ? '…'
                  : value
                : value}
            </p>
          </div>
        ))}
      </div>

      {/* Per-task execution charts */}
      {tasks.length > 0 && (
        <div>
          <h2 className="mb-4 font-mono text-xs tracking-widest text-black uppercase">
            Executions — last {DAYS} days
          </h2>
          <ul className="space-y-3">
            {taskActivity.map(({ task, runs, loading, error }) => {
              const buckets = buildDayBuckets(runs, DAYS)
              const total = runs.length
              const successes = runs.filter((r) => r.conclusion === 'success').length
              const failures = runs.filter(
                (r) => r.status === 'completed' && r.conclusion !== 'success',
              ).length

              return (
                <li key={task.slug} className="border border-black bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-black">{task.displayName}</p>
                      {loading ? (
                        <p className="mt-0.5 font-mono text-xs text-black/40">Loading…</p>
                      ) : error ? (
                        <p className="mt-0.5 font-mono text-xs text-red-600">{error}</p>
                      ) : (
                        <p className="mt-0.5 font-mono text-xs text-black/40">
                          {total} run{total !== 1 ? 's' : ''} · {successes} ✓ · {failures} ✗
                        </p>
                      )}
                    </div>
                    {!loading && !error && (
                      <div className="shrink-0">
                        <Sparkline buckets={buckets} />
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recent PRs */}
      <div>
        <h2 className="mb-4 font-mono text-xs tracking-widest text-black uppercase">
          Recent pull requests
        </h2>
        {repoLoading ? (
          <p className="font-mono text-xs text-black/40">Loading…</p>
        ) : !prs || prs.length === 0 ? (
          <p className="font-mono text-xs text-black/40">No pull requests found.</p>
        ) : (
          <ul className="space-y-2">
            {prs.slice(0, 10).map((pr) => (
              <li key={pr.number} className="flex items-center gap-3">
                <span
                  className={`shrink-0 border px-1.5 py-0.5 font-mono text-xs tracking-widest uppercase ${
                    pr.merged
                      ? 'border-black bg-black text-white'
                      : pr.state === 'open'
                        ? 'border-black text-black'
                        : 'border-black/30 text-black/30'
                  }`}
                >
                  {pr.merged ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}
                </span>
                <a
                  href={pr.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm text-black hover:underline"
                >
                  #{pr.number} {pr.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent commits */}
      <div>
        <h2 className="mb-4 font-mono text-xs tracking-widest text-black uppercase">
          Recent commits — last 30 days
        </h2>
        {repoLoading ? (
          <p className="font-mono text-xs text-black/40">Loading…</p>
        ) : !commits || commits.length === 0 ? (
          <p className="font-mono text-xs text-black/40">No commits in the last 30 days.</p>
        ) : (
          <ul className="space-y-1.5">
            {commits.slice(0, 15).map((c) => (
              <li key={c.sha} className="flex items-baseline gap-2 text-xs">
                <span className="shrink-0 font-mono text-black/30">{c.sha}</span>
                <span className="min-w-0 truncate text-black/70">{c.message}</span>
                <span className="shrink-0 font-mono text-black/30">
                  {new Date(c.date).toLocaleDateString()}
                </span>
              </li>
            ))}
            {commits.length > 15 && (
              <li className="font-mono text-xs text-black/30">
                +{commits.length - 15} more commits
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
