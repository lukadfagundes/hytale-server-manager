#!/usr/bin/env python3
"""Extract Hytale game assets (icons, portraits, map markers) from Assets.zip.

Extracts only the small subset of assets needed for the Server Manager UI.
Source: Assets.zip in the project root.
Destination: app/public/assets/ (gitignored).
"""

import os
import sys
import zipfile

ASSETS_ZIP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Assets.zip")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "public", "assets")

EXTRACTIONS = [
    ("Common/Icons/ItemsGenerated/", "items"),
    ("Common/UI/Custom/Pages/Memories/npcs/", "npcs"),
    ("Common/UI/WorldMap/MapMarkers/", "map-markers"),
    ("Common/UI/Custom/Pages/Memories/Tiles/", "memory-ui"),
    ("Common/UI/Custom/Pages/Memories/categories/", "memory-ui/categories"),
]


def main() -> None:
    if not os.path.isfile(ASSETS_ZIP):
        print(f"ERROR: Assets.zip not found at {ASSETS_ZIP}")
        print("Download it using the Hytale downloader or place it in the project root.")
        sys.exit(1)

    total_files = 0
    total_bytes = 0

    with zipfile.ZipFile(ASSETS_ZIP, "r") as zf:
        all_names = zf.namelist()

        for zip_prefix, out_subdir in EXTRACTIONS:
            dest = os.path.join(OUTPUT_DIR, out_subdir)
            os.makedirs(dest, exist_ok=True)

            matching = [n for n in all_names if n.startswith(zip_prefix) and n.lower().endswith(".png")]
            count = 0
            cat_bytes = 0

            for entry in matching:
                filename = os.path.basename(entry)
                if not filename:
                    continue
                data = zf.read(entry)
                out_path = os.path.join(dest, filename)
                with open(out_path, "wb") as f:
                    f.write(data)
                count += 1
                cat_bytes += len(data)

            total_files += count
            total_bytes += cat_bytes
            print(f"  {out_subdir}: {count} files ({cat_bytes / 1024:.0f} KB)")

    print(f"\nTotal: {total_files} files ({total_bytes / (1024 * 1024):.1f} MB)")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
