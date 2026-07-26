"""Remove baked checkerboard / light gray background from lender stamp & signature."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

BASE = Path(__file__).resolve().parents[1] / "public" / "cpi"


def remove_checker_bg(path_in: Path, path_png: Path, path_webp: Path | None = None) -> None:
    im = Image.open(path_in).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # Soft matte: dark/blue ink -> opaque; light gray/white checker -> transparent
    ink_from_dark = np.clip((210.0 - lum) * 2.6, 0, 255)
    ink_from_sat = np.clip((sat - 8.0) * 4.2, 0, 255)
    alpha = np.maximum(ink_from_dark, ink_from_sat)

    # Hard kill pure neutral light (checkerboard cells)
    neutral_light = (sat < 14.0) & (lum > 188.0)
    alpha = np.where(neutral_light, 0.0, alpha)

    # Near-white always transparent
    alpha = np.where(mn > 242.0, 0.0, alpha)

    # Soften very light neutrals further
    light_neutral = (sat < 22.0) & (lum > 210.0)
    alpha = np.where(light_neutral, alpha * 0.15, alpha)

    alpha_u8 = np.clip(alpha, 0, 255).astype(np.uint8)

    # Un-mix light background so edges aren't milky gray
    a = alpha_u8.astype(np.float32) / 255.0
    a_safe = np.maximum(a, 1e-3)
    bg = 245.0
    rr = np.clip((r - bg * (1 - a)) / a_safe, 0, 255)
    gg = np.clip((g - bg * (1 - a)) / a_safe, 0, 255)
    bb = np.clip((b - bg * (1 - a)) / a_safe, 0, 255)
    rr = np.where(alpha_u8 == 0, 0, rr)
    gg = np.where(alpha_u8 == 0, 0, gg)
    bb = np.where(alpha_u8 == 0, 0, bb)

    rgba = np.dstack(
        [rr.astype(np.uint8), gg.astype(np.uint8), bb.astype(np.uint8), alpha_u8]
    )
    out = Image.fromarray(rgba, "RGBA")
    out.save(path_png, "PNG", optimize=True)
    if path_webp is not None:
        out.save(path_webp, "WEBP", quality=90, method=6)

    opaque = float((alpha_u8 > 200).mean() * 100)
    anya = float((alpha_u8 > 10).mean() * 100)
    print(f"{path_in.name} -> {path_png.name}: opaque%={opaque:.1f} visible%={anya:.1f} size={out.size}")
    w, h = out.size
    px = out.load()
    for pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, h // 2)]:
        print(" ", pt, px[pt[0], pt[1]])


def main() -> None:
    for stem in ("lender-signature", "lender-stamp"):
        live = BASE / f"{stem}.png"
        bak = BASE / f"{stem}.src-rgb.png"
        if bak.exists():
            src = bak
        else:
            Image.open(live).convert("RGB").save(bak)
            src = bak
            print(f"backup {bak.name}")

        remove_checker_bg(src, BASE / f"{stem}.png", BASE / f"{stem}.webp")
        remove_checker_bg(src, BASE / f"{stem}-clean.png")
    print("done")


if __name__ == "__main__":
    main()
