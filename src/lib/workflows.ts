import { parseOutputDestination, parsePromptFromYaml } from './yamlGenerator'
import type { OutputDestination } from './yamlGenerator'

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
  workflowId: number | undefined
  path: string
  enabled: boolean
  outputDestination: OutputDestination
  prompt: string
}

export interface RunOutput {
  type: 'issue' | 'comment' | 'pr' | 'file_link'
  title?: string
  body?: string
  htmlUrl: string
  createdAt?: string
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

export function parseGithatchYaml(
  yaml: string,
  slug: string,
  workflowId: number | undefined,
  enabled = true,
): GithatchTask {
  const nameMatch = yaml.match(/^# Githatch — (.+)$/m)
  const displayName = nameMatch ? nameMatch[1].trim() : slug

  const cronMatch = yaml.match(/^ {4}- cron: '([^']+)'/m)
  const schedule = cronMatch ? cronMatch[1] : ''

  return {
    slug,
    displayName,
    schedule,
    workflowId,
    path: `.github/workflows/githatch-${slug}.yml`,
    enabled,
    outputDestination: parseOutputDestination(yaml),
    prompt: parsePromptFromYaml(yaml),
  }
}

async function fetchAllActionWorkflows(
  owner: string,
  repo: string,
  headers: HeadersInit,
): Promise<Array<{ id: number; path: string; state: string }>> {
  const all: Array<{ id: number; path: string; state: string }> = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/actions/workflows?per_page=100&page=${page}`,
      { headers },
    )
    if (!res.ok) throw new Error(`Failed to list actions workflows: ${res.status}`)
    const { workflows, total_count } = (await res.json()) as {
      workflows: Array<{ id: number; path: string; state: string }>
      total_count?: number
    }
    all.push(...workflows)
    if (workflows.length < 100 || (total_count !== undefined && all.length >= total_count)) break
    page++
  }
  return all
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

  const workflows = await fetchAllActionWorkflows(owner, repo, headers)
  const workflowIdByPath = new Map(workflows.map((w) => [w.path, w.id]))
  const workflowStateByPath = new Map(workflows.map((w) => [w.path, w.state]))

  const results = await Promise.all(
    githatchFiles.map(async (file) => {
      const slug = file.name.replace(/^githatch-/, '').replace(/\.yml$/, '')
      const workflowId = workflowIdByPath.get(file.path)
      const state = workflowStateByPath.get(file.path) ?? 'active'
      const enabled = state === 'active'

      const fileRes = await fetch(`${API}/repos/${owner}/${repo}/contents/${file.path}`, {
        headers,
      })
      if (!fileRes.ok) {
        if (fileRes.status === 404) return null
        throw new Error(`Failed to fetch workflow file ${file.name}: ${fileRes.status}`)
      }
      const { content } = (await fileRes.json()) as { content: string }
      const binary = atob(content.replace(/\s/g, ''))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const yaml = new TextDecoder('utf-8').decode(bytes)

      return parseGithatchYaml(yaml, slug, workflowId, enabled)
    }),
  )

  return results.filter((t): t is GithatchTask => t !== null)
}

export function patchScheduleInYaml(yaml: string, schedule: string | undefined): string {
  const onBlock = schedule
    ? `on:\n  schedule:\n    - cron: '${schedule}'\n  workflow_dispatch:`
    : `on:\n  workflow_dispatch:`
  const updated = yaml.replace(/\non:[\s\S]*?\n+permissions:/, `\n${onBlock}\n\npermissions:`)
  if (updated === yaml) {
    throw new Error(
      'Could not locate on:/permissions: block in workflow YAML — schedule not updated',
    )
  }
  return updated
}

export async function updateWorkflowSchedule(params: {
  token: string
  owner: string
  repo: string
  task: GithatchTask
  schedule: string | undefined
}): Promise<void> {
  const { token, owner, repo, task, schedule } = params
  const headers = authHeaders(token)
  const url = `${API}/repos/${owner}/${repo}/contents/${task.path}`

  const getRes = await fetch(url, { headers })
  if (!getRes.ok) throw new Error(`Failed to fetch workflow: ${getRes.status}`)
  const { content: encoded, sha } = (await getRes.json()) as { content: string; sha: string }

  const binary = atob(encoded.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const currentYaml = new TextDecoder('utf-8').decode(bytes)

  const updatedYaml = patchScheduleInYaml(currentYaml, schedule)
  const updatedContent = btoa(unescape(encodeURIComponent(updatedYaml)))

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: schedule
        ? `chore: set schedule for ${task.slug}`
        : `chore: remove schedule for ${task.slug}`,
      content: updatedContent,
      sha,
    }),
  })
  if (!putRes.ok) throw new Error(`Failed to update schedule: ${putRes.status}`)
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

export async function enableWorkflow(params: WorkflowParams): Promise<void> {
  const { token, owner, repo, workflowId } = params
  const res = await fetch(`${API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    throw new Error(`Failed to enable workflow: ${res.status}`)
  }
}

export async function disableWorkflow(params: WorkflowParams): Promise<void> {
  const { token, owner, repo, workflowId } = params
  const res = await fetch(`${API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    throw new Error(`Failed to disable workflow: ${res.status}`)
  }
}

export async function fetchRunOutput(params: {
  token: string
  owner: string
  repo: string
  run: WorkflowRun
  outputDestination: OutputDestination
  defaultBranch?: string
}): Promise<RunOutput | null> {
  const { token, owner, repo, run, outputDestination, defaultBranch } = params
  const headers = authHeaders(token)

  if (outputDestination.type === 'file') {
    const { filePath } = outputDestination
    const branch = defaultBranch ?? 'main'
    const isDir = filePath.endsWith('/')
    const treeOrBlob = isDir ? 'tree' : 'blob'
    const urlPath = isDir ? filePath.slice(0, -1) : filePath
    return {
      type: 'file_link',
      title: filePath,
      htmlUrl: `https://github.com/${owner}/${repo}/${treeOrBlob}/${branch}/${urlPath}`,
    }
  }

