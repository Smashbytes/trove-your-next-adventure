"""Generate public/og-image.png (1200x630), the guest app's default link-preview card.
Run from the repo root: python scripts/generate-og-image.py"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
PINK = (255, 34, 140)
img = Image.new("RGB", (W, H), (10, 6, 18))

# Soft brand glows (top-left pink, bottom-right cyan)
glow = Image.new("RGB", (W, H), (0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse((-260, -320, 640, 420), fill=(150, 10, 80))
g.ellipse((760, 330, 1460, 900), fill=(0, 70, 85))
glow = glow.filter(ImageFilter.GaussianBlur(140))
img = Image.blend(img, glow, 0.85)

logo = Image.open("public/trove-logo.png").convert("RGBA").resize((210, 210), Image.LANCZOS)
img.paste(logo, (90, 120), logo)

d = ImageDraw.Draw(img)
black = ImageFont.truetype("C:/Windows/Fonts/ariblk.ttf", 104)
bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)
d.text((330, 150), "TROVE", font=black, fill=(250, 248, 252))
d.text((336, 280), "DISCOVER. BOOK. EXPERIENCE.", font=bold, fill=PINK)
d.text((90, 430), "Events, nightlife, food and adventures", font=bold, fill=(220, 214, 230))
d.text((90, 478), "across South Africa, booked in seconds.", font=bold, fill=(220, 214, 230))
img.save("public/og-image.png", optimize=True)
print("public/og-image.png", img.size)
