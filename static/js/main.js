// static/js/main.js

const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const summarizeBtn = document.getElementById('summarizeBtn');
const outputSection = document.getElementById('outputSection');
const summaryOutput = document.getElementById('summaryOutput');
const statsContent = document.getElementById('statsContent');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const summaryMode = document.getElementById('summaryMode');

// Update character count
inputText.addEventListener('input', function() {
    const count = this.value.length;
    charCount.textContent = `${count} characters`;

    if (count < 50) {
        charCount.style.color = '#e74c3c';
    } else {
        charCount.style.color = '#27ae60';
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
    loadingSpinner.style.display = 'block';
    outputSection.style.display = 'none';
    errorMessage.style.display = 'none';
    summarizeBtn.disabled = true;

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
        loadingSpinner.style.display = 'none';
        summarizeBtn.disabled = false;
    }
}

// Display summary
function displaySummary(data) {
    summaryOutput.textContent = data.summary;

    // Display statistics
    if (data.stats) {
        statsContent.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Original Words</div>
                <div class="stat-value">${data.stats.original_words}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Summary Words</div>
                <div class="stat-value">${data.stats.summary_words}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Compression</div>
                <div class="stat-value">${data.stats.compression_ratio}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Mode</div>
                <div class="stat-value">${data.stats.mode}</div>
            </div>
        `;
    }

    outputSection.style.display = 'block';

    // Smooth scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Copy to clipboard
function copyToClipboard() {
    const summary = summaryOutput.textContent;

    navigator.clipboard.writeText(summary).then(() => {
        alert('Summary copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy summary.');
    });
}

// Clear all
function clearAll() {
    inputText.value = '';
    charCount.textContent = '0 characters';
    charCount.style.color = '#666';
    outputSection.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Allow Enter key to submit (with Ctrl/Cmd)
inputText.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        summarizeText();
    }
});
