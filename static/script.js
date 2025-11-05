document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchQuery = document.getElementById('searchQuery');
    const siteFilter = document.getElementById('siteFilter');
    const resultsContainer = document.getElementById('results');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const exampleItems = document.querySelectorAll('.example-item');

    // Handle form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch();
    });

    // Handle filter button clicks
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            searchQuery.value = this.dataset.filter;
            performSearch();
        });
    });

    // Handle example clicks
    exampleItems.forEach(item => {
        item.addEventListener('click', function() {
            searchQuery.value = this.dataset.example;
            performSearch();
        });
    });

    // Handle suggestion clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion-item')) {
            searchQuery.value = e.target.textContent;
            performSearch();
        }
    });

    async function performSearch() {
        const query = searchQuery.value.trim();
        const site = siteFilter.value.trim();

        if (!query) {
            alert('Please enter a search query');
            return;
        }

        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    site: site
                })
            });

            const data = await response.json();

            if (response.ok) {
                displayResults(data);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        }
    }

    function displayResults(data) {
        // Show results container
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        // Update query info
        document.getElementById('queryInfo').textContent = 
            `Original query: "${data.original_query}" → Enhanced with intelligent operators`;

        // Update dork query
        document.getElementById('dorkQuery').textContent = data.dork_query;

        // Update detected intents
        const intentSection = document.getElementById('intentSection');
        const intentsContainer = document.getElementById('detectedIntents');
        
        if (data.detected_intents && data.detected_intents.length > 0) {
            intentSection.style.display = 'block';
            intentsContainer.innerHTML = '';
            
            data.detected_intents.forEach(intent => {
                const tag = document.createElement('span');
                tag.className = 'intent-tag';
                tag.textContent = `${intent[0]}: ${intent[1]}`;
                intentsContainer.appendChild(tag);
            });
        } else {
            intentSection.style.display = 'none';
        }

        // Update suggestions
        const suggestionSection = document.getElementById('suggestionSection');
        const suggestionsContainer = document.getElementById('suggestions');
        
        if (data.suggestions && data.suggestions.length > 0) {
            suggestionSection.style.display = 'block';
            suggestionsContainer.innerHTML = '';
            
            data.suggestions.forEach(suggestion => {
                const item = document.createElement('span');
                item.className = 'suggestion-item';
                item.textContent = suggestion;
                suggestionsContainer.appendChild(item);
            });
        } else {
            suggestionSection.style.display = 'none';
        }

        // Setup action buttons
        setupActionButtons(data);
    }

    function setupActionButtons(data) {
        // Open in Google button
        document.getElementById('openGoogle').onclick = function() {
            window.open(data.google_url, '_blank');
        };

        // Copy query button
        document.getElementById('copyQuery').onclick = function() {
            navigator.clipboard.writeText(data.dork_query).then(function() {
                const btn = document.getElementById('copyQuery');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }).catch(function() {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = data.dork_query;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                const btn = document.getElementById('copyQuery');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        };

        // New search button
        document.getElementById('newSearch').onclick = function() {
            resultsContainer.style.display = 'none';
            searchQuery.value = '';
            siteFilter.value = '';
            searchQuery.focus();
        };
    }

    // Auto-focus search input
    searchQuery.focus();

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchQuery.focus();
        }
        
        // Escape to clear and hide results
        if (e.key === 'Escape') {
            if (resultsContainer.style.display !== 'none') {
                resultsContainer.style.display = 'none';
                searchQuery.focus();
            }
        }
    });
});