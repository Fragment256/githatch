import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listPushableRepos, type GitHubRepo } from '@/lib/github'

const STORAGE_KEY = 'active_repo'

function loadStoredRepo(): GitHubRepo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GitHubRepo) : null
  } catch {
    return null
  }
}

export function useRepo(token: string | null) {
  const [activeRepo, setActiveRepoState] = useState<GitHubRepo | null>(loadStoredRepo)

  const reposQuery = useQuery({
    queryKey: ['repos', token],
    queryFn: () => listPushableRepos(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })

  const setActiveRepo = (repo: GitHubRepo | null) => {
    setActiveRepoState(repo)
    if (repo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repo))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  useEffect(() => {
    if (!token) setActiveRepo(null)
  }, [token])

  return {
    repos: reposQuery.data ?? [],
    reposLoading: reposQuery.isLoading,
    reposError: reposQuery.error,
    activeRepo,
    setActiveRepo,
  }
}
