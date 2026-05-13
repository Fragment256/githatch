import { useState, useCallback } from 'react'
import type { GithatchTask } from '@/lib/workflows'
import { listGithatchTasks } from '@/lib/workflows'

export function useTasks(token: string | null, owner: string, repo: string) {
  const [tasks, setTasks] = useState<GithatchTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listGithatchTasks({ token, owner, repo })
      .then(setTasks)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load tasks'),
      )
      .finally(() => setLoading(false))
  }, [token, owner, repo])

  return { tasks, loading, error, load }
}
