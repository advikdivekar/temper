"""test_ocr.py

Turning files into text: plain text, a PDF with a text layer, a scanned
PDF and a photo. The pictures are drawn here with Pillow so the tests
need no sample files. Tests that need tesseract or poppler are skipped
on a machine without them.
"""

import io
import shutil

import pytest
from PIL import Image, ImageDraw, ImageFont

from app.services import ocr, reader
from tests.test_reader import BILL, fake_answer, setup, upload

LINES = ["Previous reading: 258540", "Current reading: 528063 kWh"]

needs_tesseract = pytest.mark.skipif(
    shutil.which("tesseract") is None, reason="tesseract not installed")
needs_poppler = pytest.mark.skipif(
    shutil.which("pdftotext") is None, reason="poppler not installed")


def drawn_page() -> Image.Image:
    page = Image.new("RGB", (900, 260), "white")
    pen = ImageDraw.Draw(page)
    font = ImageFont.load_default(size=36)
    for row, line in enumerate(LINES):
        pen.text((30, 30 + row * 70), line, fill="black", font=font)
    return page


def as_bytes(kind: str) -> bytes:
    out = io.BytesIO()
    drawn_page().save(out, format=kind)
    return out.getvalue()


def text_pdf() -> bytes:
    """A tiny hand written PDF whose page holds real text."""
    stream = "BT /F1 14 Tf 40 700 Td (Current reading: 528063 kWh) Tj ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    body, offsets = "%PDF-1.4\n", []
    for number, obj in enumerate(objects, 1):
        offsets.append(len(body))
        body += f"{number} 0 obj\n{obj}\nendobj\n"
    start = len(body)
    body += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    body += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    body += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
    body += f"startxref\n{start}\n%%EOF\n"
    return body.encode()


def test_file_kind_uses_the_first_bytes():
    assert ocr.file_kind(b"%PDF-1.7 ...") == "pdf"
    assert ocr.file_kind(b"\x89PNG\r\n") == "png"
    assert ocr.file_kind(b"\xff\xd8\xff\xe0") == "jpg"
    assert ocr.file_kind(b"Current reading: 5") == "text"


def test_plain_text_passes_through_and_junk_is_refused():
    page = ocr.read_file(BILL)
    assert page.source == "text" and not page.is_scan
    with pytest.raises(ocr.NothingToRead):
        ocr.read_file(bytes(range(256)) * 4)


@needs_poppler
def test_pdf_with_text_layer_is_copied_exactly():
    page = ocr.read_file(text_pdf())
    assert page.source == "pdf text" and "528063" in page.text
    assert page.ocr_confidence is None


@needs_tesseract
def test_photo_is_read_with_a_confidence():
    page = ocr.read_file(as_bytes("PNG"))
    assert page.is_scan and "528063" in page.text.replace(",", "")
    assert page.ocr_confidence > 60


@needs_tesseract
@needs_poppler
def test_scanned_pdf_is_drawn_then_read():
    page = ocr.read_file(as_bytes("PDF"))
    assert page.is_scan and "258540" in page.text.replace(",", "")


@needs_tesseract
def test_blank_page_has_nothing_to_read():
    blank = io.BytesIO()
    Image.new("RGB", (400, 200), "white").save(blank, format="PNG")
    with pytest.raises(ocr.NothingToRead):
        ocr.read_file(blank.getvalue())


@needs_tesseract
def test_unreadable_noise_is_refused_as_too_blurry():
    import random
    rng = random.Random(1)
    noise = Image.new("L", (400, 200))
    noise.putdata([rng.randint(0, 255) for _ in range(400 * 200)])
    out = io.BytesIO()
    noise.save(out, format="PNG")
    with pytest.raises(ocr.NothingToRead):
        ocr.read_file(out.getvalue())


@needs_tesseract
def test_scan_through_the_api_always_needs_a_check(tmp_path, monkeypatch):
    client, headers, _ = setup(tmp_path, monkeypatch,
                               answer=fake_answer(review=False))
    seen = {}

    def spy(url, doc_type, text, timeout=60):
        seen["text"] = text
        return fake_answer(review=False)
    monkeypatch.setattr(reader, "read_document", spy)
    photo = upload(client, headers, as_bytes("PNG"), "photo.png")
    done = client.post(f"/evidence/{photo}/read", headers=headers,
                       json={"doc_type": "electricity_bill"}).json()
    assert done["needs_review"] is True and done["source"] == "scan"
    assert done["ocr_confidence"] > 0 and "528063" in seen["text"].replace(",", "")


def test_original_file_is_served_to_its_owner_only(tmp_path, monkeypatch):
    client, headers, _ = setup(tmp_path, monkeypatch)
    photo = upload(client, headers, as_bytes("PNG"), "photo.png")
    got = client.get(f"/evidence/{photo}/file", headers=headers)
    assert got.status_code == 200 and got.headers["content-type"] == "image/png"
    assert got.headers["x-content-type-options"] == "nosniff"
    assert client.get(f"/evidence/{photo}/file").status_code in (401, 403)
