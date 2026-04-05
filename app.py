from flask import Flask, render_template, request, jsonify, send_from_directory
import re
import urllib.parse
import json
import os

app = Flask(__name__)

# Load dorks database
DORKS_PATH = os.path.join(os.path.dirname(__file__), 'static', 'dorks.json')
with open(DORKS_PATH, 'r') as f:
    DORKS_DB = json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/dorks')
def get_dorks():
    """Return full dorks database"""
    return jsonify(DORKS_DB)

@app.route('/api/dorks/search')
def search_dorks():
    """Search dorks by query, category, severity, or tag"""
    q = request.args.get('q', '').lower().strip()
    category = request.args.get('category', '').strip()
    severity = request.args.get('severity', '').strip()
    tag = request.args.get('tag', '').strip()

    results = []
    for cat in DORKS_DB['categories']:
        if category and cat['id'] != category:
            continue
        for dork in cat['dorks']:
            match = True
            if q and not (
                q in dork['query'].lower() or
                q in dork['title'].lower() or
                q in dork['description'].lower() or
                any(q in t for t in dork.get('tags', []))
            ):
                match = False
            if severity and dork.get('severity') != severity:
                match = False
            if tag and tag not in dork.get('tags', []):
                match = False
            if match:
                results.append({**dork, 'category': cat['id'], 'category_label': cat['label'], 'category_icon': cat['icon']})

    return jsonify({'results': results, 'count': len(results)})

@app.route('/api/build', methods=['POST'])
def build_query():
    """Build and return a Google search URL from a dork query"""
    data = request.get_json()
    query = data.get('query', '').strip()
    site = data.get('site', '').strip()

    if not query:
        return jsonify({'error': 'Query is required'}), 400

    final_query = query
    if site and 'site:' not in query:
        final_query += f' site:{site}'

    encoded = urllib.parse.quote_plus(final_query)
    google_url = f'https://www.google.com/search?q={encoded}'

    return jsonify({
        'query': final_query,
        'google_url': google_url
    })

@app.route('/api/stats')
def stats():
    """Return database statistics"""
    total = sum(len(c['dorks']) for c in DORKS_DB['categories'])
    categories = [{'id': c['id'], 'label': c['label'], 'icon': c['icon'], 'count': len(c['dorks'])} for c in DORKS_DB['categories']]
    return jsonify({
        'total_dorks': total,
        'total_categories': len(DORKS_DB['categories']),
        'categories': categories,
        'version': DORKS_DB['meta']['version'],
        'updated': DORKS_DB['meta']['updated']
    })

if __name__ == '__main__':
    app.run(debug=False)
