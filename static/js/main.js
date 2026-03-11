// static/js/main.js

const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const summarizeBtn = document.getElementById('summarizeBtn');
const outputSection = document.getElementById('outputSection');
const summaryOutput = document.getElementById('summaryOutput');
const statsContent = document.getElementById('statsContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const summaryMode = document.getElementById('summaryMode');

// Update character count
inputText.addEventListener('input', function() {
    const count = this.value.length;
    charCount.textContent = `${count} chars`;

    if (count < 50) {
        charCount.style.color = '#ef4444'; // Red
    } else {
        charCount.style.color = '#10b981'; // Green
    }
});

// Summarize text
async function summarizeText() {
    const text = inputText.value.trim();
    const mode = summaryMode.value;

    // Validation
    if (!text) {
        showError('Please enter some text to summarize.');
        return;
    }

    if (text.length < 50) {
        showError('Text must be at least 50 characters long.');
        return;
    }

    // Show loading
    loadingOverlay.style.display = 'block';
    outputSection.style.display = 'none';
    errorMessage.style.display = 'none';
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                mode: mode
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            displaySummary(data);
        } else {
            showError(data.summary || 'An error occurred while generating the summary.');
        }

    } catch (error) {
        showError('Failed to connect to the server. Please try again.');
        console.error('Error:', error);
    } finally {
        loadingOverlay.style.display = 'none';
        summarizeBtn.disabled = false;
        summarizeBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate';
    }
}

// Display summary
function displaySummary(data) {
    summaryOutput.textContent = data.summary;

    // Display statistics
    if (data.stats) {
        statsContent.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Original</div>
                <div class="stat-value">${data.stats.original_words}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Summary</div>
                <div class="stat-value">${data.stats.summary_words}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Compression</div>
                <div class="stat-value">${data.stats.compression_ratio}</div>
            </div>
        `;
    }

    outputSection.style.display = 'block';

    // Smooth scroll to output
    setTimeout(() => {
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';

    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Copy to clipboard
function copyToClipboard() {
    const summary = summaryOutput.textContent;

    navigator.clipboard.writeText(summary).then(() => {
        const icon = document.querySelector('.fa-copy');
        icon.className = 'fas fa-check text-green-500';
        setTimeout(() => {
            icon.className = 'fas fa-copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Clear all
function clearAll() {
    inputText.value = '';
    charCount.textContent = '0 chars';
    charCount.style.color = 'var(--text-muted)';
    outputSection.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Allow Enter key to submit (with Ctrl/Cmd)
inputText.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        summarizeText();
    }
});
