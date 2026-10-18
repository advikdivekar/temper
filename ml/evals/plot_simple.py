"""plot_simple.py

WHAT THIS FILE DOES
    One small figure with the numbers that matter, for run 6 and run 7
    side by side on each exam: how many documents are fully right, and
    how many fields are wrong with nobody asked to check them.
    Output: ml/evals/figures/simple_summary.png

    Run it (needs matplotlib):
        python -m ml.evals.plot_simple
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt

HERE = Path(__file__).parent
EXAMS = ["clean", "hard", "fresh", "mixed"]
NAMES = ["Clean\n(easy)", "Hard\n(tuned against)", "Fresh\n(new for run 6,\nread before run 7)", "Mixed\n(new words)"]
COLORS = {"run 6": "#9aa8b4", "run 7": "#1c8a7a"}


def load(name: str) -> dict:
    return json.loads((HERE / f"report_{name}.json").read_text())


def scores() -> dict:
    """{run: {exam: (accuracy %, silent error %)}}"""
    run6 = load("run6")
    run6["fresh"] = load("run6_fresh")["fresh"]
    out = {}
    for label, report in [("run 6", run6), ("run 7", load("run7"))]:
        out[label] = {exam: (report[exam]["document_accuracy"] * 100,
                             report[exam]["silent_error_rate"] * 100)
                      for exam in EXAMS if exam in report}
    return out


def draw(ax, data: dict, index: int, title: str, unit: str, top: float) -> None:
    width = 0.38
    for k, (run, per_exam) in enumerate(data.items()):
        for i, exam in enumerate(EXAMS):
            if exam not in per_exam:
                continue
            value = per_exam[exam][index]
            x = i + (k - 0.5) * width
            ax.bar(x, value, width, color=COLORS[run], label=run if i == 0 else None)
            ax.text(x, value + top * 0.012, f"{value:.1f}{unit}", ha="center", fontsize=9)
    ax.set_xticks(range(len(EXAMS)), NAMES, fontsize=9)
    ax.set_title(title, loc="left", fontweight="bold")
    ax.spines[["top", "right"]].set_visible(False)


def main() -> None:
    data = scores()
    fig, (left, right) = plt.subplots(1, 2, figsize=(12, 4.6), constrained_layout=True)
    draw(left, data, 0, "Documents fully right (%)", "%", 112)
    left.set_ylim(0, 112)
    left.legend(frameon=False, loc="upper right")
    draw(right, data, 1, "Wrong and nobody asked to check (%)  lower is better", "%", 14)
    right.set_ylim(0, 14)
    path = HERE / "figures" / "simple_summary.png"
    path.parent.mkdir(exist_ok=True)
    fig.savefig(path, dpi=160)
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
