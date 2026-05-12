import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskForm } from './TaskForm'

function fillMinimal(
  overrides: Partial<{ name: string; prompt: string; issueNumber: string }> = {},
) {
  const name = overrides.name ?? 'My Task'
  const prompt = overrides.prompt ?? 'Do something.'
  const issueNumber = overrides.issueNumber ?? '42'

  fireEvent.change(screen.getByLabelText(/task name/i), { target: { value: name } })
  fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: prompt } })
  if (issueNumber) {
    fireEvent.change(screen.getByPlaceholderText(/issue number/i), {
      target: { value: issueNumber },
    })
  }
}

describe('TaskForm', () => {
  const mockSubmit = vi.fn()

  beforeEach(() => {
    mockSubmit.mockClear()
  })

  it('renders all form fields', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/schedule/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/output destination/i)).toBeInTheDocument()
  })

  it('shows a custom cron input when "Custom cron" is selected', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fireEvent.change(screen.getByLabelText(/schedule/i), { target: { value: 'custom' } })
    expect(screen.getByPlaceholderText(/e\.g\. 0 9/i)).toBeInTheDocument()
  })

  it('shows issue number input when output is "issue_comment"', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    expect(screen.getByPlaceholderText(/issue number/i)).toBeInTheDocument()
  })

  it('shows file path input when output is "file"', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fireEvent.change(screen.getByLabelText(/output destination/i), { target: { value: 'file' } })
    expect(screen.getByPlaceholderText(/reports\/weekly/i)).toBeInTheDocument()
  })

  it('calls onSubmit with yaml and slug when valid', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(mockSubmit).toHaveBeenCalledOnce()
    const [yaml, slug] = mockSubmit.mock.calls[0] as [string, string]
    expect(yaml).toContain('anthropics/claude-code-action')
    expect(slug).toBe('my-task')
  })

  it('shows validation error when name is empty', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal({ name: '' })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(screen.getByText(/task name is required/i)).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error when prompt is empty', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal({ prompt: '' })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(screen.getByText(/prompt is required/i)).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error when issue number is empty', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    // Don't fill in issue number — leave at default empty string
    fireEvent.change(screen.getByLabelText(/task name/i), { target: { value: 'My Task' } })
    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: 'Do something.' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(screen.getByText(/Issue number must be a positive integer/i)).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('disables submit button when loading', () => {
    render(<TaskForm onSubmit={mockSubmit} loading={true} />)
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })
})
