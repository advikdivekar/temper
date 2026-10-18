"""finetuned_raw.py

WHAT THIS FILE DOES
    The fine tuned model that COPIES (see raw_format.py), wrapped so it
    returns the usual Extraction. The model reads, ordinary code does
    the arithmetic (calculate.py), and a page check sets the confidence.
"""

from mlx_lm import generate, load

from ml.extraction.calculate import to_extraction
from ml.extraction.finetuned_mlx import BASE
from ml.extraction.raw_format import build_prompt, parse


def make_extractor(adapter_path: str, base: str = BASE):
    model, tokenizer = load(base, adapter_path=adapter_path)

    def extract(doc_type: str, text: str):
        messages = [{"role": "user", "content": build_prompt(doc_type, text)}]
        chat = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
        answer = generate(model, tokenizer, prompt=chat, max_tokens=220, verbose=False)
        return to_extraction(doc_type, parse(answer), text)

    return extract
