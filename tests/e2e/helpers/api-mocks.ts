import type { Page } from '@playwright/test'

export const TEST_TOKEN = 'gho_playwright_test_token_fixture'

export const TEST_USER = {
  id: 1,
  login: 'testuser',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  name: 'Test User',
}

export const TEST_REPO = {
  id: 42,
  name: 'my-test-repo',
  full_name: 'testuser/my-test-repo',
  private: false,
  permissions: { admin: true, push: true, pull: true },
  default_branch: 'main',
}

export const TEST_WORKFLOW_ID = 1001

// A minimal githatch workflow YAML, base64-encoded for the GitHub Contents API response.
// The comment matches parseGithatchYaml's regex so the displayName resolves correctly.
const TASK_YAML = '# Githatch - my-task\non:\n  workflow_dispatch:\n'
const TASK_YAML_B64 = Buffer.from(TASK_YAML, 'utf-8').toString('base64')

export const TEST_TASK_FILE = {
  name: 'githatch-my-task.yml',
  path: '.github/workflows/githatch-my-task.yml',
  sha: 'abc123',
  content: TASK_YAML_B64,
}

/** Seed the GitHub token into sessionStorage before the app boots. */
export async function seedToken(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('gh_token', token)
  }, TEST_TOKEN)
}

/** Seed the GitHub token AND active repo into sessionStorage before the app boots. */
export async function seedTokenAndRepo(page: Page): Promise<void> {
  await page.addInitScript(
    ({ token, repo }) => {
      sessionStorage.setItem('gh_token', token)
      sessionStorage.setItem('active_repo', JSON.stringify(repo))
    },
    { token: TEST_TOKEN, repo: TEST_REPO },
  )
}

/** Mock GET https://api.github.com/user */
export async function mockUser(page: Page): Promise<void> {
  await page.route('https://api.github.com/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_USER),
    }),
  )
}

/** Mock GET https://api.github.com/user/repos (pagination included) */
export async function mockRepos(page: Page): Promise<void> {
  await page.route('https://api.github.com/user/repos*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_REPO]),
    }),
  )
}

/**
 * Mock all task-list GitHub API calls for the test repo, returning an empty task list.
 *
 * Route order matters: Playwright uses LIFO evaluation, so the more specific
 * routes registered later will match before the catch-all registered first.
 */
export async function mockEmptyTaskList(page: Page): Promise<void> {
  // 1. Catch-all: any repo file content → 404 (CLAUDE.md, .claude/*, etc.)
  await page.route(`https://api.github.com/repos/${TEST_REPO.full_name}/contents/**`, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not Found' }),
    }),
  )
  // 2. Actions workflows list → empty (for listGithatchTasks)
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/actions/workflows*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflows: [], total_count: 0 }),
      }),
  )
  // 3. .github/workflows directory → empty array (overrides catch-all)
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/contents/.github/workflows`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
  )
}

/**
 * Mock task-list APIs returning one pre-existing task (with a workflowId so Run now is enabled).
 */
export async function mockOneTask(page: Page): Promise<void> {
  // 1. Catch-all: repo content 404
  await page.route(`https://api.github.com/repos/${TEST_REPO.full_name}/contents/**`, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not Found' }),
    }),
  )
  // 2. Actions workflows → returns our task's workflow ID
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/actions/workflows*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [{ id: TEST_WORKFLOW_ID, path: TEST_TASK_FILE.path }],
          total_count: 1,
        }),
      }),
  )
  // 3. Individual task YAML file (overrides catch-all)
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/contents/${TEST_TASK_FILE.path}`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_TASK_FILE),
      }),
  )
  // 4. .github/workflows directory → our one file (overrides catch-all)
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/contents/.github/workflows`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: TEST_TASK_FILE.name,
            path: TEST_TASK_FILE.path,
            type: 'file',
          },
        ]),
      }),
  )
}

/**
 * Mock the workflow upsert flow: GET → 404 (file doesn't exist), PUT → 201 created.
 * Call after mockEmptyTaskList so this more specific route takes priority.
 */
export async function mockWorkflowUpsert(page: Page): Promise<void> {
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/contents/.github/workflows/githatch-*`,
    (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            content: { sha: 'newsha123', path: '.github/workflows/githatch-new-task.yml' },
          }),
        })
      } else {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Not Found' }),
        })
      }
    },
  )
}

/** Mock POST workflow dispatch → 204 No Content */
export async function mockWorkflowDispatch(page: Page): Promise<void> {
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/actions/workflows/${TEST_WORKFLOW_ID}/dispatches`,
    (route) => route.fulfill({ status: 204 }),
  )
}

/** Mock GET workflow runs → empty list */
export async function mockWorkflowRuns(page: Page): Promise<void> {
  await page.route(
    `https://api.github.com/repos/${TEST_REPO.full_name}/actions/workflows/${TEST_WORKFLOW_ID}/runs*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflow_runs: [] }),
      }),
  )
}
