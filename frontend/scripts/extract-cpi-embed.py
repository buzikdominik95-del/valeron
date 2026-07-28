import fitz
from pathlib import Path

pdf = Path(__file__).resolve().parents[1] / "public" / "cpi" / "Calipso-2.0.pdf"
out_dir = pdf.parent
doc = fitz.open(pdf)
page = doc[0]
print("rect", page.rect)
imgs = page.get_images(full=True)
print("images", len(imgs))
best = None
for i, img in enumerate(imgs):
    xref = img[0]
    info = doc.extract_image(xref)
    w, h = info["width"], info["height"]
    ext = info["ext"]
    data = info["image"]
    print(i, "xref", xref, "w", w, "h", h, "ext", ext, "len", len(data))
    path = out_dir / f"_embed-{i}.{ext}"
    path.write_bytes(data)
    print(" wrote", path.name)
    if best is None or w * h > best[0] * best[1]:
        best = (w, h, path, ext)

if best:
    w, h, path, ext = best
    print("best", w, h, path.name)
    # Convert to PNG if needed and set as policy-template
    from PIL import Image

    im = Image.open(path).convert("RGB")
    target = out_dir / "policy-template.png"
    # Keep high quality PNG
    im.save(target, format="PNG", optimize=True)
    (out_dir / "policy-grid.png").write_bytes(target.read_bytes())
    print("saved policy-template.png", im.size, target.stat().st_size)

# Analyze dark text near Cliente line for name coords
from PIL import Image as PILImage
import numpy as np

im = PILImage.open(out_dir / "policy-template.png").convert("L")
arr = np.array(im)
H, W = arr.shape
print("analyze", W, H)

# Scan for text rows in upper portion
print("dark rows sample:")
for pct in range(18, 40):
    y = int(H * pct / 100)
    row = arr[y]
    dark = np.where(row < 90)[0]
    if len(dark) < 20:
        continue
    # contiguous runs
    runs = []
    start = dark[0]
    prev = dark[0]
    for x in dark[1:]:
        if x - prev > 3:
            runs.append((start, prev))
            start = x
        prev = x
    runs.append((start, prev))
    longest = max(runs, key=lambda r: r[1] - r[0])
    print(
        f"y={pct}% ({y}) dark={len(dark)} runs={len(runs)} "
        f"first={runs[0][0]/W*100:.1f}-{runs[0][1]/W*100:.1f}% "
        f"long={longest[0]/W*100:.1f}-{longest[1]/W*100:.1f}%"
    )
