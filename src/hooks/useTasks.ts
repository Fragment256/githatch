import { useState, useCallback, useRef } from 'react'
import type { GithatchTask } from '@/lib/workflows'
import { listGithatchTasks } from '@/lib/workflows'

export function useTasks(token: string | null, owner: string, repo: string) {
  const [tasks, setTasks] = useState<GithatchTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(() => {
    if (!token) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    listGithatchTasks({ token, owner, repo })
      .then((result) => {
        if (id !== requestId.current) return
        setTasks(result)
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
      const exists = prev.some((t) => t.slug === task.slug)
      return exists ? prev.map((t) => (t.slug === task.slug ? task : t)) : [task, ...prev]
    })
  }, [])

  return { tasks, loading, error, load, addTask }
}
