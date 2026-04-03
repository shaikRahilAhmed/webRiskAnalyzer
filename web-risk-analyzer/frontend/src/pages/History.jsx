import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Trash2, Eye, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import './History.css'

export default function History() {
  const [scans, setScans] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchHistory = () => {
    setLoading(true)
    axios.get('/api/scans/history')
      .then(r => setScans(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHistory() }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this scan?')) return
    await axios.delete(`/api/scans/${id}`)
    fetchHistory()
  }

  const filtered = scans.filter(s => {
    const matchSearch = s.url.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || s.risk_level === filter
    return matchSearch && matchFilter
  })

  const getRiskIcon = (level) => {
    if (level === 'high')   return <XCircle size={16} color="#ef4444" />
    if (level === 'medium') return <AlertTriangle size={16} color="#f59e0b" />
    if (level === 'low')    return <Info size={16} color="#6366f1" />
    return <CheckCircle size={16} color="#22c55e" />
  }

  const getRiskBadge = (level) => {
    const map = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-info', safe: 'badge-safe' }
    return map[level] || 'badge-info'
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h2>Scan History</h2>
        <p>All your previous security scans</p>
      </div>

      <div className="history-controls card">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search URLs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-tabs">
          {['all', 'high', 'medium', 'low', 'safe'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-msg">Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-history">
          <Search size={48} color="#334155" />
          <p>No scans found</p>
          <button className="btn btn-primary" onClick={() => navigate('/scanner')}>Start Scanning</button>
        </div>
      ) : (
        <div className="history-table card">
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(scan => (
                <tr key={scan.id} onClick={() => navigate(`/report/${scan.id}`)} className="scan-row">
                  <td className="url-cell">
                    <div className="url-text">{scan.url}</div>
                  </td>
                  <td>
                    <div className="risk-cell">
                      {getRiskIcon(scan.risk_level)}
                      <span className={`badge ${getRiskBadge(scan.risk_level)}`}>{scan.risk_level}</span>
                    </div>
                  </td>
                  <td>
                    <span className="score-val">{scan.risk_score}/100</span>
                  </td>
                  <td className="date-cell">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-btns" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn view" onClick={() => navigate(`/report/${scan.id}`)}>
                        <Eye size={15} />
                      </button>
                      <button className="icon-btn delete" onClick={(e) => handleDelete(scan.id, e)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
