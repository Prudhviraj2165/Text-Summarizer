from flask import Flask, render_template, request, jsonify
from models.summarizer import get_summarizer
import logging

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the summarizer (loads Pegasus model once)
summarizer = get_summarizer()


@app.route('/')
def index():
    """Render the main summarizer UI."""
    return render_template('index.html')


@app.route('/summarize', methods=['POST'])
def summarize():
    """Handle text summarization requests from frontend."""
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'summary': 'No text provided', 'status': 'error'}), 400

        text = data.get('text', '').strip()
        mode = data.get('mode', 'balanced')

        if mode not in ['brief', 'balanced', 'detailed']:
            mode = 'balanced'

        result = summarizer.generate_summary(text, mode=mode)
        return jsonify(result)

    except Exception as e:
        logger.exception("❌ Error in /summarize endpoint")
        return jsonify({'summary': str(e), 'status': 'error'}), 500


@app.route('/health')
def health():
    """Simple health check."""
    return jsonify({
        'status': 'healthy',
        'model': 'facebook/bart-large-cnn'
    })


if __name__ == '__main__':
    # Run Flask app locally
    app.run(debug=True, host='127.0.0.1', port=5000)
