#!/usr/bin/env python3
"""Download latin-subset woff2 files from Google Fonts and emit local @font-face CSS."""
import os, re, urllib.request, sys

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
OUT = "/workspace/assets/fonts"
os.makedirs(OUT, exist_ok=True)

FAMILIES = [
    ("Instrument Serif", "Instrument+Serif:ital,wght@0,400;1,400"),
    ("Bodoni Moda", "Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400"),
    ("Space Grotesk", "Space+Grotesk:wght@400;500;700"),
    ("Archivo Black", "Archivo+Black"),
    ("JetBrains Mono", "JetBrains+Mono:wght@400;700"),
    ("Press Start 2P", "Press+Start+2P"),
    ("Inter", "Inter:wght@300;400;500;600"),
]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=40).read()

faces = []
for name, spec in FAMILIES:
    url = f"https://fonts.googleapis.com/css2?family={spec}&display=swap"
    css = get(url).decode("utf-8")
    blocks = re.findall(r"/\*\s*([^*]+?)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
    picked = []
    for subset, block in blocks:
        if subset not in ("latin", "latin-ext"):
            continue
        m = re.search(r"font-weight:\s*([\d ]+);", block)
        style = re.search(r"font-style:\s*(\w+);", block)
        url_m = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        if not url_m:
            continue
        weight = (m.group(1).strip() if m else "400")
        st = style.group(1) if style else "normal"
        data = get(url_m.group(1))
        fn = name.lower().replace(" ", "-") + f"-{weight.replace(' ', '-')}-{st}-{subset}.woff2"
        with open(os.path.join(OUT, fn), "wb") as f:
            f.write(data)
        picked.append((fn, weight, st, subset, len(data)))
    for p in picked:
        print(f"{p[0]:60s} {p[1]:8s} {p[2]:8s} {p[3]:10s} {p[4]/1024:7.1f} KB")
    faces.append((name, picked))

LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
         "U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,"
             "U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,"
             "U+2113,U+2C60-2C7F,U+A720-A7FF")
lines = []
for name, picked in faces:
    for fn, weight, st, subset, _ in picked:
        ur = LATIN if subset == "latin" else LATIN_EXT
        lines.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;"
            "src:url('../fonts/%s') format('woff2');unicode-range:%s}"
            % (name, st, weight, fn, ur)
        )
with open("/workspace/assets/css/fonts.css", "w") as f:
    f.write("/* Local latin webfonts (subset from Google Fonts) */\n")
    f.write("\n".join(lines) + "\n")
print("\nwrote /workspace/assets/css/fonts.css")
