import { Component } from 'react'

const createCorrelationId = () => globalThis.crypto?.randomUUID?.() ?? `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`

/** Keeps an unexpected rendering failure contained and gives people a safe retry. */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, correlationId: null }
    this.retry = this.retry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error, correlationId: createCorrelationId() }
  }

  componentDidCatch(error, info) {
    // Do not log form fields, tokens, or user data. The ID is safe to share
    // with support and links client/server diagnostics for a single failure.
    console.error('Application rendering error', {
      correlationId: this.state.correlationId,
      name: error.name,
      message: error.message,
      componentStack: info.componentStack
    })
  }

  retry() {
    this.setState({ error: null, correlationId: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4" role="alert">
        <section className="max-w-md rounded-lg bg-white p-6 text-center shadow">
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-slate-600">Your information is safe. Please try again.</p>
          <p className="mt-3 text-xs text-slate-500">Reference ID: {this.state.correlationId}</p>
          <button type="button" onClick={this.retry} className="mt-5 rounded bg-blue-600 px-4 py-2 text-white">Try again</button>
        </section>
      </main>
    )
  }
}

export default AppErrorBoundary
