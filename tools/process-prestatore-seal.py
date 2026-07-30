"""Remove gradient background from Deborah + seal asset → transparent PNG."""
from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow', '-q'])
    from PIL import Image

src = Path(r'C:\Users\user\Downloads\ChatGPT Image Jul 30, 2026, 03_12_07 PM.png')
out = Path(__file__).resolve().parents[1] / 'frontend' / 'public' / 'cpi' / 'lender-prestatore.png'

img = Image.open(src).convert('RGBA')
w, h = img.size
px = img.load()

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        sat = mx - mn
        is_bg = (
            (r > 90 and g > 100 and b > 120 and sat < 55)
            or (r > 140 and g > 150 and b > 160 and sat < 40)
            or (abs(r - g) < 25 and abs(g - b) < 30 and mn > 100)
            or (b > r + 15 and b > g + 5 and sat < 70 and mn > 80)
        )
        is_ink = (
            (b > 80 and b > r + 20 and sat > 40)
            or (mx < 90 and sat < 35)
            or (r < 60 and g < 70 and b < 100 and sat > 15)
        )
        if is_bg and not is_ink:
            px[x, y] = (0, 0, 0, 0)

bbox = img.getbbox()
if bbox:
    pad = 12
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w, right + pad)
    bottom = min(h, bottom + pad)
    img = img.crop((left, top, right, bottom))

max_w = 1400
if img.width > max_w:
    nh = int(img.height * max_w / img.width)
    img = img.resize((max_w, nh), Image.Resampling.LANCZOS)

out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, 'PNG', optimize=True)
print('saved', out, img.size, out.stat().st_size)
