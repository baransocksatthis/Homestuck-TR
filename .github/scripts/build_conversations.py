"""Builds one "<Name> Conversations.md" file per character from Conversations/_masterdoc.md.

Each page number becomes a link to whichever file in "Main File" holds that page right now,
so the links stay correct when page files are split or renamed. Run by
.github/workflows/conversations.yml; nobody needs to run it by hand.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES_DIR = ROOT / "Main File"
OUT_DIR = ROOT / "Conversations"
MASTERDOC = OUT_DIR / "_masterdoc.md"

# Sections whose file name shouldn't just be "<Name> Conversations".
SPECIAL_NAMES = {"MEMOS": "Memos", "GROUP CONVOS": "Group Conversations"}

NOTICE = (
    "%% Made automatically from _masterdoc.md. Don't edit this file: changes here get overwritten. "
    "Add new conversations to _masterdoc.md instead. %%\n"
)

URL = re.compile(r"https?://(?:www\.)?homestuck\.com/story/(\d+)(?:\s*-\s*(\d+))?")
FILE_NAME = re.compile(r"^(\d+)(?:-(\d+))?$")


def page_files():
    """[(first page, last page, link target)] for every page file, e.g. (1, 100, "Main File/ACT 1/1-100")."""
    files = []
    for path in PAGES_DIR.rglob("*.md"):
        m = FILE_NAME.match(path.stem)
        if m:
            first = int(m.group(1))
            last = int(m.group(2) or first)
            files.append((first, last, path.relative_to(ROOT).with_suffix("").as_posix()))
    return files


def find_file(page, files):
    for first, last, target in files:
        if first <= page <= last:
            return target
    return None


def section_name(header):
    header = re.sub(r"\(.*?\)", "", header).strip()
    if header in SPECIAL_NAMES:
        return SPECIAL_NAMES[header]
    return header.title() + " Conversations"


def parse(text):
    """{section name: [(start, end, label, note)]}, in masterdoc order."""
    sections = {}
    current = None
    pending = ""  # a label whose link is on the next line
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = URL.search(line)
        if not m:
            if line.upper() == line and re.search(r"[A-Z]", line):
                current = section_name(line)
                sections.setdefault(current, [])
                pending = ""
            elif current is not None:
                pending = (pending + " " + line).strip()
            continue
        if current is None:
            continue
        label = (pending + " " + line[: m.start()]).strip()
        pending = ""
        note = line[m.end():].strip()
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else None
        sections[current].append((start, end, label, note))
    return sections


def build():
    files = page_files()
    sections = parse(MASTERDOC.read_text(encoding="utf-8"))
    written = set()
    for name, entries in sections.items():
        lines = [NOTICE.rstrip("\n"), ""]
        for start, end, label, note in sorted(entries, key=lambda e: (e[0], e[1] or e[0])):
            shown = f"{start}-{end}" if end else str(start)
            target = find_file(start, files)
            link = f"[[{target}|{shown}]]" if target else f"{shown} (no page file for this page yet)"
            extra = " ".join(part for part in (label, note) if part)
            lines.append(f"- {link}" + (f" · {extra}" if extra else ""))
        out = OUT_DIR / f"{name}.md"
        out.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        written.add(out.name)

    # Remove files for sections that no longer exist in the masterdoc.
    for old in OUT_DIR.glob("*.md"):
        if old.name != MASTERDOC.name and old.name not in written and NOTICE.strip() in old.read_text(encoding="utf-8"):
            old.unlink()


if __name__ == "__main__":
    build()
