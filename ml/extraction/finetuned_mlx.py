"""finetuned_mlx.py

WHAT THIS FILE DOES
    Extracts fields with the fine tuned small model: the base model plus
    the LoRA adapter we trained, run locally through MLX on the Mac's GPU.

CONCEPTS IN THIS FILE
    LoRA adapter
        A small file of extra weights (a few MB) that sits on top of the
        untouched base model. Load the base, load the adapter, and the
        model now behaves like the fine tuned one.
    Chat template
        Instruct models expect the prompt wrapped in their own turn
        markers. Training used the template, so inference must too.
    Greedy decoding
        Always pick the most likely next token. No randomness, so a run
        can be repeated exactly.
    Same prompt as training
        We use the zero shot prompt. A fine tuned model needs no solved
        examples in the prompt: the lessons are in its weights.
"""

import json

from mlx_lm import generate, load

from ml.extraction.prompted_llm import build_prompt
from ml.extraction.schema import REQUIRED_FIELDS, ExtractedField, Extraction

BASE = "mlx-community/Llama-3.2-1B-Instruct-bf16"


def make_extractor(adapter_path: str, base: str = BASE):
    model, tokenizer = load(base, adapter_path=adapter_path)

    def extract(doc_type: str, text: str) -> Extraction:
        prompt = build_prompt(doc_type, text, "zero_shot")
        messages = [{"role": "user", "content": prompt}]
        chat = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
        raw = generate(model, tokenizer, prompt=chat, max_tokens=80, verbose=False)
        try:
            answer = json.loads(raw.strip())
        except json.JSONDecodeError:
            answer = {}
        out = Extraction(doc_type)
        complete = all(name in answer for name in REQUIRED_FIELDS[doc_type])
        for name in REQUIRED_FIELDS[doc_type]:
            if name in answer:
                out.fields.append(ExtractedField(name, answer[name], 0.9 if complete else 0.5))
        return out

    return extract
