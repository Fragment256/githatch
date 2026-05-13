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
