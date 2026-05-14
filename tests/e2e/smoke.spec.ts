import { test, expect } from '@playwright/test'
import {
  seedToken,
  seedTokenAndRepo,
  mockUser,
  mockRepos,
  mockEmptyTaskList,
  mockOneTask,
  mockWorkflowUpsert,
  mockWorkflowDispatch,
  mockWorkflowRuns,
  TEST_REPO,
} from './helpers/api-mocks'

// ---------------------------------------------------------------------------
// Landing page — logged out
// ---------------------------------------------------------------------------

test.describe('Landing page (logged out)', () => {
  test('shows the hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /agent runtime/i })).toBeVisible()
  })

  test('shows a Login with GitHub button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /login with github/i }).first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Repo picker — authenticated, no repo selected
// ---------------------------------------------------------------------------

test.describe('Repo picker', () => {
  test.beforeEach(async ({ page }) => {
    await seedToken(page)
    await mockUser(page)
    await mockRepos(page)
  })

  test('shows the repo picker after login', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel(/active repository/i)).toBeVisible()
  })

  test('lists the test repository as an option', async ({ page }) => {
    await page.goto('/')
    // <option> elements are not visually visible; assert the select contains the text
    await expect(page.locator('#repo-select')).toContainText(TEST_REPO.full_name)
  })

  test('navigates to the task list after selecting a repo', async ({ page }) => {
    await mockEmptyTaskList(page)
    await page.goto('/')

    await page.getByLabel(/active repository/i).selectOption(TEST_REPO.full_name)

    // Task list empty state
    await expect(page.getByText(/no tasks yet/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Task list — authenticated, repo selected, no tasks
// ---------------------------------------------------------------------------

test.describe('Task list (empty)', () => {
  test.beforeEach(async ({ page }) => {
    await seedTokenAndRepo(page)
    await mockUser(page)
    await mockEmptyTaskList(page)
  })

  test('shows the New task button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /\+ new task/i })).toBeVisible()
  })

  test('shows the active repo name in the header', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(TEST_REPO.name).first()).toBeVisible()
  })

  test('shows the empty-state message', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/no tasks yet/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Create task — fill form and submit
// ---------------------------------------------------------------------------

test.describe('Create task', () => {
  test.beforeEach(async ({ page }) => {
    await seedTokenAndRepo(page)
    await mockUser(page)
    await mockEmptyTaskList(page)
    // mockWorkflowUpsert is LIFO-last so it overrides the catch-all for githatch-* files
    await mockWorkflowUpsert(page)
  })

  test('navigates to the task form on + New task click', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /\+ new task/i }).click()
    await expect(page.getByRole('heading', { name: /new task/i })).toBeVisible()
  })

  test('creates a task and returns to the task list', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /\+ new task/i }).click()

    // Fill form — use "new_issue" output type to avoid the issue-number field
    await page.locator('#task-name').fill('My New Task')
    await page.locator('#task-output').selectOption('new_issue')
    await page.locator('#task-prompt').fill('Summarise open issues and create a weekly digest.')

    await page.getByRole('button', { name: /create task/i }).click()

    // After creation we return to the task list view
    await expect(page.getByRole('button', { name: /\+ new task/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Trigger task — Run now button dispatches the workflow
// ---------------------------------------------------------------------------

test.describe('Trigger task', () => {
  test.beforeEach(async ({ page }) => {
    await seedTokenAndRepo(page)
    await mockUser(page)
    await mockOneTask(page)
    await mockWorkflowDispatch(page)
    await mockWorkflowRuns(page)
  })

  test('shows the Run now button for a registered task', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /run now/i })).toBeVisible()
  })

  test('dispatches the workflow when Run now is clicked', async ({ page }) => {
    await page.goto('/')

    const [dispatchRequest] = await Promise.all([
      page.waitForRequest((req) => req.method() === 'POST' && req.url().includes('/dispatches')),
      page.getByRole('button', { name: /run now/i }).click(),
    ])

    expect(dispatchRequest.url()).toContain('/dispatches')

    // Button briefly shows "Triggered!" after success
    await expect(page.getByRole('button', { name: /triggered!/i })).toBeVisible()
  })
})
