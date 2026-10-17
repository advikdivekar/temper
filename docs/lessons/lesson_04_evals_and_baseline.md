# Lesson 4: Evals and a baseline (start of the ML track)

## Why we start here, not with a model
Fine tuning, quantization and preference tuning are all ways of making an
extractor better. "Better" needs a number. So the first job is not a model:
it is a fixed test bench, and a simple reader to beat.

## The four pieces (all under ml/)
1. data/synthetic_documents.py: fake factory documents with the correct
   answers. Three kinds, nine layouts, Indian number grouping (1,25,000),
   different units (kWh vs MWh, MT vs KL, tonnes vs kg).
2. extraction/schema.py: the one shape every extractor returns: named fields
   with a value, a confidence and the source text.
3. extraction/baseline_regex.py: hand written patterns. Deliberately simple.
4. evals/run_eval.py: runs an extractor over the documents and scores it.

## What the first run showed
Baseline: 63.3 percent of documents fully right. It scores 100 percent on six
layouts and 0 percent on three: MWh electricity bills, diesel in kilolitres,
and weights in kilograms. An average hides that. Slicing by layout reveals it.
This is brittleness: patterns only know the layouts their author imagined.

## Concepts to know
- Ground truth: answers written down when the document is generated.
- Document accuracy: counts only if EVERY required field is right. Strict.
- Review rate: fields below a confidence threshold go to a person. A good
  reader is accurate AND knows when it is unsure.
- Reproducibility: the generator is seeded, so the same documents always
  appear and results are comparable.
- Honesty: all documents are synthetic. A score here is not a claim about
  real Indian bills, and the report says so.

## Next steps in the track
1. Render documents as images (scans, photos) so vision models can be tested.
2. A prompted open weight vision language model, with and without chain of
   thought, scored on the same bench.
3. Distillation: a stronger model labels more synthetic data.
4. LoRA fine tune of a small vision model, then 4 bit quantization.
5. Preference tuning (DPO) from corrections made in the review screen.
Each is scored on this same bench against the 63.3 percent baseline.

## Try it
    backend/.venv/bin/python -m ml.evals.run_eval
    backend/.venv/bin/python -m pytest ml/tests -q
Then add a new layout to the generator and watch the baseline fail on it.
