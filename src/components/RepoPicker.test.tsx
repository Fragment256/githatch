import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoPicker } from './RepoPicker'
import type { GitHubRepo } from '@/lib/github'

function makeRepo(id: number, fullName: string): GitHubRepo {
  return {
    id,
    name: fullName.split('/')[1],
    full_name: fullName,
    private: false,
    permissions: { admin: true, push: true, pull: true },
    default_branch: 'main',
  }
}

const repos = [
  makeRepo(1, 'octocat/hello-world'),
  makeRepo(2, 'octocat/spoon-knife'),
  makeRepo(3, 'acme/widgets'),
]

const mockOnSelect = vi.fn()

describe('RepoPicker', () => {
  beforeEach(() => {
    mockOnSelect.mockReset()
  })

  it('shows a loading message', () => {
    render(<RepoPicker repos={[]} activeRepo={null} loading error={null} onSelect={mockOnSelect} />)
    expect(screen.getByText(/loading repositories/i)).toBeInTheDocument()
  })

  it('shows an error message', () => {
    render(
      <RepoPicker
        repos={[]}
        activeRepo={null}
        loading={false}
        error={new Error('boom')}
        onSelect={mockOnSelect}
      />,
    )
    expect(screen.getByText(/failed to load repositories: boom/i)).toBeInTheDocument()
  })

  it('shows the active repo full name in the input', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={repos[0]}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    expect(screen.getByRole('combobox')).toHaveValue('octocat/hello-world')
  })

  it('does not show the dropdown list until focused', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    expect(screen.queryByText('acme/widgets')).not.toBeInTheDocument()
  })

  it('shows all repos on focus', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    fireEvent.focus(screen.getByRole('combobox'))
    for (const r of repos) {
      expect(screen.getByText(r.full_name)).toBeInTheDocument()
    }
  })

  it('filters the dropdown as the user types', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'acme' } })
    expect(screen.getByText('acme/widgets')).toBeInTheDocument()
    expect(screen.queryByText('octocat/hello-world')).not.toBeInTheDocument()
  })

  it('filter is case-insensitive', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'ACME' } })
    expect(screen.getByText('acme/widgets')).toBeInTheDocument()
  })

  it('shows a no-match message when nothing filters in', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'nonexistent' } })
    expect(screen.getByText(/no repositories match/i)).toBeInTheDocument()
  })

  it('calls onSelect and closes the list when a repo is clicked', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.click(screen.getByText('acme/widgets'))
    expect(mockOnSelect).toHaveBeenCalledWith(repos[2])
    expect(screen.queryByText('octocat/hello-world')).not.toBeInTheDocument()
  })

  it('selects the highlighted repo on Enter', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={null}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockOnSelect).toHaveBeenCalledWith(repos[1])
  })

  it('closes the list and reverts the input on Escape', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={repos[0]}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'acme' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByText('acme/widgets')).not.toBeInTheDocument()
    expect(input).toHaveValue('octocat/hello-world')
  })

  it('reverts stale query text when blurring without a selection', () => {
    render(
      <RepoPicker
        repos={repos}
        activeRepo={repos[0]}
        loading={false}
        error={null}
        onSelect={mockOnSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'zzz-no-match' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('octocat/hello-world')
  })
})
