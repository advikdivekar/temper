# Lesson 5: Arithmetic for small models

Source: "Teaching Arithmetic to Small Transformers" (Lee et al., 2023,
arXiv 2307.03381). Read in full. The paper trains small models (10M to 124M
parameters, plus GPT 3 fine tuning) on pure arithmetic. Our case is different:
a 1B pretrained model that must also read messy text. So treat each idea as a
hypothesis to test on our bench, not a guarantee.

## Why our model failed at subtraction
The paper finds models learn arithmetic as a mapping tied to the digit lengths
and formats they saw, not as a general algorithm. Our run 2 fits this: unit
conversion transferred (a fixed rule), subtraction did not (needs digit by
digit work with borrows).

## Ideas, ranked for Temper

1. Let code do the arithmetic (our design rule, and the paper's lesson in
   practice). Model copies "previous" and "current"; code subtracts.
2. Scratchpad (chain of thought written into the TRAINING targets). The
   strongest result in the paper. Fine tuned GPT 3 Davinci, 1000 samples:
   subtraction 0.1 percent to 99.5 percent with a detailed scratchpad
   (plain format 84.8, reverse 66.0). Cost: about 281 tokens per sum versus 13.
3. Verify the model's work with code. Model writes the scratchpad and the
   answer. Code recomputes with Decimal. A mismatch lowers confidence and
   sends the field to a person. (Our extension; the paper shows why a check
   is needed.)
4. Digit spacing "2 5 8 5 4 0". Uniform tokenization helped GPT 2 a lot
   (Figure 20). Likely related to our digit copy errors (17,759 became 1779),
   since Llama style tokenizers group digits unevenly. To confirm by test.
5. Balanced sampling. Random numbers rarely give 1 digit values or long borrow
   chains. Sample by digit length and by number of borrows (Figure 3).
6. Train every digit length we expect. Models cannot extrapolate to lengths
   they never saw (Figure 22). Our readings are 5 to 7 digits only.
7. One format, from the start. Switching formats makes the model "unlearn"
   and does worse (Figure 13). Retrain from the base model, not from run 2.
8. Subtraction without comparing first. Decide-which-is-larger steps cost
   accuracy (89.9 versus 100 percent). Use plain digit wise borrow steps.
9. Exact scratchpads. Wrong intermediate steps in training slow learning
   (Figure 9). Our generator can write them correctly by construction.
10. Joint training of all operations. Helps some operations, slightly hurts
    subtraction (Table 4). Mix subtraction, addition and unit conversion.
11. Richer evaluation slices by digit length and borrow count, plus held out
    digit lengths, like the paper's exclusion tests.
12. Larger LoRA capacity (rank 16 to 32). The paper fine tunes all weights;
    ours trains about 0.2 percent. A guess to test, not a paper result.
13. Reverse (least significant digit first) output. Cheap and good for
    addition, worse for subtraction in GPT 3. Only for the weekly totals.

## Cautions
- Token cost: detailed scratchpads make answers several times longer, so the
  1B model gets slower. A shorter scratchpad is a middle path.
- Their strongest numbers are on 3 digit sums. Ours are 6 digit values inside
  noisy text. Measure, do not assume.
- Length generalization stays an open problem even in the paper.
