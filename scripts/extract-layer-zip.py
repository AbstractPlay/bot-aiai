#!/usr/bin/env python3
"""Extract Lambda layer zip; normalize Windows backslash paths to POSIX."""
import os
import sys
import zipfile


def main() -> None:
    zip_path, dest = sys.argv[1], sys.argv[2]
    os.makedirs(dest, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            norm = name.replace("\\", "/").lstrip("/")
            target = os.path.join(dest, *norm.split("/"))
            parent = os.path.dirname(target)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with zf.open(name) as src, open(target, "wb") as out:
                out.write(src.read())


if __name__ == "__main__":
    main()
