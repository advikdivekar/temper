# Lesson 7: Shrinking and serving the reader

## Fuse, then quantize
LoRA training leaves a small adapter next to the base model. Fusing merges
the adapter into the weights so one folder is the whole model. Quantizing
then stores each weight in fewer bits (16 to 8 to 4), which cuts the file
size and the memory the model reads for every word it writes.

Always re score after quantizing. Lower precision can hurt, and the only way
to know is the same benches, same documents.

## Our numbers (run 8, synthetic documents)
| Model | Size | Final bench | Silent errors | Seconds per document |
|---|---|---|---|---|
| bf16 (16 bit) | 2.3 GB | 96.1% | 0.8% | 0.88 |
| 8 bit | 1.2 GB | 96.1% | 0.8% | 0.56 |
| 4 bit | 0.68 GB | 96.1% | 0.3% | 0.39 |

Same accuracy on the final bench at a third of the size and more than twice
the speed. The hand written fresh bench moved by a few points between the
three (74.4, 73.9, 83.3 percent). With 180 documents that is noise, not a
reason to prefer 4 bit. Treat the three as equal in quality.

## Where it runs
On the Apple GPU through MLX (Metal, unified memory). No cloud, so a
customer's bills never leave the machine.

## Serving
ml/serving/extract_service.py loads the model once and answers
POST /extract on 127.0.0.1:8100. It returns the fields, a confidence for each
and a needs_review flag. It runs the same extract function the benches score,
so what we measured is what we serve. One request at a time, about 0.3 to
0.4 seconds each.

The one rule still holds: the service only reads. Code does the arithmetic,
and a person confirms anything flagged.
