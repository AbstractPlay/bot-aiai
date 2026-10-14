#!/usr/bin/env python3
"""Extract Lambda layer zip; normalize Windows backslash paths to POSIX."""
import os
import sys
import zipfile


def main() -> None:
    zip_path, dest = sys.argv[1], sys.argv[2]
    os.makedirs(dest, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            norm = info.filename.replace("\\", "/").lstrip("/")
            if not norm or norm.endswith("/"):
                continue
            target = os.path.join(dest, *norm.split("/"))
            parent = os.path.dirname(target)
            if parent:
                os.makedirs(parent, exist_ok=True)
            if os.path.isdir(target):
                continue
            with zf.open(info) as src, open(target, "wb") as out:
                out.write(src.read())


if __name__ == "__main__":
    main()
