require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDB } = require('./db/database')

const authRoutes  = require('./routes/auth')
const scanRoutes  = require('./routes/scans')
const adminRoutes = require('./routes/admin')

const app = express()

// CORS — allow all origins in dev, restrict in prod via env
const allowedOrigin = process.env.FRONTEND_URL || '*'
app.use(cors({ origin: allowedOrigin }))
app.use(express.json())

// Init DB
initDB()

// API routes
app.use('/api/auth',  authRoutes)
app.use('/api/scans', scanRoutes)
app.use('/api/admin', adminRoutes)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Serve React build in production
const frontendBuild = path.join(__dirname, '../frontend/dist')
app.use(express.static(frontendBuild))

// All non-API routes → React app
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'))
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Web Risk Analyzer running on port ${PORT}`))
