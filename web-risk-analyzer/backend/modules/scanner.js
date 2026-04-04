/**
 * Node.js Scanner Bridge
 * Delegates all security analysis to the Python Flask scanner service.
 * Falls back to local analysis if Flask is unavailable.
 */

const axios = require('axios')
const { db } = require('../db/database')

const SCANNER_URL = process.env.SCANNER_URL || 'http://localhost:5001'

/**
 * Calls the Python Flask scanner service to perform analysis.
 * Passes current blacklist/whitelist so Flask stays in sync.
 */
async function performAnalysis(urlString) {
  let parsedUrl
  try {
    parsedUrl = new URL(urlString)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Pass current lists to Flask so it uses live DB data
  const blacklist = db.getBlacklist()
  const whitelist = db.getWhitelist()

  try {
    const response = await axios.post(`${SCANNER_URL}/analyze`, {
      url: urlString,
      blacklist,
      whitelist,
    }, { timeout: 10000 })

    return response.data
  } catch (err) {
    // Fallback: if Flask is down, run local JS analysis
    console.warn('Flask scanner unavailable, using local fallback:', err.message)
    return performLocalAnalysis(urlString, parsedUrl, blacklist, whitelist)
  }
}

/**
 * Local JS fallback — mirrors Flask logic exactly.
 * Used when Python service is unreachable.
 */
function performLocalAnalysis(urlString, parsedUrl, blacklist, whitelist) {
  const checks = {}
  checks.reputation      = checkReputation(parsedUrl.hostname, urlString, blacklist, whitelist)
  checks.ssl             = checkSSL(parsedUrl)
  checks.domainAge       = checkDomainAge(parsedUrl.hostname)
  checks.urlStructure    = checkURLStructure(urlString, parsedUrl)
  checks.securityHeaders = checkSecurityHeaders(parsedUrl, whitelist)
  checks.portExposure    = checkPortExposure(parsedUrl)

  const riskScore      = calculateRiskScore(checks)
  const riskLevel      = getRiskLevel(riskScore)
  const recommendations = generateRecommendations(checks)

  return { checks, riskScore, riskLevel, recommendations }
}

function checkReputation(hostname, fullURL, blacklist, whitelist) {
  const host = hostname.replace(/^www\./, '')

  const isBlacklisted = blacklist.some(r => host === r.domain || host.endsWith('.' + r.domain))
  if (isBlacklisted) return { status: 'danger', message: '⚠ CONFIRMED THREAT: Known Malicious Host found in blacklist', points: 100, fix: 'Do not visit this site. Report it to your security team.' }

  const isTrusted = whitelist.some(r => host === r.domain || host.endsWith('.' + r.domain))
  if (isTrusted) return { status: 'safe', message: '✓ TRUSTED HOST: Verified Safe Domain', points: -20, fix: null }

  if (/\.(exe|bat|cmd|vbs|ps1)$/i.test(fullURL)) return { status: 'danger', message: '⚠ CONFIRMED THREAT: Executable file download detected', points: 80, fix: 'Never download executable files from unknown sources.' }

  return { status: 'unknown', message: 'Domain not found in local white/black lists — proceed with caution', points: 10, fix: 'Verify the domain manually before trusting it.' }
}

function checkSSL(parsedUrl) {
  if (parsedUrl.protocol === 'https:') return { status: 'safe', message: '✓ HTTPS: Secure connection detected', points: 0, fix: null }
  return { status: 'danger', message: '✗ HTTP: No SSL/TLS encryption — data is transmitted in plaintext', points: 40, fix: 'Ensure the site uses HTTPS with a valid SSL certificate.' }
}

function checkDomainAge(hostname) {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  const suspiciousKeywords = ['temp','new','test','free','win','prize','click','login','verify','update','secure','account','confirm']
  const riskyTLDs = ['.xyz','.top','.click','.download','.tk','.ml','.ga','.cf','.gq','.pw']
  const hasSuspicious = suspiciousKeywords.some(kw => host.includes(kw))
  const isRiskyTLD = riskyTLDs.some(tld => host.endsWith(tld))
  if (hasSuspicious && isRiskyTLD) return { status: 'danger', message: '⚠ HIGH RISK: Suspicious keywords + risky TLD combination detected', points: 35, fix: 'Avoid domains with suspicious keywords and free/risky TLDs.' }
  if (hasSuspicious) return { status: 'warning', message: '⚠ WARNING: Domain contains suspicious keywords often used in phishing', points: 20, fix: 'Be cautious — verify this domain is legitimate before proceeding.' }
  if (isRiskyTLD) return { status: 'warning', message: '⚠ WARNING: Domain uses a TLD commonly associated with spam/scam sites', points: 15, fix: 'Prefer established TLDs (.com, .org, .net) for trusted services.' }
  return { status: 'safe', message: '✓ Domain appears established with a standard TLD', points: 0, fix: null }
}

function checkURLStructure(urlString, parsedUrl) {
  const hostname = parsedUrl.hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return { status: 'danger', message: '⚠ DANGER: IP address used instead of domain name — common in phishing', points: 30, fix: 'Legitimate sites use domain names, not raw IP addresses.' }
  if (hostname.split('.').length > 4) return { status: 'warning', message: '⚠ WARNING: Excessive subdomains detected — possible domain spoofing', points: 20, fix: 'Check the actual root domain carefully.' }
  if (urlString.includes('%') && (urlString.match(/%[0-9a-f]{2}/gi) || []).length > 5) return { status: 'warning', message: '⚠ WARNING: Heavy URL encoding detected — possible obfuscation attempt', points: 15, fix: 'Decode the URL and verify its actual destination.' }
  if (urlString.length > 200) return { status: 'warning', message: '⚠ WARNING: Unusually long URL — may be hiding the true destination', points: 10, fix: 'Inspect the full URL carefully before clicking.' }
  return { status: 'safe', message: '✓ URL structure appears normal', points: 0, fix: null }
}

function checkSecurityHeaders(parsedUrl, whitelist) {
  const host = parsedUrl.hostname.replace(/^www\./, '')
  const isTrusted = whitelist.some(r => host === r.domain || host.endsWith('.' + r.domain))
  if (parsedUrl.protocol !== 'https:') return { status: 'danger', message: '✗ Security headers cannot be verified — site does not use HTTPS', points: 20, fix: 'Implement HTTPS and add headers: HSTS, CSP, X-Frame-Options, X-XSS-Protection.' }
  if (isTrusted) return { status: 'safe', message: '✓ Trusted domain — security headers expected to be properly configured', points: 0, fix: null }
  return { status: 'warning', message: '⚠ WARNING: Security headers could not be verified for this domain', points: 10, fix: 'Ensure headers like HSTS, CSP, X-Frame-Options are set on the server.' }
}

function checkPortExposure(parsedUrl) {
  const port = parsedUrl.port
  if (!port) return { status: 'safe', message: '✓ Standard port in use (80/443)', points: 0, fix: null }
  const riskyPorts = ['21','22','23','25','3306','5432','6379','27017','8080','8443']
  if (riskyPorts.includes(port)) return { status: 'warning', message: `⚠ WARNING: Non-standard port ${port} detected — may expose sensitive services`, points: 15, fix: `Port ${port} is typically used for internal services. Avoid exposing it publicly.` }
  return { status: 'warning', message: `⚠ Non-standard port ${port} in use`, points: 5, fix: 'Verify this port is intentionally exposed.' }
}

function calculateRiskScore(checks) {
  return Math.max(0, Math.min(100, Object.values(checks).reduce((s, c) => s + (c.points || 0), 0)))
}

function getRiskLevel(score) {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 15) return 'low'
  return 'safe'
}

function generateRecommendations(checks) {
  const recs = [...new Set(Object.values(checks).filter(c => c.fix && ['danger','warning'].includes(c.status)).map(c => c.fix))]
  return recs.length ? recs : ['No immediate action required. Continue monitoring regularly.']
}

module.exports = { performAnalysis }
