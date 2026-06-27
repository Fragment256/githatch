import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemplatePicker } from './TemplatePicker'
import { TEMPLATES } from '@/lib/templates'

const mockOnSelect = vi.fn()

describe('TemplatePicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockOnSelect.mockReset()
  })

  it('renders all templates', () => {
    render(<TemplatePicker selected={null} onSelect={mockOnSelect} />)
    for (const t of TEMPLATES) {
      expect(screen.getByText(t.name)).toBeInTheDocument()
      expect(screen.getByText(t.description)).toBeInTheDocument()
    }
  })

  it('calls onSelect with the template when a template is clicked', () => {
    render(<TemplatePicker selected={null} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText(TEMPLATES[0].name))
    expect(mockOnSelect).toHaveBeenCalledWith(TEMPLATES[0])
  })

  it('calls onSelect with null when the same selected template is clicked again', () => {
    const t = TEMPLATES[0]
    render(<TemplatePicker selected={t.id} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText(t.name))
    expect(mockOnSelect).toHaveBeenCalledWith(null)
  })

  it('shows "Start from scratch" button when a template is selected', () => {
    render(<TemplatePicker selected={TEMPLATES[0].id} onSelect={mockOnSelect} />)
    expect(screen.getByRole('button', { name: /start from scratch/i })).toBeInTheDocument()
  })

  it('hides "Start from scratch" button when no template is selected', () => {
    render(<TemplatePicker selected={null} onSelect={mockOnSelect} />)
    expect(screen.queryByRole('button', { name: /start from scratch/i })).not.toBeInTheDocument()
  })

  it('calls onSelect with null when "Start from scratch" is clicked', () => {
    render(<TemplatePicker selected={TEMPLATES[0].id} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /start from scratch/i }))
    expect(mockOnSelect).toHaveBeenCalledWith(null)
  })

  it('applies selected styles to the active template button', () => {
    const t = TEMPLATES[0]
    render(<TemplatePicker selected={t.id} onSelect={mockOnSelect} />)
    const btn = screen.getByText(t.name).closest('button')
    expect(btn?.className).toContain('bg-black')
    expect(btn?.className).toContain('text-white')
  })

  it('applies unselected styles to inactive template buttons', () => {
    const t = TEMPLATES[0]
    render(<TemplatePicker selected={t.id} onSelect={mockOnSelect} />)
    if (TEMPLATES.length > 1) {
      const other = TEMPLATES[1]
      const btn = screen.getByText(other.name).closest('button')
      expect(btn?.className).toContain('bg-white')
    }
  })
})
