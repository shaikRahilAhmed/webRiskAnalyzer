const { db } = require('../db/database')

/**
 * Main analysis function — runs all security checks and calculates risk score.
 * Based on the project's performAnalysis() design.
 */
function performAnalysis(urlString) {
  let parsedUrl
  try {
    parsedUrl = new URL(urlString)
  } catch {
    throw new Error('Invalid URL format')
  }

  const analysis = { checks: {} }

  // 1. PRIMARY CHECK: Reputation (Blacklist/Whitelist)
  analysis.checks.reputation = checkReputation(parsedUrl.hostname, urlString)

  // 2. HEURISTIC CHECKS
  analysis.checks.ssl         = checkSSL(parsedUrl)
  analysis.checks.domainAge   = checkDomainAge(parsedUrl.hostname)
  analysis.checks.urlStructure = checkURLStructure(urlString, parsedUrl)
  analysis.checks.securityHeaders = checkSecurityHeaders(parsedUrl)
  analysis.checks.portExposure = checkPortExposure(parsedUrl)

  // 3. FINAL SCORE CALCULATION
  analysis.riskScore = calculateRiskScore(analysis.checks)
  analysis.riskLevel = getRiskLevel(analysis.riskScore)
  analysis.recommendations = generateRecommendations(analysis.checks)

  return analysis
}

/**
 * Blacklist/Whitelist lookup — checks DB + heuristic patterns.
 */
function checkReputation(hostname, fullURL) {
  // Normalize: strip www.
  const host = hostname.replace(/^www\./, '')

  const blacklisted = db.getBlacklist()
  const isBlacklisted = blacklisted.some(r => host.endsWith(r.domain) || host === r.domain)
  if (isBlacklisted) {
    return {
      status: 'danger',
      message: '⚠ CONFIRMED THREAT: Known Malicious Host found in blacklist',
      points: 100,
      fix: 'Do not visit this site. Report it to your security team.'
    }
  }

  // Check DB whitelist
  const whitelisted = db.getWhitelist()
  const isTrusted = whitelisted.some(r => host.endsWith(r.domain) || host === r.domain)
  if (isTrusted) {
    return {
      status: 'safe',
      message: '✓ TRUSTED HOST: Verified Safe Domain',
      points: -20,
      fix: null
    }
  }

  // Malware file pattern heuristic
  if (/\.(exe|bat|cmd|vbs|ps1)$/i.test(fullURL)) {
    return {
      status: 'danger',
      message: '⚠ CONFIRMED THREAT: Executable file download detected',
      points: 80,
      fix: 'Never download executable files from unknown sources.'
    }
  }

  return {
    status: 'unknown',
    message: 'Domain not found in local white/black lists — proceed with caution',
    points: 10,
    fix: 'Verify the domain manually before trusting it.'
  }
}

/**
 * SSL/HTTPS check — major penalty if non-secure.
 */
function checkSSL(parsedUrl) {
  if (parsedUrl.protocol === 'https:') {
    return {
      status: 'safe',
      message: '✓ HTTPS: Secure connection detected',
      points: 0,
      fix: null
    }
  }
  return {
    status: 'danger',
    message: '✗ HTTP: No SSL/TLS encryption — data is transmitted in plaintext',
    points: 40,
    fix: 'Ensure the site uses HTTPS with a valid SSL certificate.'
  }
}

/**
 * Domain age heuristic — detects suspicious keywords and risky TLDs.
 */
function checkDomainAge(domain) {
  const host = domain.replace(/^www\./, '')
  const suspiciousKeywords = ['temp', 'new', 'test', 'free', 'win', 'prize', 'click', 'login', 'verify', 'update', 'secure', 'account', 'confirm']
  const riskyTLDs = ['.xyz', '.top', '.click', '.download', '.tk', '.ml', '.ga', '.cf', '.gq', '.pw']

  const hasSuspiciousKeyword = suspiciousKeywords.some(kw => host.toLowerCase().includes(kw))
  const isRiskyTLD = riskyTLDs.some(tld => host.endsWith(tld))

  if (hasSuspiciousKeyword && isRiskyTLD) {
    return {
      status: 'danger',
      message: '⚠ HIGH RISK: Suspicious keywords + risky TLD combination detected',
      points: 35,
      fix: 'Avoid domains with suspicious keywords and free/risky TLDs.'
    }
  }
  if (hasSuspiciousKeyword) {
    return {
      status: 'warning',
      message: '⚠ WARNING: Domain contains suspicious keywords often used in phishing',
      points: 20,
      fix: 'Be cautious — verify this domain is legitimate before proceeding.'
    }
  }
  if (isRiskyTLD) {
    return {
      status: 'warning',
      message: '⚠ WARNING: Domain uses a TLD commonly associated with spam/scam sites',
      points: 15,
      fix: 'Prefer established TLDs (.com, .org, .net) for trusted services.'
    }
  }
  return {
    status: 'safe',
    message: '✓ Domain appears established with a standard TLD',
    points: 0,
    fix: null
  }
}

