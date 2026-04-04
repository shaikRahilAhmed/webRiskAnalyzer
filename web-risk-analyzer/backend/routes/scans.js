const express = require('express')
const { db } = require('../db/database')
const { authMiddleware } = require('../middleware/auth')
const { performAnalysis } = require('../modules/scanner')

const router = express.Router()
router.use(authMiddleware)

// POST /api/scans/analyze
router.post('/analyze', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }

  try {
    const analysis = await performAnalysis(normalized)
    const scan = db.createScan(
      req.user.id,
      normalized,
      analysis.riskScore,
      analysis.riskLevel,
      analysis.checks,
      analysis.recommendations
    )
    res.json({ id: scan.id, ...analysis })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/scans/stats
router.get('/stats', (req, res) => {
  res.json(db.getStatsByUser(req.user.id))
})

// GET /api/scans/history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100
  const scans = db.getScansByUser(req.user.id, limit)
  res.json(scans.map(s => ({
    id: s.id, url: s.url,
    risk_score: s.risk_score,
    risk_level: s.risk_level,
    created_at: s.created_at
  })))
})

// GET /api/scans/:id
router.get('/:id', (req, res) => {
  const scan = db.getScanById(req.params.id, req.user.id)
  if (!scan) return res.status(404).json({ error: 'Scan not found' })
  res.json({
    ...scan,
    checks: JSON.parse(scan.checks || '{}'),
    recommendations: JSON.parse(scan.recommendations || '[]')
  })
})

// DELETE /api/scans/:id
router.delete('/:id', (req, res) => {
  db.deleteScan(req.params.id, req.user.id)
  res.json({ success: true })
})

module.exports = router
