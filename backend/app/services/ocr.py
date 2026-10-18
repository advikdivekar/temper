"""ocr.py

WHAT THIS FILE DOES
    Turns an uploaded file into plain text for the AI reader. The file
    can be a text file, a PDF with a text layer, a scanned PDF, or a
    photo or scan of a page (png, jpeg, tiff).

CONCEPTS IN THIS FILE
    File kind
        We look at the first bytes of the file (its magic bytes), not
        the file name, because names lie and phones rename photos.
    Text layer
        A PDF made by software already holds its text, so we copy it
        out with pdftotext. This is exact: no guessing, no OCR errors.
    OCR (optical character recognition)
        For pictures we run tesseract, which guesses the characters.
        It can misread a digit, for example 8 for 3. The reader model
        cannot see that, so a scan always goes to a person to check.
    OCR confidence
        Tesseract scores every word from 0 to 100. We average the
        scores and show it, so a blurry photo is easy to spot.
    Subprocess
        Both tools are programs on the machine. We call them with a
        time limit and never through a shell, so a file name cannot
        smuggle in a command.
"""

import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

MAX_PAGES = 5            # a bill is short; more pages is not a bill
TIMEOUT_SECONDS = 60
MIN_TEXT_CHARS = 20      # fewer characters than this means "no text layer"
TOO_BLURRY = 40.0        # below this average confidence we refuse the scan

IMAGE_STARTS = {
    b"\x89PNG": "png",
    b"\xff\xd8\xff": "jpg",
    b"II*\x00": "tif",
    b"MM\x00*": "tif",
}


class OcrUnavailable(Exception):
    """A needed program (tesseract or pdftoppm) is not installed."""


class NothingToRead(Exception):
    """The file holds no readable text."""


@dataclass
class PageText:
    text: str
    source: str                 # "text", "pdf text" or "scan"
    ocr_confidence: float | None = None   # 0 to 100, scans only

    @property
    def is_scan(self) -> bool:
        return self.source == "scan"


def file_kind(data: bytes) -> str:
    """Return pdf, png, jpg, tif or text from the first bytes."""
    if data.startswith(b"%PDF"):
        return "pdf"
    for start, kind in IMAGE_STARTS.items():
        if data.startswith(start):
            return kind
    return "text"


def _run(command: list[str]) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            command, capture_output=True, text=True,
            timeout=TIMEOUT_SECONDS, check=False,
        )
    except FileNotFoundError as error:
        raise OcrUnavailable(f"{command[0]} is not installed") from error
    except subprocess.TimeoutExpired as error:
        raise NothingToRead("Reading the file took too long") from error


def _tesseract(image: Path) -> tuple[str, float]:
    """OCR one image. Returns its text and the average word confidence."""
    plain = _run(["tesseract", str(image), "stdout", "--psm", "6"])
    detail = _run(["tesseract", str(image), "stdout", "--psm", "6", "tsv"])
    return plain.stdout, _average_confidence(detail.stdout)


def _average_confidence(tsv: str) -> float:
    """Mean of the word scores in tesseract's table output."""
    scores = []
    for line in tsv.splitlines()[1:]:
        cells = line.split("\t")
        if len(cells) < 12 or not cells[11].strip():
            continue                      # a layout row, not a word
        try:
            score = float(cells[10])
        except ValueError:
            continue
        if score >= 0:
            scores.append(score)
    return sum(scores) / len(scores) if scores else 0.0


def _pdf_text(path: Path) -> str:
    done = _run(["pdftotext", "-layout", "-l", str(MAX_PAGES), str(path), "-"])
    return done.stdout


def _pdf_scan(path: Path, folder: Path) -> PageText:
    """Draw each page as a picture, then OCR the pictures."""
    stem = folder / "page"
    _run(["pdftoppm", "-r", "200", "-l", str(MAX_PAGES), "-png",
          str(path), str(stem)])
    pages = sorted(folder.glob("page*.png"))
    if not pages:
        raise NothingToRead("The PDF has no pages we can read")
    return _join_pages(pages)


def _join_pages(images: list[Path]) -> PageText:
    texts, scores = [], []
    for image in images:
        text, score = _tesseract(image)
        texts.append(text)
        scores.append(score)
    return PageText("\n".join(texts), "scan", sum(scores) / len(scores))


def read_file(data: bytes) -> PageText:
    """The one entry point: any supported file in, plain text out."""
    kind = file_kind(data)
    if kind == "text":
        return _plain_text(data)
    with tempfile.TemporaryDirectory() as name:
        folder = Path(name)
        path = folder / f"upload.{kind}"
        path.write_bytes(data)
        if kind == "pdf":
            text = _pdf_text(path)
            if len(text.strip()) >= MIN_TEXT_CHARS:
                return PageText(text, "pdf text")
            return _finish(_pdf_scan(path, folder))
        return _finish(_join_pages([path]))


def _finish(page: PageText) -> PageText:
    if len(page.text.strip()) < MIN_TEXT_CHARS:
        raise NothingToRead("No text could be found on the page")
    if page.ocr_confidence is not None and page.ocr_confidence < TOO_BLURRY:
        raise NothingToRead(
            "The picture is too blurry or dark to read. Take it again in "
            "good light, flat and square, or type the numbers.")
    return page


def _plain_text(data: bytes) -> PageText:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = ""
    printable = sum(ch.isprintable() or ch in "\n\r\t" for ch in text)
    if not text.strip() or printable < 0.95 * len(text):
        raise NothingToRead("This file is not text, a PDF or an image")
    return PageText(text, "text")
