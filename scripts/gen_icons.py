"""
Generate pixel-art PNG icons for the LDU Grant Ops PWA.
The icon is a retro pixel-art character on the royal blue background
matching the app's theme.
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ── Color palette (matches the app's design system) ─────────────────────────
BLUE   = (21,  101, 232)   # Royal blue background
CREAM  = (255, 251, 240)   # Card cream
PINK   = (255,  30, 120)   # Hot pink accent
GOLD   = (255, 184,   0)   # Gold accent
DARK   = ( 10,  10,  26)   # Near-black
WHITE  = (255, 255, 255)
TRANS  = (  0,   0,   0,   0)  # Transparent

def draw_pixel_character(draw, scale: int, ox: int, oy: int):
    """
    Draw a 16×20 pixel character scaled up.
    Pixel art: a little person holding a scroll (grant writer),
    with 'LDU' on their shirt.
    Layout (each char = 1 pixel):
        col:  0123456789012345
        row0: ....BBBBB.......  <- head
        row1: ...BCCCCCB......
        row2: ...BCCCCCB......
        row3: ...BCCCCCB......
        row4: ....BBBBB.......
        row5: .PPPBBBBBPPP....  <- shoulders/arms
        row6: .PCCCBBBBBCCC...  <- torso with shirt
        row7: .PCCCBBBBBCCC...
        row8: .PPPBBBBBPPP....
        row9: ....BBBBB.......  <- legs
       row10: ...BBBBBBB......
       row11: ..BBBBBBBBB.....
       row12: ..BB.....BB.....  <- feet
    """
    s = scale
    def px(col, row, color):
        draw.rectangle(
            [ox + col*s, oy + row*s, ox + col*s + s - 1, oy + row*s + s - 1],
            fill=color
        )

    # Head (cream skin)
    for c in range(4, 9):
        px(c, 0, CREAM)
    for r in range(1, 4):
        for c in range(3, 9):
            px(c, r, CREAM)
    # Eyes (dark)
    px(4, 2, DARK); px(7, 2, DARK)
    # Mouth (pink smile)
    px(5, 3, PINK); px(6, 3, PINK)
    # Hair (gold)
    for c in range(4, 9): px(c, 0, GOLD)
    px(3, 1, GOLD); px(8, 1, GOLD)

    # Neck
    for c in range(5, 8): px(c, 4, CREAM)

    # Body / shirt (hot pink)
    for r in range(5, 10):
        for c in range(4, 9):
            px(c, r, PINK)
    # LDU letters on shirt (cream)
    # L
    px(4, 6, CREAM); px(4, 7, CREAM); px(4, 8, CREAM); px(5, 8, CREAM)
    # D
    px(6, 6, CREAM); px(7, 6, CREAM); px(6, 7, CREAM); px(7, 7, CREAM)
    # U
    px(8, 6, CREAM); px(8, 7, CREAM)

    # Arms (cream)
    for r in range(5, 9):
        px(2, r, CREAM); px(3, r, CREAM)   # left arm
        px(9, r, CREAM); px(10, r, CREAM)  # right arm
    # Hands holding scroll (gold)
    px(2, 8, GOLD); px(3, 8, GOLD)
    px(9, 8, GOLD); px(10, 8, GOLD)

    # Scroll in left hand
    for r in range(7, 11):
        px(1, r, CREAM)
    px(0, 7, GOLD); px(0, 10, GOLD)

    # Legs (dark)
    for r in range(10, 13):
        px(4, r, DARK); px(5, r, DARK)
        px(7, r, DARK); px(8, r, DARK)
    # Feet (cream)
    px(3, 12, CREAM); px(4, 12, CREAM)
    px(7, 12, CREAM); px(8, 12, CREAM); px(9, 12, CREAM)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BLUE + (255,))
    draw = ImageDraw.Draw(img)

    # Pixel grid pattern (subtle)
    for x in range(0, size, 8):
        for y in range(0, size, 8):
            draw.point((x, y), fill=(255, 255, 255, 20))

    # Border ring
    border = max(4, size // 32)
    draw.rounded_rectangle(
        [border, border, size - border - 1, size - border - 1],
        radius=size // 8,
        outline=CREAM,
        width=border
    )

    # Character — scale so it fills ~60% of the icon
    char_cols = 12   # character is 12 cols wide
    char_rows = 13   # character is 13 rows tall
    scale = max(2, (size * 60 // 100) // max(char_cols, char_rows))
    char_w = char_cols * scale
    char_h = char_rows * scale
    ox = (size - char_w) // 2
    oy = (size - char_h) // 2 - scale  # shift up slightly
    draw_pixel_character(draw, scale, ox, oy)

    # "GRANTS" label at bottom
    label_y = size - size // 8 - border
    label_text = "GRANTS"
    # Draw label pixel by pixel using a small font; fallback to simple rectangles
    try:
        font_size = max(8, size // 16)
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", font_size)
        bbox = draw.textbbox((0, 0), label_text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((size - tw) // 2, label_y), label_text, fill=GOLD, font=font)
    except Exception:
        pass  # Skip label if font unavailable

    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)

    sizes = {
        "icon-192.png":       192,
        "icon-512.png":       512,
        "apple-touch-icon.png": 180,
        "favicon-32.png":      32,
    }

    for filename, size in sizes.items():
        img = make_icon(size)
        # Convert to RGB for PNG (drop alpha channel for solid backgrounds)
        final = Image.new("RGB", (size, size), BLUE)
        final.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
        path = os.path.join(out_dir, filename)
        final.save(path, "PNG", optimize=True)
        print(f"✅ Generated {filename} ({size}×{size})")


if __name__ == "__main__":
    main()
