import { useState, useCallback, useRef, useEffect } from 'react'
import type { GithatchTask } from '@/lib/workflows'
import { listGithatchTasks } from '@/lib/workflows'

export function useTasks(token: string | null, owner: string, repo: string) {
  const [tasks, setTasks] = useState<GithatchTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    ++requestId.current
    setTasks([])
    setError(null)
    setLoading(false)
  }, [owner, repo])

  const load = useCallback(() => {
    if (!token) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    listGithatchTasks({ token, owner, repo })
      .then((result) => {
        if (id !== requestId.current) return
        setTasks((prev) => {
          // Preserve only tasks explicitly marked optimistic (added locally, not yet on GitHub).
          // Server-fetched tasks (isOptimistic undefined/false) are dropped and replaced.
          const serverSlugs = new Set(result.map((t) => t.slug))
          const optimistic = prev.filter((t) => t.isOptimistic && !serverSlugs.has(t.slug))
          return optimistic.length > 0 ? [...optimistic, ...result] : result
        })
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      })
      .finally(() => {
        if (id !== requestId.current) return
        setLoading(false)
      })
  }, [token, owner, repo])

  const addTask = useCallback((task: GithatchTask) => {
    setTasks((prev) => {
      const optimistic: GithatchTask = { ...task, isOptimistic: true }
      const exists = prev.some((t) => t.slug === task.slug)
      return exists
        ? prev.map((t) => (t.slug === task.slug ? optimistic : t))
        : [optimistic, ...prev]
    })
  }, [])

  return { tasks, loading, error, load, addTask }
}
