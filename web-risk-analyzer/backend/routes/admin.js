const express = require('express')
const { db } = require('../db/database')
const { adminMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(adminMiddleware)

router.get('/users', (req, res) => {
  const users = db.getAllUsers().map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at
  }))
  res.json(users)
})

router.put('/users/:id', (req, res) => {
  const { role } = req.body
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  db.updateUserRole(req.params.id, role)
  res.json({ success: true })
})

router.get('/blacklist', (req, res) => res.json(db.getBlacklist()))

router.post('/blacklist', (req, res) => {
  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'Domain required' })
  try {
    db.addToBlacklist(domain.toLowerCase().trim())
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/blacklist/:id', (req, res) => {
  db.removeFromBlacklist(req.params.id)
  res.json({ success: true })
})

router.get('/whitelist', (req, res) => res.json(db.getWhitelist()))

router.post('/whitelist', (req, res) => {
  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'Domain required' })
  try {
    db.addToWhitelist(domain.toLowerCase().trim())
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/whitelist/:id', (req, res) => {
  db.removeFromWhitelist(req.params.id)
  res.json({ success: true })
})

module.exports = router
