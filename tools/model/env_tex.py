# build 0045: squeeze the scenery textures into two strips for the game: tex.jpg (colour, one 256 x 256 layer per texture, stacked)
# and alpha.png (cut-out masks for leaves and grass, only for the layers that need one). usage: python3 -I env_tex.py textures.json packs_folder out_folder
import json, sys, os
from PIL import Image
T = json.load(open(sys.argv[1])); root, out = sys.argv[2], sys.argv[3]; S = 256; os.makedirs(out, exist_ok=True)
col = Image.new('RGB', (S, S * len(T))); al = [t for t in T if t['alpha']]; am = Image.new('L', (S, S * max(1, len(al))), 255); amap = {}
for t in T:
    if t['src']:
        im = Image.open(os.path.join(root, t['src'])).convert('RGBA').resize((S, S), Image.LANCZOS)
    else:
        im = Image.new('RGBA', (S, S), tuple(int(round(c ** (1 / 2.2) * 255)) for c in t['flat']) + (255,))
    rgb = im.convert('RGB')
    if t['alpha']:  # bleed leaf colour into the see-through parts so mip levels don't go dark at the edges
        a = im.getchannel('A'); bg = rgb.resize((8, 8), Image.BOX).resize((S, S), Image.BILINEAR); rgb = Image.composite(rgb, bg, a.point(lambda v: 255 if v > 40 else 0))
        amap[t['i']] = len(amap); am.paste(a, (0, S * amap[t['i']]))
    col.paste(rgb, (0, S * t['i']))
col.save(os.path.join(out, 'tex.jpg'), quality=86, optimize=True, progressive=False); am.save(os.path.join(out, 'alpha.png'), optimize=True)
json.dump({'size': S, 'n': len(T), 'alpha': amap}, open(os.path.join(out, 'tex.json'), 'w'))
print(len(T), 'layers', os.path.getsize(os.path.join(out, 'tex.jpg')) // 1024, 'KB colour', os.path.getsize(os.path.join(out, 'alpha.png')) // 1024, 'KB masks', amap)
