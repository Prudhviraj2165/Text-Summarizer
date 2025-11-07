# AutoSummarizer (Flask + Google Pegasus)

## Quickstart
```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Open: http://127.0.0.1:5000/

## Notes
- First run downloads `google/pegasus-xsum` (~2GB). Keep internet on.
- GPU is auto-used if available.
- Use the dropdown to pick Brief / Balanced / Detailed.
