import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Shield, AlertTriangle, CheckCircle, Search, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import './Home.css'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#6366f1']

export default function Home() {
  const [stats, setStats] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('/api/scans/stats').then(r => setStats(r.data)).catch(() => {})
    axios.get('/api/scans/history?limit=5').then(r => setRecentScans(r.data)).catch(() => {})
  }, [])

  const riskData = stats ? [
    { name: 'High Risk', value: stats.high || 0 },
    { name: 'Medium Risk', value: stats.medium || 0 },
    { name: 'Low Risk', value: stats.low || 0 },
    { name: 'Safe', value: stats.safe || 0 },
  ] : []

  const getRiskBadge = (level) => {
    const map = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-info', safe: 'badge-safe' }
    return map[level] || 'badge-info'
  }

  return (
    <div className="home-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your website security scans</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Search size={22} /></div>
          <div>
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-label">Total Scans</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div>
            <div className="stat-value">{stats?.high || 0}</div>
            <div className="stat-label">High Risk</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Shield size={22} /></div>
          <div>
            <div className="stat-value">{stats?.medium || 0}</div>
            <div className="stat-label">Medium Risk</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={22} /></div>
          <div>
            <div className="stat-value">{stats?.safe || 0}</div>
            <div className="stat-label">Safe Sites</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Risk Distribution</h3>
          {riskData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                  {riskData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No scan data yet</div>
          )}
        </div>

        <div className="card">
          <h3>Recent Scans</h3>
          {recentScans.length === 0 ? (
            <div className="empty-state">
              <Search size={40} color="#334155" />
              <p>No scans yet. Start by scanning a URL.</p>
              <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
                Scan Now
              </button>
            </div>
          ) : (
            <div className="recent-list">
              {recentScans.map(scan => (
                <div key={scan.id} className="recent-item" onClick={() => navigate(`/report/${scan.id}`)}>
                  <div className="recent-url">{scan.url}</div>
                  <div className="recent-meta">
                    <span className={`badge ${getRiskBadge(scan.risk_level)}`}>{scan.risk_level}</span>
                    <span className="recent-score">{scan.risk_score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="quick-scan card">
        <div className="quick-scan-content">
          <TrendingUp size={32} color="#6366f1" />
          <div>
            <h3>Quick Scan</h3>
            <p>Analyze any website for security vulnerabilities instantly</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
            Start Scanning
          </button>
        </div>
      </div>
    </div>
  )
}
