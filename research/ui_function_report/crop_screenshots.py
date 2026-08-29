from pathlib import Path
from PIL import Image, ImageChops

base = Path('/Users/julia_chen/Documents/ChatGPT/贵客松/research/ui_function_report/service_assets')
for name in ['intercom-fin-inbox.png', 'intercom-escalation-rule.png', 'zendesk-action-log.png', 'gorgias-ai-agent-chat.png']:
    src = base / name
    im = Image.open(src).convert('RGB')
    # Official help images were captured on a black viewer background.
    # Retain the actual light product UI and remove only the surrounding canvas.
    bg = Image.new('RGB', im.size, (0, 0, 0))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda p: 255 if p > 28 else 0)
    box = diff.getbbox()
    if box:
        pad = 8
        box = (max(0, box[0]-pad), max(0, box[1]-pad), min(im.width, box[2]+pad), min(im.height, box[3]+pad))
        im = im.crop(box)
    im.save(base / name.replace('.png', '-cropped.png'))
