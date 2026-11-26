#!/usr/bin/env python3
"""Assemble src/ into the single-file app at ../index.html.

app.js holds two placeholders: /*CORE*/ (image core + AI + GPU + ruler modules)
and /*EXIF*/ (EXIF date reader and sample image). The collage, video and mode
modules are appended at the end of the main <script>.
Run:  python3 src/build.py
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent / "index.html"
read = lambda name: (SRC / name).read_text(encoding="utf-8")

app = read("app.js")
core = read("core2.js").rstrip() + "\n\n" + "\n\n".join(read(f).rstrip() for f in ["inpaint.js", "detect.js", "gl.js", "ruler.js"])
page = app.replace("/*CORE*/", core).replace("/*EXIF*/", read("exif.js").rstrip())
extra = "\n\n".join(read(f).rstrip() for f in ["recap.js", "reel.js", "modes.js"])
i = page.rindex("</script>")
page = page[:i] + extra + "\n" + page[i:]
OUT.write_text(read("head.html").rstrip("\n") + "\n" + page, encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
