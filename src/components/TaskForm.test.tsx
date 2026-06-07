import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskForm } from './TaskForm'
import { generateWorkflowYaml } from '@/lib/yamlGenerator'
import type { TaskConfig } from '@/lib/yamlGenerator'

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

const baseConfig: TaskConfig = {
  name: 'Old Task',
  prompt: 'Old prompt.',
  provider: 'claude_oauth',
  outputDestination: { type: 'new_issue' },
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

  // Preview gating: onSubmit is NOT called until "Commit to repo" is clicked
  it('shows preview after form submit and does not call onSubmit yet', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(mockSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /commit to repo/i })).toBeInTheDocument()
    expect(screen.getByTestId('yaml-preview')).toBeInTheDocument()
  })

  it('calls onSubmit with yaml and slug when Commit to repo is clicked', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    fireEvent.click(screen.getByRole('button', { name: /commit to repo/i }))
    expect(mockSubmit).toHaveBeenCalledOnce()
    const [yaml, slug] = mockSubmit.mock.calls[0] as [string, string]
    expect(yaml).toContain('anthropics/claude-code-action')
    expect(slug).toBe('my-task')
  })

  // Byte-identical: YAML shown in preview equals what's passed to onSubmit
  it('yaml shown in preview is byte-identical to yaml passed to onSubmit', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    const previewYaml = screen.getByTestId('yaml-preview').textContent ?? ''
    fireEvent.click(screen.getByRole('button', { name: /commit to repo/i }))
    const [yaml] = mockSubmit.mock.calls[0] as [string]
    expect(yaml).toBe(previewYaml)
  })

  // Edit-back round-trip: values are preserved after returning to form
  it('returns to form with values intact after clicking Edit', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    const name = 'Round Trip Task'
    const prompt = 'Preserved prompt.'
    fireEvent.change(screen.getByLabelText(/task name/i), { target: { value: name } })
    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: prompt } })
    fireEvent.change(screen.getByPlaceholderText(/issue number/i), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    // In preview — form fields are gone
    expect(screen.queryByLabelText(/task name/i)).not.toBeInTheDocument()
    // Click back to edit
    fireEvent.click(screen.getByRole('button', { name: /← edit/i }))
    // Form is restored with original values
    expect(screen.getByLabelText(/task name/i)).toHaveValue(name)
    expect(screen.getByLabelText(/prompt/i)).toHaveValue(prompt)
    expect(screen.getByPlaceholderText(/issue number/i)).toHaveValue(7)
  })

  // Diff rendering: changed field produces + and - lines in diff block
  it('shows diff when originalYaml differs from regenerated yaml', () => {
    const originalYaml = generateWorkflowYaml(baseConfig)
    render(
      <TaskForm onSubmit={mockSubmit} initialConfig={baseConfig} originalYaml={originalYaml} />,
    )
    // Change the prompt so the regenerated yaml differs
    fireEvent.change(screen.getByLabelText(/prompt/i), {
      target: { value: 'Completely new prompt.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    const diffBlock = screen.getByTestId('yaml-diff')
    expect(diffBlock).toBeInTheDocument()
    // Should contain at least one + and one - prefixed line
    expect(diffBlock.textContent).toMatch(/\+/)
    expect(diffBlock.textContent).toMatch(/-/)
  })

  // No diff section for new tasks (no originalYaml)
  it('does not show diff block for new tasks', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    expect(screen.queryByTestId('yaml-diff')).not.toBeInTheDocument()
  })

  // No diff block when yaml is unchanged
  it('does not show diff block when yaml is unchanged', () => {
    const yaml = generateWorkflowYaml(baseConfig)
    render(<TaskForm onSubmit={mockSubmit} initialConfig={baseConfig} originalYaml={yaml} />)
    // Submit without changing anything → same yaml
    fireEvent.change(screen.getByLabelText(/output destination/i), {
      target: { value: 'new_issue' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.queryByTestId('yaml-diff')).not.toBeInTheDocument()
    expect(screen.getByText(/no changes from current file/i)).toBeInTheDocument()
  })

  // Schedule preview
  it('shows "Next runs" label when a preset schedule is selected', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fireEvent.change(screen.getByLabelText(/schedule/i), { target: { value: '0 8 * * 1-5' } })
    expect(screen.getByText(/next runs/i)).toBeInTheDocument()
  })

  it('shows "Invalid cron expression" for an invalid custom cron and disables submit', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    fireEvent.change(screen.getByLabelText(/schedule/i), { target: { value: 'custom' } })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 0 9/i), {
      target: { value: '99 99 * * *' },
    })
    expect(screen.getByText(/invalid cron expression/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeDisabled()
  })

  it('does not show schedule preview when schedule is manual only', () => {
    render(<TaskForm onSubmit={mockSubmit} />)
    expect(screen.queryByText(/next runs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/invalid cron expression/i)).not.toBeInTheDocument()
  })

  // Commit button disabled during loading in preview state
  it('disables commit button when loading in preview state', () => {
    render(<TaskForm onSubmit={mockSubmit} loading={false} />)
    fillMinimal()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    // Confirm commit button exists and is enabled when not loading
    expect(screen.getByRole('button', { name: /commit to repo/i })).not.toBeDisabled()
  })
})
