'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureError } from '@/lib/monitoring'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    captureError(error, { componentStack: info.componentStack ?? undefined })
  }

  handleRetry = () => this.setState({ hasError: false, error: undefined })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Something went wrong</p>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
