const API = 'https://api.github.com'

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface GithatchTask {
  slug: string
  displayName: string
  schedule: string
  workflowId?: number
  path: string
}

export interface WorkflowRun {
  id: number
  status: string
  conclusion: string | null
  createdAt: string
  htmlUrl: string
}

export interface TaskParams {
  token: string
  owner: string
  repo: string
}

export interface WorkflowParams extends TaskParams {
  workflowId: number
  defaultBranch: string
}

export function parseGithatchYaml(yaml: string, slug: string, workflowId: number): GithatchTask {
  const nameMatch = yaml.match(/^# Githatch — (.+)$/m)
  const displayName = nameMatch ? nameMatch[1].trim() : slug

  const cronMatch = yaml.match(/cron: '([^']+)'/)
  const schedule = cronMatch ? cronMatch[1] : ''

  return {
    slug,
    displayName,
    schedule,
    workflowId,
    path: `.github/workflows/githatch-${slug}.yml`,
  }
}

export async function listGithatchTasks(params: TaskParams): Promise<GithatchTask[]> {
  const { token, owner, repo } = params
  const headers = authHeaders(token)

  const contentsRes = await fetch(`${API}/repos/${owner}/${repo}/contents/.github/workflows`, {
    headers,
  })
  if (contentsRes.status === 404) return []
  if (!contentsRes.ok) {
    throw new Error(`Failed to list workflow files: ${contentsRes.status}`)
  }
  const files = (await contentsRes.json()) as Array<{ name: string; path: string }>
  const githatchFiles = files.filter(
    (f) => f.name.startsWith('githatch-') && f.name.endsWith('.yml'),
  )

  if (githatchFiles.length === 0) return []

  const actionsRes = await fetch(`${API}/repos/${owner}/${repo}/actions/workflows?per_page=100`, {
    headers,
  })
  if (!actionsRes.ok) {
    throw new Error(`Failed to list actions workflows: ${actionsRes.status}`)
  }
  const { workflows } = (await actionsRes.json()) as {
    workflows: Array<{ id: number; path: string }>
  }
  const workflowIdByPath = new Map(workflows.map((w) => [w.path, w.id]))

  const results = await Promise.all(
    githatchFiles.map(async (file) => {
      const slug = file.name.replace(/^githatch-/, '').replace(/\.yml$/, '')
      const workflowId = workflowIdByPath.get(file.path)

      const fileRes = await fetch(`${API}/repos/${owner}/${repo}/contents/${file.path}`, {
        headers,
      })
      if (!fileRes.ok) return null
      const { content } = (await fileRes.json()) as { content: string }
      const binary = atob(content.replace(/\s/g, ''))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const yaml = new TextDecoder('utf-8').decode(bytes)

      const task = parseGithatchYaml(yaml, slug, workflowId ?? 0)
      return { ...task, workflowId }
    }),
  )

  return results.filter((t): t is GithatchTask => t !== null)
}

export async function triggerWorkflow(params: WorkflowParams): Promise<void> {
  const { token, owner, repo, workflowId, defaultBranch } = params
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: defaultBranch }),
    },
  )
  if (!res.ok) {
    throw new Error(`Failed to trigger workflow: ${res.status}`)
  }
}

export async function getWorkflowRuns(
  params: WorkflowParams & { perPage?: number },
): Promise<WorkflowRun[]> {
  const { token, owner, repo, workflowId, perPage = 20 } = params
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${perPage}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch workflow runs: ${res.status}`)
  }
  const data = (await res.json()) as {
    workflow_runs: Array<{
      id: number
      status: string
      conclusion: string | null
      created_at: string
      html_url: string
    }>
  }
  return data.workflow_runs.map((r) => ({
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    htmlUrl: r.html_url,
  }))
}
