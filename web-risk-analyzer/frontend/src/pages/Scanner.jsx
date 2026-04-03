import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Shield, AlertTriangle, Loader, CheckCircle, XCircle, Info } from 'lucide-react'
import './Scanner.css'

export default function Scanner() {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const steps = [
    'Validating URL...',
    'Checking SSL/HTTPS...',
    'Analyzing domain reputation...',
    'Scanning security headers...',
    'Checking domain age & TLD...',
    'Detecting malicious patterns...',
    'Calculating risk score...',
    'Generating report...',
  ]

  const handleScan = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setError('')
    setScanning(true)
    setProgress(0)

    // Simulate progress steps
    for (let i = 0; i < steps.length - 1; i++) {
      setProgressMsg(steps[i])
      setProgress(Math.round(((i + 1) / steps.length) * 90))
      await new Promise(r => setTimeout(r, 400))
    }

    try {
      setProgressMsg(steps[steps.length - 1])
      const res = await axios.post('/api/scans/analyze', { url: url.trim() })
      setProgress(100)
      await new Promise(r => setTimeout(r, 300))
      navigate(`/report/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Please check the URL and try again.')
      setScanning(false)
      setProgress(0)
    }
  }

  const exampleUrls = [
    'https://google.com',
    'https://login-verification-paypal.com',
    'http://foryourpcsecurity.download',
    'https://github.com',
  ]

  return (
    <div className="scanner-page">
      <div className="page-header">
        <h2>URL Scanner</h2>
        <p>Enter a URL to perform a comprehensive security analysis</p>
      </div>

      <div className="scanner-card card">
        <form onSubmit={handleScan} className="scan-form">
          <div className="scan-input-row">
            <div className="scan-input-wrap">
              <Search size={18} className="scan-icon" />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={scanning}
                className="scan-input"
              />
            </div>
            <button type="submit" className="btn btn-primary scan-btn" disabled={scanning || !url.trim()}>
              {scanning ? <><Loader size={16} className="spin" /> Scanning...</> : <><Shield size={16} /> Analyze</>}
            </button>
          </div>
        </form>

        {error && (
          <div className="scan-error">
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {scanning && (
          <div className="scan-progress">
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-msg">
              <Loader size={14} className="spin" />
              <span>{progressMsg}</span>
              <span className="progress-pct">{progress}%</span>
            </div>
          </div>
        )}

        <div className="scan-checks">
          <h4>What we check:</h4>
          <div className="checks-grid">
            {[
              { icon: <Shield size={14} />, label: 'SSL/HTTPS Certificate' },
              { icon: <AlertTriangle size={14} />, label: 'Blacklist / Reputation' },
              { icon: <CheckCircle size={14} />, label: 'Security Headers' },
              { icon: <Info size={14} />, label: 'Domain Age & TLD' },
              { icon: <Search size={14} />, label: 'Malicious Patterns' },
              { icon: <Shield size={14} />, label: 'URL Structure Analysis' },
            ].map((c, i) => (
              <div key={i} className="check-item">
                {c.icon}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Try example URLs:</h4>
        <div className="example-urls">
          {exampleUrls.map(u => (
            <button key={u} className="example-url-btn" onClick={() => setUrl(u)} disabled={scanning}>
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
