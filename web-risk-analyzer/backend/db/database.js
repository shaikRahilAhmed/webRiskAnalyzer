/**
 * Pure JSON file-based database — no native modules, works on any Node version.
 */
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const DB_FILE = path.join(__dirname, 'wra_data.json')

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return null
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

function getDB() {
  return loadDB()
}

function initDB() {
  let data = loadDB()

  if (!data) {
    data = {
      users: [],
      scans: [],
      blacklist: [],
      whitelist: [],
      _counters: { users: 0, scans: 0, blacklist: 0, whitelist: 0 }
    }
  }

  // Seed admin
  if (!data.users.find(u => u.email === 'admin@wra.com')) {
    data._counters.users++
    data.users.push({
      id: data._counters.users,
      name: 'Admin',
      email: 'admin@wra.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      created_at: new Date().toISOString()
    })
    console.log('Admin user created: admin@wra.com / admin123')
  }

  // Seed blacklist
  const knownBad = [
    'login-verification-paypal.com',
    'foryourpcsecurity.download',
    'apple.id.confirm-now.com',
    'secure-login-update.com',
    'malware-test.com',
    'phishing-example.net',
  ]
  knownBad.forEach(domain => {
    if (!data.blacklist.find(d => d.domain === domain)) {
      data._counters.blacklist++
      data.blacklist.push({ id: data._counters.blacklist, domain, added_at: new Date().toISOString() })
    }
  })

  // Seed whitelist
  const knownGood = ['google.com', 'microsoft.com', 'youtube.com', 'paypal.com', 'github.com', 'amazon.com']
  knownGood.forEach(domain => {
    if (!data.whitelist.find(d => d.domain === domain)) {
      data._counters.whitelist++
      data.whitelist.push({ id: data._counters.whitelist, domain, added_at: new Date().toISOString() })
    }
  })

  saveDB(data)
  console.log('Database initialized (JSON file store)')
}

// --- DB helper methods ---

const db = {
  // Users
  getUserByEmail: (email) => {
    const data = loadDB()
    return data.users.find(u => u.email === email) || null
  },
  getUserById: (id) => {
    const data = loadDB()
    return data.users.find(u => u.id === id) || null
  },
  getAllUsers: () => loadDB().users,
  createUser: (name, email, password, role = 'user') => {
    const data = loadDB()
    if (data.users.find(u => u.email === email)) throw new Error('Email already registered')
    data._counters.users++
    const user = { id: data._counters.users, name, email, password, role, created_at: new Date().toISOString() }
    data.users.push(user)
    saveDB(data)
    return user
  },
  updateUserRole: (id, role) => {
    const data = loadDB()
    const user = data.users.find(u => u.id === parseInt(id))
    if (user) { user.role = role; saveDB(data) }
  },

  // Scans
  createScan: (userId, url, riskScore, riskLevel, checks, recommendations) => {
    const data = loadDB()
    data._counters.scans++
    const scan = {
      id: data._counters.scans,
      user_id: userId,
      url,
      risk_score: riskScore,
      risk_level: riskLevel,
      checks: JSON.stringify(checks),
      recommendations: JSON.stringify(recommendations),
      created_at: new Date().toISOString()
    }
    data.scans.push(scan)
    saveDB(data)
    return scan
  },
  getScanById: (id, userId) => {
    const data = loadDB()
    return data.scans.find(s => s.id === parseInt(id) && s.user_id === parseInt(userId)) || null
  },
  getScansByUser: (userId, limit = 100) => {
    const data = loadDB()
    return data.scans
      .filter(s => s.user_id === parseInt(userId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  },
  deleteScan: (id, userId) => {
    const data = loadDB()
    data.scans = data.scans.filter(s => !(s.id === parseInt(id) && s.user_id === parseInt(userId)))
    saveDB(data)
  },
  getStatsByUser: (userId) => {
    const data = loadDB()
    const scans = data.scans.filter(s => s.user_id === parseInt(userId))
    const stats = { total: scans.length, high: 0, medium: 0, low: 0, safe: 0 }
    scans.forEach(s => { if (stats[s.risk_level] !== undefined) stats[s.risk_level]++ })
    return stats
  },

  // Blacklist
  getBlacklist: () => loadDB().blacklist,
  addToBlacklist: (domain) => {
    const data = loadDB()
    if (data.blacklist.find(d => d.domain === domain)) throw new Error('Already in blacklist')
    data._counters.blacklist++
    const entry = { id: data._counters.blacklist, domain, added_at: new Date().toISOString() }
    data.blacklist.push(entry)
    saveDB(data)
    return entry
  },
  removeFromBlacklist: (id) => {
    const data = loadDB()
    data.blacklist = data.blacklist.filter(d => d.id !== parseInt(id))
    saveDB(data)
  },

  // Whitelist
  getWhitelist: () => loadDB().whitelist,
  addToWhitelist: (domain) => {
    const data = loadDB()
    if (data.whitelist.find(d => d.domain === domain)) throw new Error('Already in whitelist')
    data._counters.whitelist++
    const entry = { id: data._counters.whitelist, domain, added_at: new Date().toISOString() }
    data.whitelist.push(entry)
    saveDB(data)
    return entry
  },
  removeFromWhitelist: (id) => {
    const data = loadDB()
    data.whitelist = data.whitelist.filter(d => d.id !== parseInt(id))
    saveDB(data)
  },
}

module.exports = { db, initDB, getDB }
