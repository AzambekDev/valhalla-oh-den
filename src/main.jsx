import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Root-Level Error Boundary to prevent any blank black screens and show active debugging info
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RootErrorBoundary caught a crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", width: "100%", minHeight: "100vh", background: "#120f0d", justifyContent: "center", alignItems: "center", padding: "2rem", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <div style={{ maxWidth: "600px", width: "100%", textAlign: "center", padding: "3rem 2rem", background: "rgba(28, 24, 21, 0.85)", backdropFilter: "blur(12px)", border: "1px solid #ef4444", borderRadius: "16px", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
              <span style={{ fontSize: "2rem" }}>⚠️</span>
            </div>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px" }}>Critical Application Error</h2>
            <p style={{ color: "#a3a3a3", fontSize: "0.85rem", margin: "0.5rem 0 1.5rem 0", lineHeight: "1.5" }}>
              A critical rendering or system error has occurred at the application root level. Please reset local application caches or refresh to reload.
            </p>

            <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "1rem", marginBottom: "1.75rem", textAlign: "left", overflowX: "auto" }}>
              <span style={{ fontSize: "0.75rem", color: "#a3a3a3", display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>DIAGNOSTICS:</span>
              <code style={{ fontSize: "0.8rem", color: "#f87171", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {this.state.error && this.state.error.toString()}
              </code>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button 
                type="button" 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "white", padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Clear Data & Reset
              </button>
              <button 
                type="button"
                onClick={() => window.location.reload()}
                style={{ background: "#f2a126", border: "none", color: "#120f0d", padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                🔄 Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
