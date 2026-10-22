"""把網站用的大張 PNG 轉成較小的 WebP，輸出到 src/assets/web/（原圖不動）。

新增或替換照片後，在專案根目錄執行：python3 scripts/optimize-images.py
需要 Pillow：python3 -m pip install Pillow
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/web'

# （來源資料夾, 檔名樣式, 最大寬度 px）；寬度依畫面上實際顯示大小的約兩倍抓
JOBS = [
    ('src/assets/zhuyi-img', '**/菜色/*.png', 960),
    ('src/assets/zhuyi-img', '**/食材/*.png', 720),
    ('src/assets/zhuyi-img', '晨曦稻田耕作者.png', 1600),
    ('src/assets/zhuyi-img', 'A Brighter Day 土地溫度字樣.png', 1200),
    ('src/assets/zhuyi-img', 'home-Concept.png', 1400),
    ('src/assets', 'family-train-*-v3.png', 480),
    ('src/assets', 'family-train-carriage-long-ink-v1.png', 480),
    ('img/reffood', '*.png', 320),
]


def convert(src: Path, dest: Path, max_width: int):
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        return False
    with Image.open(src) as image:
        image = image.convert('RGBA' if 'A' in image.getbands() or image.mode == 'P' else 'RGB')
        if image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, 'WEBP', quality=80, method=6)
    return True


def main():
    before = after = count = 0
    for folder, pattern, max_width in JOBS:
        base = ROOT / folder
        for src in sorted(base.glob(pattern)):
            dest = OUT / Path(folder).name / src.relative_to(base).with_suffix('.webp')
            if convert(src, dest, max_width):
                count += 1
            before += src.stat().st_size
            after += dest.stat().st_size
    print(f'轉換 {count} 張；原圖 {before / 1e6:.1f} MB → WebP {after / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
