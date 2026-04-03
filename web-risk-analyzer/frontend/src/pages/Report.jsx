import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, ArrowLeft, Info, Lock, Globe, Clock
} from 'lucide-react'
import './Report.css'

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/scans/${id}`)
      .then(r => setReport(r.data))
      .catch(() => navigate('/history'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading-state"><Shield size={40} className="spin-slow" /><p>Loading report...</p></div>
  if (!report) return null

  const checks = report.checks || {}
  const riskLevel = report.risk_level || 'unknown'

  const riskConfig = {
    high:    { color: '#ef4444', bg: '#7f1d1d', icon: <XCircle size={28} />,      label: 'HIGH RISK' },
    medium:  { color: '#f59e0b', bg: '#78350f', icon: <AlertTriangle size={28} />, label: 'MEDIUM RISK' },
    low:     { color: '#6366f1', bg: '#1e3a5f', icon: <Info size={28} />,          label: 'LOW RISK' },
    safe:    { color: '#22c55e', bg: '#14532d', icon: <CheckCircle size={28} />,   label: 'TRUSTED' },
    unknown: { color: '#94a3b8', bg: '#1e293b', icon: <Shield size={28} />,        label: 'UNKNOWN' },
  }

  const cfg = riskConfig[riskLevel] || riskConfig.unknown

  const getStatusIcon = (status) => {
    if (status === 'safe')    return <CheckCircle size={16} color="#22c55e" />
    if (status === 'danger')  return <XCircle size={16} color="#ef4444" />
    if (status === 'warning') return <AlertTriangle size={16} color="#f59e0b" />
    return <Info size={16} color="#6366f1" />
  }

  const checkItems = Object.entries(checks).map(([key, val]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    ...val
  }))

  return (
    <div className="report-page">
      <div className="report-topbar">
        <button className="btn btn-secondary back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
          <RefreshCw size={16} /> New Scan
        </button>
      </div>

      <div className="report-header card">
        <div className="score-circle" style={{ borderColor: cfg.color }}>
          <div className="score-number" style={{ color: cfg.color }}>{report.risk_score}</div>
          <div className="score-label">/100</div>
          <div className="score-tag" style={{ color: cfg.color }}>{cfg.label}</div>
        </div>
        <div className="report-meta">
          <h2>Security Analysis Report</h2>
          <div className="report-url">
            <Globe size={14} />
            <span>{report.url}</span>
          </div>
          <div className="report-time">
            <Clock size={14} />
            <span>Scanned: {new Date(report.created_at).toLocaleString()}</span>
          </div>
          <div className="report-summary-row">
            <div className="summary-item">
              <CheckCircle size={16} color="#22c55e" />
              <span>Checks Passed: <strong>{checkItems.filter(c => c.status === 'safe').length}/{checkItems.length}</strong></span>
            </div>
            <div className="summary-item">
              <XCircle size={16} color="#ef4444" />
              <span>Risks Found: <strong>{checkItems.filter(c => c.status === 'danger').length}</strong></span>
            </div>
            <div className="summary-item">
              <AlertTriangle size={16} color="#f59e0b" />
              <span>Warnings: <strong>{checkItems.filter(c => c.status === 'warning').length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="checks-section">
        <h3>Detailed Security Checks</h3>
        <div className="checks-list">
          {checkItems.map(check => (
            <div key={check.key} className={`check-card check-${check.status}`}>
              <div className="check-header">
                {getStatusIcon(check.status)}
                <span className="check-name">{check.label}</span>
                <span className={`badge badge-${check.status === 'safe' ? 'safe' : check.status === 'danger' ? 'danger' : check.status === 'warning' ? 'warning' : 'info'}`}>
                  {check.status?.toUpperCase()}
                </span>
                {check.points > 0 && <span className="check-points">+{check.points} pts</span>}
              </div>
              <p className="check-message">{check.message}</p>
              {check.fix && (
                <div className="check-fix">
                  <Lock size={12} />
                  <span>Fix: {check.fix}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {report.recommendations?.length > 0 && (
        <div className="card recommendations">
          <h3>Recommendations</h3>
          <ul>
            {report.recommendations.map((rec, i) => (
              <li key={i}>
                <Shield size={14} color="#6366f1" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
