from __future__ import annotations

import argparse
import math
import os
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF


@dataclass(frozen=True)
class PageRange:
    start: int  # 1-indexed, inclusive
    end: int  # 1-indexed, inclusive


def _parse_page_range(spec: str) -> PageRange:
    s = spec.strip().lower()
    if s in {"all", ""}:
        return PageRange(start=1, end=10**9)
    if "-" in s:
        a, b = s.split("-", 1)
        start = int(a.strip())
        end = int(b.strip())
    else:
        start = int(s)
        end = start
    if start <= 0 or end <= 0:
        raise ValueError("page range must be positive (1-indexed)")
    if end < start:
        raise ValueError("page range end must be >= start")
    return PageRange(start=start, end=end)


def _human_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    units = ["KB", "MB", "GB", "TB"]
    n = float(num_bytes)
    for u in units:
        n /= 1024.0
        if n < 1024.0:
            return f"{n:.2f} {u}"
    return f"{n:.2f} PB"


def _default_out_path(src: Path, *, suffix: str) -> Path:
    return src.with_name(f"{src.stem}.{suffix}{src.suffix}")


def compress_pdf_via_rasterize(
    src: Path,
    dst: Path,
    *,
    dpi: int = 150,
    jpeg_quality: int = 60,
    page_range: PageRange,
) -> None:
    if dpi < 72 or dpi > 400:
        raise ValueError("dpi must be between 72 and 400")
    if jpeg_quality < 1 or jpeg_quality > 100:
        raise ValueError("jpeg_quality must be between 1 and 100")

    src = src.expanduser().resolve()
    dst = dst.expanduser().resolve()
    if not src.exists():
        raise FileNotFoundError(src)
    if src.suffix.lower() != ".pdf":
        raise ValueError("source must be a .pdf")

    dst.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(src))
    try:
        page_count = doc.page_count
        start_0 = max(page_range.start - 1, 0)
        end_0 = min(page_range.end - 1, page_count - 1)
        if start_0 > end_0:
            raise ValueError(
                f"page range {page_range.start}-{page_range.end} "
                f"does not overlap 1-{page_count}"
            )

        out = fitz.open()
        try:
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            for i in range(start_0, end_0 + 1):
                page = doc.load_page(i)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes(output="jpeg", jpg_quality=jpeg_quality)

                rect = fitz.Rect(0, 0, pix.width, pix.height)
                new_page = out.new_page(width=rect.width, height=rect.height)
                new_page.insert_image(rect, stream=img_bytes)

            out.save(
                str(dst),
                deflate=True,
                garbage=4,
                clean=True,
                linear=True,
            )
        finally:
            out.close()
    finally:
        doc.close()


def split_pdf(src: Path, out_dir: Path, *, chunk_pages: int = 25) -> list[Path]:
    if chunk_pages <= 0:
        raise ValueError("chunk_pages must be > 0")

    src = src.expanduser().resolve()
    out_dir = out_dir.expanduser().resolve()
    if not src.exists():
        raise FileNotFoundError(src)
    if src.suffix.lower() != ".pdf":
        raise ValueError("source must be a .pdf")

    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(src))
    try:
        total = doc.page_count
        parts: list[Path] = []
        part_count = int(math.ceil(total / chunk_pages))
        for part_idx in range(part_count):
            start = part_idx * chunk_pages
            end = min(start + chunk_pages, total)
            out_path = out_dir / f"{src.stem}.part{part_idx+1:02d}.{start+1}-{end}.pdf"
            new_doc = fitz.open()
            try:
                new_doc.insert_pdf(doc, from_page=start, to_page=end - 1)
                new_doc.save(
                    str(out_path),
                    deflate=True,
                    garbage=4,
                    clean=True,
                    linear=True,
                )
            finally:
                new_doc.close()
            parts.append(out_path)
        return parts
    finally:
        doc.close()


def main() -> int:
    p = argparse.ArgumentParser(
        description=(
            "Compress (rasterize) or split a PDF for easier uploading.\n"
            "NOTE: rasterize mode turns each page into a JPEG image; "
            "this dramatically reduces file size but makes text non-selectable."
        )
    )
    p.add_argument("input_pdf", type=Path, help="Path to the input PDF")

    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("compress", help="Rasterize pages to smaller PDF")
    c.add_argument("--dpi", type=int, default=150, help="Render DPI (default: 150)")
    c.add_argument(
        "--jpeg-quality",
        type=int,
        default=60,
        help="JPEG quality 1-100 (default: 60)",
    )
    c.add_argument(
        "--pages",
        type=str,
        default="all",
        help='Page range like "1-20", "5", or "all" (default: all)',
    )
    c.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output PDF path (default: <input>.small.pdf)",
    )

    s = sub.add_parser("split", help="Split PDF into smaller parts")
    s.add_argument(
        "--chunk-pages",
        type=int,
        default=25,
        help="Pages per part (default: 25)",
    )
    s.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Output directory (default: ./pdf_parts)",
    )

    args = p.parse_args()
    src = args.input_pdf

    if args.cmd == "compress":
        out = args.output or _default_out_path(src, suffix="small")
        page_range = _parse_page_range(args.pages)
        before = src.stat().st_size if src.exists() else 0
        compress_pdf_via_rasterize(
            src,
            out,
            dpi=args.dpi,
            jpeg_quality=args.jpeg_quality,
            page_range=page_range,
        )
        after = out.stat().st_size if out.exists() else 0
        print(
            f"Wrote: {out}\n"
            f"Size: {_human_size(before)} -> {_human_size(after)}\n"
            f"(dpi={args.dpi}, jpeg_quality={args.jpeg_quality}, pages={args.pages})"
        )
        return 0

    if args.cmd == "split":
        out_dir = args.out_dir or Path("pdf_parts")
        parts = split_pdf(src, out_dir, chunk_pages=args.chunk_pages)
        print(f"Wrote {len(parts)} files to: {out_dir.resolve()}")
        for path in parts:
            print(f"- {path.name} ({_human_size(path.stat().st_size)})")
        return 0

    raise RuntimeError("unreachable")


if __name__ == "__main__":
    raise SystemExit(main())

