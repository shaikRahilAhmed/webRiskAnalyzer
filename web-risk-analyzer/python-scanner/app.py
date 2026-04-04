"""
Web Risk Analyzer - Python Flask Scanner Engine
Handles all security analysis checks and returns structured results.
Node.js backend calls this service internally.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from urllib.parse import urlparse
import os

app = Flask(__name__)
CORS(app)

# ── In-memory threat lists (Node.js syncs these via API) ──────────────────────
_blacklist = [
    'login-verification-paypal.com',
    'foryourpcsecurity.download',
    'apple.id.confirm-now.com',
    'secure-login-update.com',
    'malware-test.com',
    'phishing-example.net',
]

_whitelist = [
    'google.com', 'microsoft.com', 'youtube.com',
    'paypal.com', 'github.com', 'amazon.com',
]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'python-scanner'})


@app.route('/analyze', methods=['POST'])
def analyze():
    """Main scan endpoint — runs all security checks on a URL."""
    data = request.get_json()
    url_string = data.get('url', '').strip()
    blacklist  = data.get('blacklist', _blacklist)
    whitelist  = data.get('whitelist', _whitelist)

    if not url_string:
        return jsonify({'error': 'URL is required'}), 400

    try:
        parsed = urlparse(url_string)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError('Invalid URL')
    except Exception:
        return jsonify({'error': 'Invalid URL format'}), 400

    checks = {}
    checks['reputation']      = check_reputation(parsed.hostname, url_string, blacklist, whitelist)
    checks['ssl']             = check_ssl(parsed)
    checks['domainAge']       = check_domain_age(parsed.hostname)
    checks['urlStructure']    = check_url_structure(url_string, parsed)
    checks['securityHeaders'] = check_security_headers(parsed, whitelist)
    checks['portExposure']    = check_port_exposure(parsed)

    risk_score       = calculate_risk_score(checks)
    risk_level       = get_risk_level(risk_score)
    recommendations  = generate_recommendations(checks)

    return jsonify({
        'checks':          checks,
        'riskScore':       risk_score,
        'riskLevel':       risk_level,
        'recommendations': recommendations,
    })


@app.route('/lists/sync', methods=['POST'])
def sync_lists():
    """Node.js calls this to keep blacklist/whitelist in sync."""
    global _blacklist, _whitelist
    data = request.get_json()
    if 'blacklist' in data:
        _blacklist = [d['domain'] for d in data['blacklist']]
    if 'whitelist' in data:
        _whitelist = [d['domain'] for d in data['whitelist']]
    return jsonify({'status': 'synced', 'blacklist': len(_blacklist), 'whitelist': len(_whitelist)})


# ── Scanner Functions ─────────────────────────────────────────────────────────

def check_reputation(hostname, full_url, blacklist, whitelist):
    """Blacklist / Whitelist lookup with heuristic file pattern check."""
    host = hostname.lstrip('www.') if hostname else ''

    # Blacklist check
    for domain in blacklist:
        if host == domain or host.endswith('.' + domain):
            return {
                'status':  'danger',
                'message': '⚠ CONFIRMED THREAT: Known Malicious Host found in blacklist',
                'points':  100,
                'fix':     'Do not visit this site. Report it to your security team.'
            }

    # Whitelist check
    for domain in whitelist:
        if host == domain or host.endswith('.' + domain):
            return {
                'status':  'safe',
                'message': '✓ TRUSTED HOST: Verified Safe Domain',
                'points':  -20,
                'fix':     None
            }

    # Executable file heuristic
    if re.search(r'\.(exe|bat|cmd|vbs|ps1)$', full_url, re.IGNORECASE):
        return {
            'status':  'danger',
            'message': '⚠ CONFIRMED THREAT: Executable file download detected',
            'points':  80,
            'fix':     'Never download executable files from unknown sources.'
        }

    return {
        'status':  'unknown',
        'message': 'Domain not found in local white/black lists — proceed with caution',
        'points':  10,
        'fix':     'Verify the domain manually before trusting it.'
    }


def check_ssl(parsed):
    """SSL/HTTPS check — major penalty if non-secure."""
    if parsed.scheme == 'https':
        return {
            'status':  'safe',
            'message': '✓ HTTPS: Secure connection detected',
            'points':  0,
            'fix':     None
        }
    return {
        'status':  'danger',
        'message': '✗ HTTP: No SSL/TLS encryption — data is transmitted in plaintext',
        'points':  40,
        'fix':     'Ensure the site uses HTTPS with a valid SSL certificate.'
    }


def check_domain_age(hostname):
    """Detects suspicious keywords and risky TLDs."""
    host = (hostname or '').lstrip('www.').lower()

    suspicious_keywords = [
        'temp', 'new', 'test', 'free', 'win', 'prize',
        'click', 'login', 'verify', 'update', 'secure', 'account', 'confirm'
    ]
    risky_tlds = ['.xyz', '.top', '.click', '.download', '.tk', '.ml', '.ga', '.cf', '.gq', '.pw']

    has_suspicious = any(kw in host for kw in suspicious_keywords)
    is_risky_tld   = any(host.endswith(tld) for tld in risky_tlds)

    if has_suspicious and is_risky_tld:
        return {
            'status':  'danger',
            'message': '⚠ HIGH RISK: Suspicious keywords + risky TLD combination detected',
            'points':  35,
            'fix':     'Avoid domains with suspicious keywords and free/risky TLDs.'
        }
    if has_suspicious:
        return {
            'status':  'warning',
            'message': '⚠ WARNING: Domain contains suspicious keywords often used in phishing',
            'points':  20,
            'fix':     'Be cautious — verify this domain is legitimate before proceeding.'
        }
    if is_risky_tld:
        return {
            'status':  'warning',
            'message': '⚠ WARNING: Domain uses a TLD commonly associated with spam/scam sites',
            'points':  15,
            'fix':     'Prefer established TLDs (.com, .org, .net) for trusted services.'
        }
    return {
        'status':  'safe',
        'message': '✓ Domain appears established with a standard TLD',
        'points':  0,
        'fix':     None
    }


def check_url_structure(url_string, parsed):
    """Detects IP addresses, excessive subdomains, encoding, long URLs."""
    hostname = parsed.hostname or ''

    # IP address check
    if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', hostname):
        return {
            'status':  'danger',
            'message': '⚠ DANGER: IP address used instead of domain name — common in phishing',
            'points':  30,
            'fix':     'Legitimate sites use domain names, not raw IP addresses.'
        }

    # Excessive subdomains
    if len(hostname.split('.')) > 4:
        return {
            'status':  'warning',
            'message': '⚠ WARNING: Excessive subdomains detected — possible domain spoofing',
            'points':  20,
            'fix':     'Check the actual root domain carefully.'
        }

    # Heavy URL encoding
    encoded = re.findall(r'%[0-9a-fA-F]{2}', url_string)
    if len(encoded) > 5:
        return {
            'status':  'warning',
            'message': '⚠ WARNING: Heavy URL encoding detected — possible obfuscation attempt',
            'points':  15,
            'fix':     'Decode the URL and verify its actual destination.'
        }

    # Very long URL
    if len(url_string) > 200:
        return {
            'status':  'warning',
            'message': '⚠ WARNING: Unusually long URL — may be hiding the true destination',
            'points':  10,
            'fix':     'Inspect the full URL carefully before clicking.'
        }

    return {
        'status':  'safe',
        'message': '✓ URL structure appears normal',
        'points':  0,
        'fix':     None
    }


def check_security_headers(parsed, whitelist):
    """Simulates security header analysis based on protocol and trust."""
    host = (parsed.hostname or '').lstrip('www.')
    is_trusted = any(host == d or host.endswith('.' + d) for d in whitelist)

    if parsed.scheme != 'https':
        return {
            'status':  'danger',
            'message': '✗ Security headers cannot be verified — site does not use HTTPS',
            'points':  20,
            'fix':     'Implement HTTPS and add headers: HSTS, CSP, X-Frame-Options, X-XSS-Protection.'
        }
    if is_trusted:
        return {
            'status':  'safe',
            'message': '✓ Trusted domain — security headers expected to be properly configured',
            'points':  0,
            'fix':     None
        }
    return {
        'status':  'warning',
        'message': '⚠ WARNING: Security headers could not be verified for this domain',
        'points':  10,
        'fix':     'Ensure headers like HSTS, CSP, X-Frame-Options are set on the server.'
    }


def check_port_exposure(parsed):
    """Detects non-standard or risky ports in the URL."""
    port = str(parsed.port) if parsed.port else ''
    if not port:
        return {
            'status':  'safe',
            'message': '✓ Standard port in use (80/443)',
            'points':  0,
            'fix':     None
        }

    risky_ports = ['21', '22', '23', '25', '3306', '5432', '6379', '27017', '8080', '8443']
    if port in risky_ports:
        return {
            'status':  'warning',
            'message': f'⚠ WARNING: Non-standard port {port} detected — may expose sensitive services',
            'points':  15,
            'fix':     f'Port {port} is typically used for internal services. Avoid exposing it publicly.'
        }
    return {
        'status':  'warning',
        'message': f'⚠ Non-standard port {port} in use',
        'points':  5,
        'fix':     'Verify this port is intentionally exposed.'
    }


def calculate_risk_score(checks):
    score = sum(c.get('points', 0) for c in checks.values())
    return max(0, min(100, score))


def get_risk_level(score):
    if score >= 70: return 'high'
    if score >= 40: return 'medium'
    if score >= 15: return 'low'
    return 'safe'


def generate_recommendations(checks):
    recs = []
    for check in checks.values():
        if check.get('fix') and check.get('status') in ('danger', 'warning'):
            recs.append(check['fix'])
    if not recs:
        recs.append('No immediate action required. Continue monitoring regularly.')
    return list(dict.fromkeys(recs))  # deduplicate preserving order


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('SCANNER_PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
