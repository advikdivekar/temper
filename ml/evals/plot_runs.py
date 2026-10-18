"""plot_runs.py

WHAT THIS FILE DOES
    Draws one figure from the saved score reports (report_*.json) that
    compares every extraction run. Output: ml/evals/figures/run_summary.png

    Panel A  One model, three exams: how far the score falls when the
             exam is one we never tuned against.
    Panel B  What happens to the fields: right, wrong but flagged for a
             person, or wrong and nobody asked to check.
    Panel C  Layout by run heatmap: where each fix helped or hurt.

CONCEPTS IN THIS FILE
    Tuned against vs untouched
        A bench we read the failures of becomes a practice exam. Only
        a bench nobody looked at tells the truth about new documents.
    Silent error
        A wrong field that carries a high confidence, so no person is
        asked to check it. The worst kind of error for this product.

    Run it (needs matplotlib, seaborn, pandas):
        python -m ml.evals.plot_runs
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

HERE = Path(__file__).parent
OUT = HERE / "figures"

INK, MUTED, RED, AMBER, GREEN = "#14202b", "#7a8894", "#c9402f", "#d99a1e", "#1c8a7a"


def load(name: str) -> dict:
    return json.loads((HERE / f"report_{name}.json").read_text())


def exam_table() -> pd.DataFrame:
    """Document accuracy per run and exam, in percent."""
    rows = []
    for name, label in [("baseline", "Regex rules")]:
        rep = load(name)
        rows.append((label, rep["clean"]["document_accuracy"], rep["hard"]["document_accuracy"], None, None))
    four = load("gemma3_4b_few_shot")["document_accuracy"]
    four_hard = load("gemma3_4b_few_shot_hard")["document_accuracy"]
    rows.append(("4B prompted", four, four_hard, None, None))
    for n in range(1, 8):
        rep = load(f"run{n}")
        fresh = rep.get("fresh", {}).get("document_accuracy")
        mixed = rep.get("mixed", {}).get("document_accuracy")
        if n == 6:
            fresh = load("run6_fresh")["fresh"]["document_accuracy"]
        rows.append((f"Run {n}", rep["clean"]["document_accuracy"],
                     rep["hard"]["document_accuracy"], fresh, mixed))
    frame = pd.DataFrame(rows, columns=["run", "clean", "hard", "fresh", "mixed"])
    frame[["clean", "hard", "fresh", "mixed"]] *= 100
    return frame


def panel_gap(ax, table: pd.DataFrame) -> None:
    """Dumbbell: easy, tuned against, untouched, joined by a line."""
    for y, row in table.iterrows():
        values = row[["clean", "hard", "fresh", "mixed"]].dropna()
        ax.plot([values.min(), values.max()], [y, y], color="#d7dee5", lw=3, zorder=1)
        ax.scatter(row.clean, y, s=70, facecolor="white", edgecolor=MUTED, lw=1.8, zorder=3)
        if pd.notna(row.hard):
            ax.scatter(row.hard, y, s=70, color=INK, zorder=3)
        if pd.notna(row.fresh):
            read = row.run == "Run 7"   # run 7 fresh was read afterwards
            ax.scatter(row.fresh, y, s=80, zorder=4, edgecolor=RED, lw=1.8,
                       facecolor="white" if read else RED)
        if pd.notna(row.mixed):
            ax.scatter(row.mixed, y, s=80, color=RED, zorder=4)
    ax.annotate("run 6: 96% on the tuned exam,\n32% on an untouched one", (31.7, 7),
                xytext=(4, 4.2), fontsize=9, color=RED,
                arrowprops=dict(arrowstyle="->", color=RED, lw=1))
    ax.set_yticks(range(len(table)), table.run)
    ax.invert_yaxis()
    ax.set_xlim(0, 104)
    ax.set_xlabel("Documents with every field right (%)")
    ax.set_title("A. One model, three exams: the tuned score is not the real score",
                 loc="left", fontsize=12, fontweight="bold")
    handles = [
        plt.Line2D([], [], marker="o", ls="", mfc="white", mec=MUTED, mew=1.8, label="easy known layouts"),
        plt.Line2D([], [], marker="o", ls="", color=INK, label="layouts we tuned against"),
        plt.Line2D([], [], marker="o", ls="", color=RED, label="untouched when scored"),
        plt.Line2D([], [], marker="o", ls="", mfc="white", mec=RED, mew=1.8, label="fresh exam read afterwards"),
    ]
    ax.legend(handles=handles, loc="lower left", frameon=False, fontsize=8.5)
    sns.despine(ax=ax, left=True)


def stack_table() -> pd.DataFrame:
    """Field outcomes (right, flagged, silent) for each scored exam."""
    items = []
    for n in (3, 4, 5, 6, 7):
        items.append((f"run {n}\ntuned", load(f"run{n}")["hard"]))
    items.append(("run 6\nuntouched", load("run6_fresh")["fresh"]))
    items.append(("run 7\nfresh (read)", load("run7")["fresh"]))
    items.append(("run 7\nuntouched", load("run7")["mixed"]))
    rows = [(label, r["field_accuracy"] * 100, r["caught_error_rate"] * 100,
             r["silent_error_rate"] * 100) for label, r in items]
    return pd.DataFrame(rows, columns=["exam", "right", "flagged", "silent"]).set_index("exam")


def panel_trust(ax, table: pd.DataFrame) -> None:
    table.plot(kind="barh", stacked=True, ax=ax, width=0.7,
               color=[GREEN, AMBER, RED], legend=False)
    for y, (_, row) in enumerate(table.iterrows()):
        if row.silent >= 2:
            ax.text(100 - row.silent / 2, y, f"{row.silent:.1f}", color="white",
                    ha="center", va="center", fontsize=8, fontweight="bold")
    ax.invert_yaxis()
    ax.set_xlim(0, 100)
    ax.set_ylabel("")
    ax.set_xlabel("Share of fields (%)")
    ax.set_title("B. Wrong is fine if flagged; red is the danger",
                 loc="left", fontsize=12, fontweight="bold")
    ax.legend(["right", "wrong, flagged for a person", "wrong, nobody asked"],
              loc="lower center", bbox_to_anchor=(0.5, -0.32), ncol=3,
              frameon=False, fontsize=8.5)
    sns.despine(ax=ax, left=True)


def heat_table() -> pd.DataFrame:
    """Hard bench accuracy per layout for runs 4 to 7."""
    data = {f"run {n}": load(f"run{n}")["hard"]["by_layout"] for n in (4, 5, 6, 7)}
    frame = pd.DataFrame(data) * 100
    frame.index = [name.replace("/", " · ").replace("_", " ") for name in frame.index]
    move = frame.diff(axis=1).abs().max(axis=1)
    return frame.loc[move.sort_values(ascending=False).index]


def panel_heat(ax, table: pd.DataFrame) -> None:
    sns.heatmap(table, annot=True, fmt=".0f", cmap="RdYlGn", vmin=0, vmax=100,
                linewidths=1, linecolor="white", cbar=False, ax=ax,
                annot_kws={"fontsize": 8})
    ax.set_title("C. Layouts that moved most come first; fixes can break others",
                 loc="left", fontsize=12, fontweight="bold")
    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.tick_params(axis="y", labelsize=8, length=0)
    ax.tick_params(axis="x", length=0)


def main() -> None:
    sns.set_theme(style="whitegrid", font="DejaVu Sans")
    OUT.mkdir(exist_ok=True)
    fig = plt.figure(figsize=(15, 13), constrained_layout=True)
    grid = fig.add_gridspec(2, 2, height_ratios=[1, 1.15])
    panel_gap(fig.add_subplot(grid[0, :]), exam_table())
    panel_trust(fig.add_subplot(grid[1, 0]), stack_table())
    panel_heat(fig.add_subplot(grid[1, 1]), heat_table())
    fig.suptitle("Temper bill reader: seven runs on synthetic documents",
                 fontsize=15, fontweight="bold", x=0.01, ha="left")
    path = OUT / "run_summary.png"
    fig.savefig(path, dpi=160)
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
