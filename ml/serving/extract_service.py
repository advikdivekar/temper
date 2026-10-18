"""extract_service.py

WHAT THIS FILE DOES
    Serves the fine tuned reader over HTTP on this machine, so the
    backend (or anything else) can send a document's text and get back
    the extracted fields with a confidence for each.

        POST /extract   {"doc_type": "fuel_invoice", "text": "..."}
        GET  /health

    Run from the repository root with the ml virtual environment:
        ml/.venv/bin/python -m ml.serving.extract_service ml/models/run8_q4

CONCEPTS IN THIS FILE
    Serving
        Loading the model once at start up and answering many requests,
        instead of loading it for every document.
    Same interface
        The service wraps the same extract(doc_type, text) function the
        eval harness scores, so what we measured is what we serve.
    Needs review
        If any field has a confidence under the review threshold (or a
        field is missing) the answer says so, and a person must look.
        The AI reads, a human confirms.
    One request at a time
        The model runs on the Apple GPU through MLX. A plain single
        threaded server keeps requests in a queue, which is the safe way
        to share one model.
    Local only
        It listens on 127.0.0.1. Documents never leave the machine.
"""

import json
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from ml.evals.run_eval import REVIEW_THRESHOLD
from ml.extraction.schema import DOC_TYPES, REQUIRED_FIELDS

PORT = 8100
MAX_BODY = 200_000   # bytes; a bill is a few hundred characters


def answer(extract, doc_type: str, text: str) -> dict:
    """Run the reader and shape the reply."""
    start = time.time()
    result = extract(doc_type, text)
    fields = [{"name": f.name, "value": f.value, "confidence": f.confidence}
              for f in result.fields]
    missing = [n for n in REQUIRED_FIELDS[doc_type] if result.get(n) is None]
    low = any(f["confidence"] < REVIEW_THRESHOLD for f in fields)
    return {"doc_type": doc_type, "fields": fields, "missing": missing,
            "needs_review": bool(missing) or low,
            "seconds": round(time.time() - start, 2)}


def make_handler(extract):
    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, body: dict) -> None:
            data = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            self._send(200 if self.path == "/health" else 404,
                       {"status": "ok"} if self.path == "/health" else {"error": "not found"})

        def do_POST(self):
            if self.path != "/extract":
                return self._send(404, {"error": "not found"})
            size = int(self.headers.get("Content-Length", 0))
            if size > MAX_BODY:
                return self._send(413, {"error": "document too large"})
            try:
                body = json.loads(self.rfile.read(size))
                doc_type, text = body["doc_type"], str(body["text"])
            except (ValueError, KeyError, TypeError):
                return self._send(400, {"error": "send doc_type and text"})
            if doc_type not in DOC_TYPES:
                return self._send(400, {"error": f"doc_type must be one of {DOC_TYPES}"})
            self._send(200, answer(extract, doc_type, text))

        def log_message(self, *args):   # keep the console quiet
            pass

    return Handler


def main() -> None:
    from ml.extraction import finetuned_raw   # needs MLX, so load it here

    model_path = sys.argv[1] if len(sys.argv) > 1 else "ml/models/run8_q4"
    extract = finetuned_raw.make_extractor(None, base=model_path)
    server = HTTPServer(("127.0.0.1", PORT), make_handler(extract))
    print(f"Serving {model_path} on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
