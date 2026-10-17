"""生成 SnapUI Studio 窗口图标（converter/assets/icon.ico）

相机造型：圆角机身 + 镜头圆环 + 取景器，蓝紫渐变底。
用法: python debug/make_icon.py
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "converter", "assets", "icon.ico")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(size):
    s = size * 4  # 4x 超采样抗锯齿
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 垂直渐变底 + 圆角裁切
    grad = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grad)
    top, bottom = (61, 109, 245), (123, 155, 255)  # #3d6df5 -> #7b9bff
    for y in range(s):
        gd.line([(0, y), (s, y)], fill=lerp(top, bottom, y / s) + (255,))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=255)
    im.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(im)
    m = s * 0.10  # 边距

    # 取景器凸起
    d.rounded_rectangle([s * 0.30, m * 0.55, s * 0.46, m * 1.6],
                        radius=int(s * 0.03), fill=(255, 255, 255, 235))
    # 机身白色圆角框（镜头外环）
    d.rounded_rectangle([m, m * 1.6, s - m, s - m],
                        radius=int(s * 0.16), outline=(255, 255, 255, 245), width=int(s * 0.045))
    # 镜头：白环 + 渐变实心
    cx, cy, r = s / 2, s * 0.585, s * 0.155
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    r2 = r * 0.62
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=lerp(top, bottom, 0.85) + (255,))
    # 闪光灯点
    d.ellipse([s * 0.70, m * 0.9, s * 0.78, m * 0.9 + s * 0.08], fill=(255, 255, 255, 235))

    return im.resize((size, size), Image.LANCZOS)


os.makedirs(os.path.dirname(OUT), exist_ok=True)
img = make(256)
img.save(OUT, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"icon -> {OUT}")
