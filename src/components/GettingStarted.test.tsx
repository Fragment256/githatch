import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GettingStarted } from './GettingStarted'

const BASE_PROPS = {
  repoFullName: 'alice/my-repo',
  repoName: 'my-repo',
  onSetupToken: vi.fn(),
  onNewTask: vi.fn(),
}

describe('GettingStarted', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows checklist with action buttons when token absent and no tasks', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="absent" hasTasks={false} />)
    expect(screen.getByText(/getting started/i)).toBeInTheDocument()
    expect(screen.getByText(/repository selected/i)).toBeInTheDocument()
    expect(screen.getByText(/claude token configured/i)).toBeInTheDocument()
    expect(screen.getByText(/create your first task/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set up token/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ new task/i })).toBeInTheDocument()
  })

  it('step 1 always shows done with repo name', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="absent" hasTasks={false} />)
    expect(screen.getByText('my-repo')).toBeInTheDocument()
  })

  it('step 2 shows done and hides action button when token present', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="present" hasTasks={false} />)
    expect(screen.queryByRole('button', { name: /set up token/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ new task/i })).toBeInTheDocument()
  })

  it('step 2 shows unknown note and action button when secretStatus is unknown', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="unknown" hasTasks={false} />)
    expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set up token/i })).toBeInTheDocument()
  })

  it('step 3 shows done and hides action button when tasks exist', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="absent" hasTasks={true} />)
    expect(screen.queryByRole('button', { name: /\+ new task/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set up token/i })).toBeInTheDocument()
  })

  it('shows success line when all steps done', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="present" hasTasks={true} />)
    expect(screen.getByText(/you're set up/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('dismiss hides success line and writes sessionStorage', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="present" hasTasks={true} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/you're set up/i)).not.toBeInTheDocument()
    expect(sessionStorage.getItem('githatch:onboarding-dismissed:alice/my-repo')).toBe('true')
  })

  it('renders nothing when all done and already dismissed', () => {
    sessionStorage.setItem('githatch:onboarding-dismissed:alice/my-repo', 'true')
    const { container } = render(
      <GettingStarted {...BASE_PROPS} secretStatus="present" hasTasks={true} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('checklist still shows despite dismiss flag when steps are not done', () => {
    sessionStorage.setItem('githatch:onboarding-dismissed:alice/my-repo', 'true')
    render(<GettingStarted {...BASE_PROPS} secretStatus="absent" hasTasks={false} />)
    expect(screen.getByText(/getting started/i)).toBeInTheDocument()
  })

  it('dismiss is keyed per repo — undismissed repo shows success line', () => {
    sessionStorage.setItem('githatch:onboarding-dismissed:alice/my-repo', 'true')
    render(
      <GettingStarted
        {...BASE_PROPS}
        repoFullName="alice/other-repo"
        repoName="other-repo"
        secretStatus="present"
        hasTasks={true}
      />,
    )
    expect(screen.getByText(/you're set up/i)).toBeInTheDocument()
  })

  it('calls onSetupToken when Set up token button is clicked', () => {
    const onSetupToken = vi.fn()
    render(
      <GettingStarted
        {...BASE_PROPS}
        onSetupToken={onSetupToken}
        secretStatus="absent"
        hasTasks={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /set up token/i }))
    expect(onSetupToken).toHaveBeenCalledOnce()
  })

  it('calls onNewTask when New task button is clicked', () => {
    const onNewTask = vi.fn()
    render(
      <GettingStarted
        {...BASE_PROPS}
        onNewTask={onNewTask}
        secretStatus="present"
        hasTasks={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /\+ new task/i }))
    expect(onNewTask).toHaveBeenCalledOnce()
  })

  it('shows checking state for step 2 while loading', () => {
    render(<GettingStarted {...BASE_PROPS} secretStatus="loading" hasTasks={false} />)
    expect(screen.getByText(/checking/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set up token/i })).not.toBeInTheDocument()
  })
})
