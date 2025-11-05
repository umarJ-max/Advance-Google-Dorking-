from flask import Flask, render_template, request, jsonify
import re
import urllib.parse

app = Flask(__name__)

class DorkingEngine:
    def __init__(self):
        self.dork_patterns = {
            'files': {
                'pdf': 'filetype:pdf',
                'doc': 'filetype:doc OR filetype:docx',
                'xls': 'filetype:xls OR filetype:xlsx',
                'ppt': 'filetype:ppt OR filetype:pptx',
                'txt': 'filetype:txt',
                'sql': 'filetype:sql',
                'log': 'filetype:log',
                'config': 'filetype:conf OR filetype:config OR filetype:cfg'
            },
            'vulnerabilities': {
                'login': 'inurl:login OR inurl:signin OR inurl:admin',
                'database': 'inurl:phpmyadmin OR inurl:mysql OR inurl:database',
                'backup': 'filetype:bak OR filetype:backup OR filetype:old',
                'error': 'intext:"sql syntax near" OR intext:"syntax error" OR intext:"mysql_fetch"',
                'directory': 'intitle:"index of" OR intitle:"directory listing"'
            },
            'social': {
                'profiles': 'site:linkedin.com OR site:facebook.com OR site:twitter.com',
                'emails': 'intext:"@gmail.com" OR intext:"@yahoo.com" OR intext:"@hotmail.com"'
            },
            'tech': {
                'cameras': 'inurl:"view/live" OR inurl:"ViewerFrame?Mode="',
                'printers': 'inurl:":631/printers" OR inurl:"hp/device"',
                'routers': 'inurl:"admin/login" OR inurl:"router" OR inurl:"gateway"'
            }
        }
    
    def analyze_query(self, query):
        query_lower = query.lower()
        detected_intent = []
        
        # File type detection
        file_extensions = ['pdf', 'doc', 'xls', 'txt', 'sql', 'log', 'config']
        for ext in file_extensions:
            if ext in query_lower or f'.{ext}' in query_lower:
                detected_intent.append(('files', ext))
        
        # Vulnerability keywords
        vuln_keywords = {
            'login': ['login', 'signin', 'admin panel', 'authentication'],
            'database': ['database', 'mysql', 'phpmyadmin', 'sql'],
            'backup': ['backup', 'old files', 'bak'],
            'error': ['error', 'sql error', 'debug'],
            'directory': ['directory', 'index of', 'listing']
        }
        
        for vuln_type, keywords in vuln_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                detected_intent.append(('vulnerabilities', vuln_type))
        
        # Social media detection
        if any(word in query_lower for word in ['profile', 'social', 'linkedin', 'facebook']):
            detected_intent.append(('social', 'profiles'))
        
        if any(word in query_lower for word in ['email', 'contact', '@']):
            detected_intent.append(('social', 'emails'))
        
        # Tech detection
        tech_keywords = {
            'cameras': ['camera', 'webcam', 'surveillance'],
            'printers': ['printer', 'print server'],
            'routers': ['router', 'gateway', 'modem']
        }
        
        for tech_type, keywords in tech_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                detected_intent.append(('tech', tech_type))
        
        return detected_intent
    
    def build_dork_query(self, original_query, site=None):
        intents = self.analyze_query(original_query)
        dork_parts = []
        
        # Add original query terms (cleaned)
        clean_query = re.sub(r'\b(find|search|get|download|show|list)\b', '', original_query, flags=re.IGNORECASE).strip()
        
        if clean_query:
            # Extract main keywords
            keywords = [word for word in clean_query.split() if len(word) > 2]
            if keywords:
                dork_parts.append(' '.join(keywords))
        
        # Add detected dork patterns
        for category, subcategory in intents:
            if category in self.dork_patterns and subcategory in self.dork_patterns[category]:
                dork_parts.append(self.dork_patterns[category][subcategory])
        
        # Add site restriction if provided
        if site:
            dork_parts.append(f'site:{site}')
        
        # If no specific patterns detected, use general search enhancement
        if len(dork_parts) == 1:  # Only original query
            if any(word in original_query.lower() for word in ['confidential', 'private', 'internal']):
                dork_parts.append('filetype:pdf OR filetype:doc')
        
        return ' '.join(dork_parts)
    
    def generate_google_url(self, dork_query):
        encoded_query = urllib.parse.quote_plus(dork_query)
        return f"https://www.google.com/search?q={encoded_query}"

dorking_engine = DorkingEngine()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    query = data.get('query', '')
    site = data.get('site', '')
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    # Build the dork query
    dork_query = dorking_engine.build_dork_query(query, site if site else None)
    google_url = dorking_engine.generate_google_url(dork_query)
    
    # Analyze what was detected
    intents = dorking_engine.analyze_query(query)
    
    return jsonify({
        'original_query': query,
        'dork_query': dork_query,
        'google_url': google_url,
        'detected_intents': intents,
        'suggestions': generate_suggestions(query)
    })

def generate_suggestions(query):
    suggestions = []
    query_lower = query.lower()
    
    if 'login' in query_lower:
        suggestions.extend([
            'admin panels on specific domain',
            'default login pages',
            'authentication bypasses'
        ])
    
    if any(ext in query_lower for ext in ['pdf', 'doc', 'file']):
        suggestions.extend([
            'confidential documents',
            'backup files',
            'configuration files'
        ])
    
    if 'database' in query_lower:
        suggestions.extend([
            'exposed databases',
            'SQL dump files',
            'database admin panels'
        ])
    
    return suggestions[:3]  # Limit to 3 suggestions

# For Vercel deployment
if __name__ == '__main__':
    app.run(debug=False)