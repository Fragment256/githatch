const API = 'https://api.github.com'

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface Tool {
  id: string
  name: string
  description: string
  workflowFileName: string
  workflowYaml: string
  setupSteps: string[]
  usageExample: string
}

const SEND_GMAIL_YAML = `# Githatch Tool — Send Gmail
name: githatch-tool-send-gmail

on:
  workflow_dispatch:
    inputs:
      to:
        description: Recipient email address
        required: true
      subject:
        description: Email subject
        required: true
      file:
        description: Path to committed file to use as email body
        required: true

permissions:
  contents: read

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Send email
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          secure: true
          username: \${{ secrets.GMAIL_USERNAME }}
          password: \${{ secrets.GMAIL_APP_PASSWORD }}
          subject: \${{ inputs.subject }}
          to: \${{ inputs.to }}
          from: \${{ secrets.GMAIL_USERNAME }}
          body: file://\${{ inputs.file }}
`

export const TOOLS: Tool[] = [
  {
    id: 'send-gmail',
    name: 'Send Gmail',
    description:
      'Send email via Gmail SMTP from any agent task. The agent writes its output to a file, then calls this workflow to deliver it.',
    workflowFileName: 'githatch-tool-send-gmail.yml',
    workflowYaml: SEND_GMAIL_YAML,
    setupSteps: [
      'Go to your Google Account → Security → 2-Step Verification → App passwords',
      'Create an app password for "Mail" and copy it',
      'Add GMAIL_USERNAME as a repo secret (your Gmail address)',
      'Add GMAIL_APP_PASSWORD as a repo secret (the app password)',
    ],
    usageExample: `gh workflow run githatch-tool-send-gmail.yml \\
  --field to="recipient@example.com" \\
  --field subject="Weekly digest" \\
  --field file=reports/output.md`,
  },
]

export interface ToolParams {
  token: string
  owner: string
  repo: string
}

export async function checkToolInstalled(
  params: ToolParams & { fileName: string },
): Promise<boolean> {
  const { token, owner, repo, fileName } = params
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/.github/workflows/${fileName}`, {
    headers: authHeaders(token),
  })
  return res.ok
}

export async function installTool(params: ToolParams & { tool: Tool }): Promise<void> {
  const { token, owner, repo, tool } = params
  const path = `.github/workflows/${tool.workflowFileName}`
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`
  const headers = authHeaders(token)

  const getRes = await fetch(url, { headers })
  let sha: string | undefined
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha: string }
    sha = data.sha
  } else if (getRes.status !== 404) {
    throw new Error(`Failed to fetch tool file: ${getRes.status}`)
  }

  const content = btoa(unescape(encodeURIComponent(tool.workflowYaml)))
  const body: { message: string; content: string; sha?: string } = {
    message: `chore: install githatch tool ${tool.id}`,
    content,
    ...(sha ? { sha } : {}),
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!putRes.ok) {
    throw new Error(`Failed to install tool: ${putRes.status}`)
  }
}
