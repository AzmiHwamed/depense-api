from pathlib import Path
from PIL import Image, ImageDraw

folder = Path(__file__).parent / "render"
pages = sorted(folder.glob("page-*.png"))
thumb_w = 300
gap = 16
for batch_index in range(0, len(pages), 4):
    batch = pages[batch_index:batch_index + 4]
    thumbs = []
    for page in batch:
        image = Image.open(page).convert("RGB")
        thumb_h = round(image.height * thumb_w / image.width)
        thumbs.append((page, image.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)))
    canvas = Image.new("RGB", (thumb_w * 2 + gap * 3, thumbs[0][1].height * 2 + gap * 3 + 24), "#d9dbe5")
    draw = ImageDraw.Draw(canvas)
    for i, (page, thumb) in enumerate(thumbs):
        x = gap + (i % 2) * (thumb_w + gap)
        y = gap + (i // 2) * (thumb.height + gap + 12)
        canvas.paste(thumb, (x, y + 12))
        draw.text((x, y), page.stem, fill="#111111")
    canvas.save(folder / f"contact-{batch_index // 4 + 1}.jpg", quality=90)
