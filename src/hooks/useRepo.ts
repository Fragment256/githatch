import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listPushableRepos, type GitHubRepo } from '@/lib/github'

const STORAGE_KEY = 'active_repo'

function loadStoredRepo(): GitHubRepo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(repo))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    repos: reposQuery.data ?? [],
    reposLoading: reposQuery.isLoading,
    reposError: reposQuery.error,
    activeRepo,
    setActiveRepo,
  }
}
