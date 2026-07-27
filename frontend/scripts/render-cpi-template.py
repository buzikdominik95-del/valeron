"""Render Calipso-2.0.pdf → high-res policy-template.png and print name field coords."""
from __future__ import annotations

import fitz
from pathlib import Path

PDF = Path(__file__).resolve().parents[1] / "public" / "cpi" / "Calipso-2.0.pdf"
OUT_DIR = PDF.parent
OUT = OUT_DIR / "policy-template.png"
GRID = OUT_DIR / "policy-grid.png"
BAK = OUT_DIR / "policy-template.prev.png"


def main() -> None:
    doc = fitz.open(PDF)
    page = doc[0]
    w, h = page.rect.width, page.rect.height
    print(f"pages={doc.page_count} size_pt={page.rect}")

    zoom = 300 / 72  # 300 DPI
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    print(f"render={pix.width}x{pix.height}")

    if OUT.exists():
        BAK.write_bytes(OUT.read_bytes())
        print(f"backup -> {BAK.name} ({BAK.stat().st_size})")

    pix.save(str(OUT))
    GRID.write_bytes(OUT.read_bytes())
    print(f"saved {OUT.name} ({OUT.stat().st_size})")

    print("\n--- key lines ---")
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
            if not text:
                continue
            keys = (
                "cliente",
                "contraente",
                "calipso",
                "requisiti",
                "condizioni",
                "fornitore",
                "nome completo",
                "firma",
            )
            low = text.lower()
            if not any(k in low for k in keys):
                continue
            x0, y0, x1, y1 = line["bbox"]
            print(repr(text))
            print(
                f"  left={x0/w*100:.2f}% top={y0/h*100:.2f}% "
                f"right={x1/w*100:.2f}% bot={y1/h*100:.2f}%"
            )
            for s in line.get("spans", []):
                print(
                    f"  size={s.get('size')} font={s.get('font')} "
                    f"color={s.get('color')} text={s.get('text')!r}"
                )

    print("\n--- search Cliente / Contraente ---")
    for label in ("Cliente", "Contraente", "Cliente / Contraente"):
        hits = page.search_for(label)
        for inst in hits:
            x0, y0, x1, y1 = inst
            print(
                f"{label!r}: left={x0/w*100:.2f}% top={y0/h*100:.2f}% "
                f"right={x1/w*100:.2f}% bot={y1/h*100:.2f}% "
                f"bbox={tuple(round(v,2) for v in (x0,y0,x1,y1))}"
            )

    # Recommend name placement: after label, same baseline
    hits = page.search_for("Cliente")
    if hits:
        x0, y0, x1, y1 = hits[0]
        # full label often "Cliente / Contraente:" — find widest on that line
        line_hits = page.search_for("Contraente")
        if line_hits:
            x1 = max(x1, line_hits[0].x1)
        # colon may extend further
        colon = page.search_for("Cliente / Contraente:")
        if colon:
            x0, y0, x1, y1 = colon[0]
        name_left = (x1 + 4) / w * 100
        name_top = y0 / h * 100
        name_font_pt = (y1 - y0) * 0.92
        print("\n--- recommended CSS name overlay ---")
        print(f"left: {name_left:.2f}%;")
        print(f"top: {name_top:.2f}%;")
        print(f"approx_font_pt_on_page: {name_font_pt:.2f}")
        print(f"font_size_css_vw_hint: ~{(name_font_pt/w)*100:.3f}% of width")


if __name__ == "__main__":
    main()
