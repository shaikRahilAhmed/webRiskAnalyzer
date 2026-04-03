import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Users, Shield, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import './Admin.css'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [blacklist, setBlacklist] = useState([])
  const [whitelist, setWhitelist] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [listType, setListType] = useState('blacklist')
  const [tab, setTab] = useState('users')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    axios.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {})
    axios.get('/api/admin/blacklist').then(r => setBlacklist(r.data)).catch(() => {})
    axios.get('/api/admin/whitelist').then(r => setWhitelist(r.data)).catch(() => {})
  }, [])

  const addDomain = async () => {
    if (!newDomain.trim()) return
    try {
      await axios.post(`/api/admin/${listType}`, { domain: newDomain.trim() })
      setMsg(`Added to ${listType}`)
      setNewDomain('')
      if (listType === 'blacklist') {
        const r = await axios.get('/api/admin/blacklist')
        setBlacklist(r.data)
      } else {
        const r = await axios.get('/api/admin/whitelist')
        setWhitelist(r.data)
      }
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error')
    }
  }

  const removeDomain = async (id, type) => {
    await axios.delete(`/api/admin/${type}/${id}`)
    if (type === 'blacklist') {
      setBlacklist(bl => bl.filter(d => d.id !== id))
    } else {
      setWhitelist(wl => wl.filter(d => d.id !== id))
    }
  }

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await axios.put(`/api/admin/users/${userId}`, { role: newRole })
    setUsers(us => us.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Admin Panel</h2>
        <p>Manage users, blacklists, and whitelists</p>
      </div>

      <div className="admin-tabs">
        {['users', 'lists'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' ? <><Users size={15} /> Users</> : <><Shield size={15} /> Domain Lists</>}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card">
          <h3>Registered Users ({users.length})</h3>
          <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => toggleUserRole(u.id, u.role)}>
                      Toggle Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'lists' && (
        <div className="lists-section">
          {msg && <div className="admin-msg">{msg}</div>}
          <div className="add-domain card">
            <h3>Add Domain</h3>
            <div className="add-domain-row">
              <select value={listType} onChange={e => setListType(e.target.value)}>
                <option value="blacklist">Blacklist</option>
                <option value="whitelist">Whitelist</option>
              </select>
              <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="example.com"
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
              />
              <button className="btn btn-primary" onClick={addDomain}>Add</button>
            </div>
          </div>

          <div className="domain-lists">
            <div className="card">
              <h3><AlertTriangle size={16} color="#ef4444" /> Blacklisted Domains ({blacklist.length})</h3>
              <div className="domain-list">
                {blacklist.map(d => (
                  <div key={d.id} className="domain-item danger">
                    <span>{d.domain}</span>
                    <button className="icon-btn delete" onClick={() => removeDomain(d.id, 'blacklist')}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {blacklist.length === 0 && <p className="empty-list">No blacklisted domains</p>}
              </div>
            </div>

            <div className="card">
              <h3><CheckCircle size={16} color="#22c55e" /> Whitelisted Domains ({whitelist.length})</h3>
              <div className="domain-list">
                {whitelist.map(d => (
                  <div key={d.id} className="domain-item safe">
                    <span>{d.domain}</span>
                    <button className="icon-btn delete" onClick={() => removeDomain(d.id, 'whitelist')}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {whitelist.length === 0 && <p className="empty-list">No whitelisted domains</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
