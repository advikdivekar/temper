"""quantize_demo.py

WHAT THIS FILE DOES
    Shows, step by step, what quantization does, using our own model.
    Part 1 does it by hand on 8 numbers. Part 2 shows the library gives
    the same result. Part 3 shows what changed inside the model. Part 4
    sends one document through the 16 bit and the 4 bit model.

    Run from the repository root:
        ml/.venv/bin/python -m ml.training.quantize_demo

CONCEPTS IN THIS FILE
    Quantization
        Storing each weight as a small whole number (0 to 15 for 4 bit)
        plus a shared scale and bias, instead of a full 16 bit number.
    Scale and bias
        For a group of weights: bias is the smallest weight, scale is
        the gap between two neighbouring codes. weight is about
        code * scale + bias.
    Group
        64 weights share one scale and one bias, so one odd weight
        cannot wreck the whole layer.
    Packing
        Eight 4 bit codes fit inside one 32 bit integer.
"""

import mlx.core as mx
from mlx.utils import tree_flatten
from mlx_lm import generate, load

from ml.extraction.raw_format import build_prompt

FULL = "ml/models/run8_bf16"
SMALL = "ml/models/run8_q4"
LAYER = "model.layers.0.self_attn.q_proj"
PAGE = ("METER READING SHEET\nPeriod: June 2026\nPrevious reading: 2,58,540\n"
        "Current reading: 5,28,063\nMultiplier: 1 (readings in kWh)\n")


def by_hand(weights: list) -> None:
    """4 bit quantization of one small group, written out as plain math."""
    low, high = min(weights), max(weights)
    scale = (high - low) / 15          # 16 levels, 15 gaps
    print("PART 1  by hand, 8 weights, 4 bit")
    print(f"  smallest = {low:.5f} (this becomes the bias)")
    print(f"  largest  = {high:.5f}")
    print(f"  scale    = (largest - smallest) / 15 = {scale:.6f}\n")
    print("  weight      code = round((weight - bias) / scale)   back = code * scale + bias")
    for w in weights:
        code = round((w - low) / scale)
        print(f"  {w:+.5f}     {code:>2}                                     {code * scale + low:+.5f}")


def real_layer_rows(model) -> mx.array:
    params = dict(tree_flatten(model.parameters()))
    return params[LAYER + ".weight"]


def library_check(weight: mx.array) -> None:
    """The same thing with the library, on one group of 64 real weights."""
    group = weight[0, :64]
    q, scales, biases = mx.quantize(group.reshape(1, 64), group_size=64, bits=4)
    print("\nPART 2  the library, same idea on 64 real weights")
    print(f"  scale {float(scales[0, 0]):.6f}   bias {float(biases[0, 0]):+.6f}")
    codes = [(int(q[0, k // 8]) >> (4 * (k % 8))) & 15 for k in range(8)]
    print(f"  first 8 codes: {codes}   (eight codes packed inside one integer: {int(q[0, 0])})")


def what_changed(full, small) -> None:
    print("\nPART 3  what changed inside the model")
    for name, model in (("16 bit", full), ("4 bit ", small)):
        layer = model.layers[0].self_attn.q_proj
        weight = layer.weight
        extra = f", plus scales {layer.scales.shape} and biases {layer.biases.shape}" if hasattr(layer, "scales") else ""
        print(f"  {name}  {type(layer).__name__:<16} weight {weight.shape} {weight.dtype}{extra}")


def answer(model, tokenizer) -> str:
    chat = tokenizer.apply_chat_template(
        [{"role": "user", "content": build_prompt("electricity_bill", PAGE)}],
        add_generation_prompt=True, tokenize=False)
    return generate(model, tokenizer, prompt=chat, max_tokens=120, verbose=False)


def main() -> None:
    full, tok_full = load(FULL)
    small, tok_small = load(SMALL)
    weight = real_layer_rows(full)
    by_hand([float(x) for x in weight[0, :8]])
    library_check(weight)
    what_changed(full, small)
    print("\nPART 4  one document, both models")
    print(f"  16 bit says: {answer(full, tok_full)}")
    print(f"  4 bit says:  {answer(small, tok_small)}")
    print("  code then computes 528063 - 258540 = 269523 kWh either way")


if __name__ == "__main__":
    main()
