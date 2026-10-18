# Lesson 6: Scores that mean something

What eight fine tuning runs taught us about measuring a reader honestly.
All numbers are on SYNTHETIC documents only.

## The score you tune against stops being a test
Run 6 scored 96.3 percent on the hard bench. The same model scored 31.7 on
layouts nobody had touched. We had read the failures on the hard bench and
added training pages to fix them, so the bench had become a practice exam.
Rule: once you read a bench's failures, call it a dev set. Keep one bench
that nobody reads until the final score, and score each model on it once.

## Silent errors matter more than accuracy
A wrong field that gets flagged goes to a person. A wrong field with high
confidence goes into a signed statement. Every run is judged on both numbers.
Checks written in code turn silent errors into flagged ones:
- grounding: every copied number must be on the page, no more often than
  the page writes it
- coverage: every number written with a unit on the page must be copied
  (the model drops the last item of a list)
- labels: the fuel and product come from page words, then from the unit
- sanity: a difference of zero is flagged

## Variety beats volume
Hand written layouts taught the model those layouts. A page generator
(compose_documents.py) builds pages from interchangeable pieces. Every word
list is split into train words and test words, so a test bench can use wording
the model never saw, and can be remade with a new seed when it is used up.

## Results (document accuracy, silent errors)
| Run | hard (tuned) | untouched | silent on untouched |
|---|---|---|---|
| 6 | 96.3% | 31.7% (hand written fresh) | 9.2% |
| 7 | 87.2% | 75.6% (composed, new words) | 10.6% |
| 8 | 99.8% | 96.1% (final, composed, new words) | 0.8% |

## What the 96.1 does not say
The final bench uses the same generator as training, with new words. It
measures new wording, not new structure. On the hand written fresh layouts
(different structure) run 8 scores 73.9 percent with 5.3 percent silent
errors. Real customer paper will differ in ways neither bench covers. The
next honest step is a handful of real documents.
