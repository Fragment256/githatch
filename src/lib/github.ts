const API = 'https://api.github.com'

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  permissions: {
    admin: boolean
    push: boolean
    pull: boolean
  }
  default_branch: string
}

function parseNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

export interface UpsertWorkflowParams {
  token: string
  owner: string
  repo: string
  slug: string
  yaml: string
}

export async function upsertWorkflowFile({
  token,
  owner,
  repo,
  slug,
  yaml,
}: UpsertWorkflowParams): Promise<void> {
  const path = `.github/workflows/githatch-${slug}.yml`
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`
  const headers = authHeaders(token)

  const getResponse = await fetch(url, { headers })
  let sha: string | undefined
  if (getResponse.ok) {
    const data = (await getResponse.json()) as { sha: string }
    sha = data.sha
  } else if (getResponse.status !== 404) {
    throw new Error(`Failed to fetch workflow file: ${getResponse.status}`)
  }

  const content = btoa(unescape(encodeURIComponent(yaml)))

  const body: { message: string; content: string; sha?: string } = {
    message: `chore: add githatch workflow ${slug}`,
    content,
    ...(sha ? { sha } : {}),
  }

  const putResponse = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!putResponse.ok) {
    throw new Error(`Failed to write workflow file: ${putResponse.status}`)
  }
}

export async function deleteWorkflowFile(params: {
  token: string
  owner: string
  repo: string
  path: string
}): Promise<void> {
  const { token, owner, repo, path } = params
  const headers = authHeaders(token)
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`

  const getRes = await fetch(url, { headers })
  if (!getRes.ok) throw new Error(`Workflow file not found: ${getRes.status}`)
  const { sha } = (await getRes.json()) as { sha: string }

  const deleteRes = await fetch(url, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `chore: remove githatch workflow`, sha }),
  })
  if (!deleteRes.ok) throw new Error(`Failed to delete workflow file: ${deleteRes.status}`)
}

export async function fetchFileContent(params: {
  token: string
  owner: string
  repo: string
  path: string
}): Promise<string> {
  const { token, owner, repo, path } = params
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`)
  const { content } = (await res.json()) as { content: string }
  const binary = atob(content.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

export interface RepoAgentConfig {
  // Claude
  hasClaude: boolean
  hasSettings: boolean
  skills: string[]
  agents: string[]
  // Codex CLI (also used by Synthetic/Kimi)
  hasAgentsMd: boolean
  hasCodexConfig: boolean
  hasCodexHooks: boolean
}

function parseNames(items: Array<{ name: string; type: string }>): string[] {
  return items
    .filter((item) => item.type === 'dir' || item.name.endsWith('.md'))
    .map((item) => (item.type === 'dir' ? item.name : item.name.replace(/\.md$/, '')))
}

export async function fetchRepoAgentConfig(params: {
  token: string
  owner: string
  repo: string
}): Promise<RepoAgentConfig> {
  const { token, owner, repo } = params
  const headers = authHeaders(token)
  const base = `${API}/repos/${owner}/${repo}/contents`

  const [claudeRes, settingsRes, skillsRes, agentsRes, agentsMdRes, codexConfigRes, codexHooksRes] =
    await Promise.allSettled([
      fetch(`${base}/CLAUDE.md`, { headers }),
      fetch(`${base}/.claude/settings.json`, { headers }),
      fetch(`${base}/.claude/skills`, { headers }),
      fetch(`${base}/.claude/agents`, { headers }),
      fetch(`${base}/AGENTS.md`, { headers }),
      fetch(`${base}/.codex/config.toml`, { headers }),
      fetch(`${base}/.codex/hooks.json`, { headers }),
    ])

  const hasClaude = claudeRes.status === 'fulfilled' && claudeRes.value.ok
  const hasSettings = settingsRes.status === 'fulfilled' && settingsRes.value.ok

  const skills =
    skillsRes.status === 'fulfilled' && skillsRes.value.ok
      ? parseNames((await skillsRes.value.json()) as Array<{ name: string; type: string }>)
      : []

  const agents =
    agentsRes.status === 'fulfilled' && agentsRes.value.ok
      ? parseNames((await agentsRes.value.json()) as Array<{ name: string; type: string }>)
      : []

  const hasAgentsMd = agentsMdRes.status === 'fulfilled' && agentsMdRes.value.ok
  const hasCodexConfig = codexConfigRes.status === 'fulfilled' && codexConfigRes.value.ok
  const hasCodexHooks = codexHooksRes.status === 'fulfilled' && codexHooksRes.value.ok

  return { hasClaude, hasSettings, skills, agents, hasAgentsMd, hasCodexConfig, hasCodexHooks }
}

export async function listRepoSecrets(params: {
  token: string
  owner: string
  repo: string
}): Promise<string[]> {
  const { token, owner, repo } = params
  const res = await fetch(`${API}/repos/${owner}/${repo}/actions/secrets?per_page=100`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to list secrets: ${res.status}`)
  const data = (await res.json()) as { secrets: Array<{ name: string }> }
  return data.secrets.map((s) => s.name)
}

export async function listPushableRepos(token: string): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = []
  let url: string | null = `${API}/user/repos?per_page=100&sort=pushed`

  while (url) {
    const response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}: failed to list repos`)
    }
    const repos = (await response.json()) as GitHubRepo[]
    for (const repo of repos) {
      if (repo.permissions?.push) {
        all.push(repo)
      }
    }
    url = parseNextUrl(response.headers.get('Link'))
  }

  return all
}

export interface CommitSummary {
  sha: string
  message: string
  date: string
  author: string
}

export async function getRecentCommits(params: {
  token: string
  owner: string
  repo: string
  days?: number
}): Promise<CommitSummary[]> {
  const { token, owner, repo, days = 30 } = params
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) throw new Error(`Failed to fetch commits: ${res.status}`)
  const data = (await res.json()) as Array<{
    sha: string
    commit: { message: string; author: { date: string; name: string } | null }
  }>
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    date: c.commit.author?.date ?? '',
    author: c.commit.author?.name ?? '',
  }))
}

export interface PRSummary {
  number: number
  title: string
  state: 'open' | 'closed'
  merged: boolean
  createdAt: string
  updatedAt: string
  htmlUrl: string
}

export async function getRecentPRs(params: {
  token: string
  owner: string
  repo: string
  perPage?: number
}): Promise<PRSummary[]> {
  const { token, owner, repo, perPage = 20 } = params
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&sort=updated&direction=desc`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) throw new Error(`Failed to fetch PRs: ${res.status}`)
  const data = (await res.json()) as Array<{
    number: number
    title: string
    state: string
    merged_at: string | null
    created_at: string
    updated_at: string
    html_url: string
  }>
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state as 'open' | 'closed',
    merged: pr.merged_at !== null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    htmlUrl: pr.html_url,
  }))
}