/**
 * URL structure analysis — detects IP addresses, long URLs, encoded chars, etc.
 */
function checkURLStructure(urlString, parsedUrl) {
  const hostname = parsedUrl.hostname

  // IP address used instead of domain
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  if (isIP) {
    return {
      status: 'danger',
      message: '⚠ DANGER: IP address used instead of domain name — common in phishing',
      points: 30,
      fix: 'Legitimate sites use domain names, not raw IP addresses.'
    }
  }

  // Excessive subdomains (e.g. paypal.com.login.evil.com)
  const parts = hostname.split('.')
  if (parts.length > 4) {
    return {
      status: 'warning',
      message: '⚠ WARNING: Excessive subdomains detected — possible domain spoofing',
      points: 20,
      fix: 'Check the actual root domain carefully.'
    }
  }

  // URL encoding / obfuscation
  if (urlString.includes('%') && (urlString.match(/%[0-9a-f]{2}/gi) || []).length > 5) {
    return {
      status: 'warning',
      message: '⚠ WARNING: Heavy URL encoding detected — possible obfuscation attempt',
      points: 15,
      fix: 'Decode the URL and verify its actual destination.'
    }
  }

  // Very long URL
  if (urlString.length > 200) {
    return {
      status: 'warning',
      message: '⚠ WARNING: Unusually long URL — may be hiding the true destination',
      points: 10,
      fix: 'Inspect the full URL carefully before clicking.'
    }
  }

  return {
    status: 'safe',
    message: '✓ URL structure appears normal',
    points: 0,
    fix: null
  }
}

/**
 * Security headers check — simulates header analysis.
 */
function checkSecurityHeaders(parsedUrl) {
  // For a real implementation this would make an HTTP request.
  // Here we simulate based on protocol and domain patterns.
  const host = parsedUrl.hostname.replace(/^www\./, '')
  const trusted = db.getWhitelist()
  const isTrusted = trusted.some(r => host.endsWith(r.domain) || host === r.domain)

  if (parsedUrl.protocol !== 'https:') {
    return {
      status: 'danger',
      message: '✗ Security headers cannot be verified — site does not use HTTPS',
      points: 20,
      fix: 'Implement HTTPS and add headers: HSTS, CSP, X-Frame-Options, X-XSS-Protection.'
    }
  }

  if (isTrusted) {
    return {
      status: 'safe',
      message: '✓ Trusted domain — security headers expected to be properly configured',
      points: 0,
      fix: null
    }
  }

  return {
    status: 'warning',
    message: '⚠ WARNING: Security headers could not be verified for this domain',
    points: 10,
    fix: 'Ensure headers like HSTS, CSP, X-Frame-Options are set on the server.'
  }
}

/**
 * Port exposure check — detects non-standard ports.
 */
function checkPortExposure(parsedUrl) {
  const port = parsedUrl.port
  if (!port) {
    return {
      status: 'safe',
      message: '✓ Standard port in use (80/443)',
      points: 0,
      fix: null
    }
  }

  const riskyPorts = ['21', '22', '23', '25', '3306', '5432', '6379', '27017', '8080', '8443']
  if (riskyPorts.includes(port)) {
    return {
      status: 'warning',
      message: `⚠ WARNING: Non-standard port ${port} detected — may expose sensitive services`,
      points: 15,
      fix: `Port ${port} is typically used for internal services. Avoid exposing it publicly.`
    }
  }

  return {
    status: 'warning',
    message: `⚠ Non-standard port ${port} in use`,
    points: 5,
    fix: 'Verify this port is intentionally exposed.'
  }
}

/**
 * Calculate final risk score from all checks.
 */
function calculateRiskScore(checks) {
  let score = 0
  for (const check of Object.values(checks)) {
    score += check.points || 0
  }
  return Math.max(0, Math.min(100, score))
}

/**
 * Map score to risk level.
 */
function getRiskLevel(score) {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 15) return 'low'
  return 'safe'
}

/**
 * Generate actionable recommendations based on check results.
 */
function generateRecommendations(checks) {
  const recs = []
  for (const [key, check] of Object.entries(checks)) {
    if (check.fix && (check.status === 'danger' || check.status === 'warning')) {
      recs.push(check.fix)
    }
  }
  if (recs.length === 0) recs.push('No immediate action required. Continue monitoring regularly.')
  return [...new Set(recs)]
}

module.exports = { performAnalysis }
