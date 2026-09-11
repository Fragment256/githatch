import { useState, useEffect, useCallback } from 'react'
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

  const setActiveRepo = useCallback((repo: GitHubRepo | null) => {
    setActiveRepoState(repo)
    if (repo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repo))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!token) setActiveRepo(null)
  }, [token, setActiveRepo])

  useEffect(() => {
    if (!reposQuery.data || !activeRepo) return
    const freshRepo = reposQuery.data.find((r) => r.full_name === activeRepo.full_name)
    if (!freshRepo) {
      setActiveRepo(null)
    } else if (
      freshRepo.default_branch !== activeRepo.default_branch ||
      freshRepo.id !== activeRepo.id
    ) {
      setActiveRepo(freshRepo)
    }
  }, [reposQuery.data, activeRepo, setActiveRepo])

  return {
    repos: reposQuery.data ?? [],
    reposLoading: reposQuery.isLoading,
    reposError: reposQuery.error,
    activeRepo,
    setActiveRepo,
  }
}
