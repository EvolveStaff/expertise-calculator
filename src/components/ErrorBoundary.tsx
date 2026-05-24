import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#080f1a", color: "#c8dff0", fontFamily: "'Rajdhani', sans-serif",
          padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, color: "#4ab3e8" }}>⚠</div>
          <div style={{
            fontSize: 18, fontWeight: 700, letterSpacing: "0.05em",
            fontFamily: "'Orbitron', sans-serif", marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "#4a7090", marginBottom: 24, maxWidth: 480 }}>
            The calculator encountered an unexpected error. Your build is saved — reload the page to continue.
          </div>
          <pre style={{
            fontSize: 11, color: "#3a6080", background: "#060d16",
            border: "1px solid #1a3050", borderRadius: 6,
            padding: "10px 16px", maxWidth: 600, overflowX: "auto",
            textAlign: "left", marginBottom: 24,
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#1a3050", border: "1px solid #4ab3e8", borderRadius: 6,
              color: "#4ab3e8", cursor: "pointer", fontSize: 13, padding: "8px 20px",
              fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.05em",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
