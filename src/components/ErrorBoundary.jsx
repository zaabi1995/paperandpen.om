import { Component } from 'react';

function DefaultFallback() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink-500">Something went wrong.</h1>
      <p className="mt-3 text-sm text-ink-400">
        Please refresh the page and try again.
      </p>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('UI error boundary caught an error:', error);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleWindowError = (event) => {
    this.setState({ error: event.error ?? new Error(event.message || 'Unhandled error') });
  };

  handleUnhandledRejection = (event) => {
    event.preventDefault();
    const reason = event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection');
    console.error('Unhandled promise rejection:', event.reason);
    this.setState({ error: reason });
  };

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      return fallback ?? <DefaultFallback />;
    }

    return this.props.children;
  }
}