  if (outputDestination.type === 'pull_request') {
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/issues?creator=github-actions%5Bbot%5D&since=${encodeURIComponent(run.createdAt)}&per_page=100&sort=created&direction=desc&state=all`,
      { headers },
    )
    if (!res.ok) return null
    const items = (await res.json()) as Array<{
      number: number
      title: string
      body: string | null
      html_url: string
      created_at: string
      pull_request?: object
    }>
    // `since` filters by updated_at, not created_at — exclude pre-existing items that were recently updated
    const pr = items
      .filter((i) => i.created_at >= run.createdAt)
      .find((item) => !!item.pull_request)
    if (!pr) return null
    return {
      type: 'pr',
      title: `#${pr.number} ${pr.title}`,
      body: pr.body ?? undefined,
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
    }
  }

  if (outputDestination.type === 'new_issue') {
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/issues?creator=github-actions%5Bbot%5D&since=${encodeURIComponent(run.createdAt)}&per_page=100&sort=created&direction=desc&state=all`,
      { headers },
    )
    if (!res.ok) return null
    const items = (await res.json()) as Array<{
      number: number
      title: string
      body: string | null
      html_url: string
      created_at: string
      pull_request?: object
    }>
    // `since` filters by updated_at, not created_at — exclude pre-existing items that were recently updated
    const issue = items.filter((i) => i.created_at >= run.createdAt).find((i) => !i.pull_request)
    if (!issue) return null
    return {
      type: 'issue',
      title: issue.title,
      body: issue.body ?? '',
      htmlUrl: issue.html_url,
      createdAt: issue.created_at,
    }
  }

  if (outputDestination.type === 'issue_comment') {
    const { issueNumber } = outputDestination
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/issues/${issueNumber}/comments?since=${encodeURIComponent(run.createdAt)}&per_page=100`,
      { headers },
    )
    if (!res.ok) return null
    const comments = (await res.json()) as Array<{
      id: number
      body: string
      html_url: string
      created_at: string
      user: { login: string }
    }>
    // `since` filters by updated_at, not created_at — exclude pre-existing comments recently touched
    const botComment = comments
      .filter((c) => c.created_at >= run.createdAt)
      .find((c) => c.user.login === 'github-actions[bot]')
    if (!botComment) return null
    return {
      type: 'comment',
      body: botComment.body,
      htmlUrl: botComment.html_url,
      createdAt: botComment.created_at,
    }
  }

  return null
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
