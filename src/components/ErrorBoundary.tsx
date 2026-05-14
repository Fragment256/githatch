import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">
          <p className="font-semibold">Something went wrong.</p>
          {this.state.message && (
            <p className="mt-1 font-mono text-xs text-black/60">{this.state.message}</p>
          )}
          <button
            onClick={this.reset}
            className="mt-3 border border-black px-3 py-1 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
