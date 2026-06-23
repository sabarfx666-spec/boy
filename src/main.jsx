import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight:'100vh', background:'#0f111a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'white', fontFamily:'monospace', padding:24 }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <div style={{ fontSize:18, fontWeight:'bold' }}>ProFx failed to load</div>
        <div style={{ fontSize:11, color:'#5a5d7a', maxWidth:380, textAlign:'center' }}>{String(this.state.err)}</div>
        <button onClick={() => window.location.reload()}
          style={{ marginTop:8, padding:'10px 28px', borderRadius:10, background:'#4a90d9', color:'white', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:14 }}>
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
