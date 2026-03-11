import os
import re
import logging
import torch
from transformers import PegasusForConditionalGeneration, PegasusTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["TRANSFORMERS_NO_TF"] = "1"
os.environ["TRANSFORMERS_NO_FLAX"] = "1"


class AutoSummarizer:
    def __init__(self, model_name: str = "facebook/bart-large-cnn"):
        """
        Initialize BART summarizer (GPU if available).
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        logger.info(f"Loading model: {model_name}")

        from transformers import BartTokenizer, BartForConditionalGeneration
        self.tokenizer = BartTokenizer.from_pretrained(model_name)
        self.model = BartForConditionalGeneration.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()

    def preprocess_text(self, text: str) -> str:
        """Clean and prepare text for summarization."""
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"http\S+|www\S+", "", text)
        text = re.sub(r"[^\w\s\.\,\!\?\-\:\'\"]", "", text)
        return text.strip()

    def split_into_chunks(self, text: str, max_tokens: int = 512):
        """Split long text into chunks based on token limit."""
        tokens = self.tokenizer.encode(text, truncation=False)
        chunks, step = [], max_tokens - 50
        for i in range(0, len(tokens), step):
            chunk_tokens = tokens[i:i + max_tokens]
            chunk_text = self.tokenizer.decode(chunk_tokens, skip_special_tokens=True)
            if len(chunk_text.split()) > 20:
                chunks.append(chunk_text)
        return chunks

    def generate_summary(self, text: str, mode: str = "balanced", max_length=None, min_length=None):
        """Generate a context-aware summary using BART."""
        if not text or len(text.strip()) < 50:
            return {"summary": "Text too short to summarize (minimum 50 characters required).",
                    "stats": {}, "status": "error"}

        text = self.preprocess_text(text)
        word_count = len(text.split())

        # Target lengths for BART-large-cnn
        if max_length is None or min_length is None:
            if mode == "brief":
                max_length = max(50, int(word_count * 0.2))
                min_length = max(20, int(word_count * 0.1))
            elif mode == "detailed":
                max_length = max(200, int(word_count * 0.6))
                min_length = max(100, int(word_count * 0.35))
            else: # balanced
                max_length = max(130, int(word_count * 0.35))
                min_length = max(50, int(word_count * 0.15))

        # BART max token limit usually works best <= 142 generated tokens, cap safely
        max_length = min(max_length, 256)
        min_length = min(min_length, max_length - 10)

        input_tokens = self.tokenizer.encode(text, truncation=False)

        if len(input_tokens) > 1024: # BART handles up to 1024 tokens well
            chunks = self.split_into_chunks(text, max_tokens=1000)
            summaries = []
            for chunk in chunks:
                inputs = self.tokenizer(chunk, max_length=1024, truncation=True, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                # proportional length for chunks
                chunk_max_len = max(30, max_length // len(chunks) + 20)
                chunk_min_len = max(10, min_length // len(chunks))
                chunk_min_len = min(chunk_min_len, chunk_max_len - 5)

                with torch.no_grad():
                    ids = self.model.generate(
                        inputs["input_ids"],
                        max_length=chunk_max_len,
                        min_length=chunk_min_len,
                        length_penalty=2.0,
                        num_beams=4,
                        early_stopping=True,
                    )
                summaries.append(self.tokenizer.decode(ids[0], skip_special_tokens=True))
            final_summary = " ".join(summaries)
        else:
            inputs = self.tokenizer(text, max_length=1024, truncation=True, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Ensure min_length < max_length within bounds for normal generation
            min_length = min(min_length, max_length - 5)
            
            with torch.no_grad():
                ids = self.model.generate(
                    inputs["input_ids"],
                    max_length=max_length,
                    min_length=min_length,
                    length_penalty=2.0,
                    num_beams=4,
                    early_stopping=True,
                )
            final_summary = self.tokenizer.decode(ids[0], skip_special_tokens=True)

        summary_word_count = len(final_summary.split())
        compression_ratio = round((summary_word_count / max(1, word_count)) * 100, 2)

        return {
            "summary": final_summary,
            "stats": {
                "original_words": word_count,
                "summary_words": summary_word_count,
                "compression_ratio": f"{compression_ratio}%",
                "mode": mode,
            },
            "status": "success",
        }


_summarizer_instance = None
def get_summarizer():
    global _summarizer_instance
    if _summarizer_instance is None:
        _summarizer_instance = AutoSummarizer()
    return _summarizer_instance
