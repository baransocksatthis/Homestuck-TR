/*
 * Character Colors: colors the selected text with a character's color.
 *
 * The colors come from the note "Renk Kodları.md" (anywhere in the vault): one line per color,
 * the names first and the color code (#rrggbb) at the end. Lines with several codes become
 * numbered colors. The last 5 colors you used are remembered on your own computer only.
 *
 * The text is wrapped as <span style="color:#rrggbb">text</span>, the same format the
 * Colored Text plugin writes, so both work on the same files.
 */
const obsidian = require("obsidian");

const LIST_FILE = "Renk Kodları.md";
const RECENT_COUNT = 5;
const HEX = /#[0-9a-fA-F]{6}\b/g;
const SPAN = /^<span style="color:\s*#[0-9a-fA-F]{3,8}">([\s\S]*)<\/span>$/;
const ANY_COLOR_TAG = /<span style="color:\s*#[0-9a-fA-F]{3,8}">|<\/span>/g;
// Things at the start of a line that must stay outside the color: quote marks, list bullets, checkboxes.
const LINE_START = /^(\s*(?:>\s*)*(?:(?:[-*+]|\d+[.)])\s+)?(?:\[.\]\s+)?)([\s\S]*?)(\s*)$/;

/** Reads the color note into [{ hex, label }]. */
function parseColors(text) {
  const colors = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/%%.*?%%/g, "").trim();
    const hexes = line.match(HEX);
    if (!hexes) continue;
    const label = line.replace(HEX, "").replace(/[\s,]+$/, "").replace(/(,\s*)+/g, ", ").trim() || hexes[0];
    hexes.forEach((hex, i) => {
      colors.push({ hex: hex.toLowerCase(), label: hexes.length > 1 ? `${label} ${i + 1}` : label });
    });
  }
  return colors;
}

/** Wraps every non-empty line of text in the color, replacing a color it already had. */
function colorize(text, hex) {
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const [, start, body, end] = line.match(LINE_START);
      if (!body) return line;
      const inner = body.match(SPAN);
      const plain = inner && !inner[1].includes("<span") ? inner[1] : body;
      return `${start}<span style="color:${hex}">${plain}</span>${end}`;
    })
    .join("\n");
}

/** Removes every color tag from text. */
function uncolor(text) {
  return text.replace(ANY_COLOR_TAG, "");
}

/** Search: recent colors first, then the rest in list order. */
function filterColors(colors, recentLabels, query) {
  const q = query.trim().toLocaleLowerCase("tr");
  const matches = colors.filter(
    (c) => !q || c.label.toLocaleLowerCase("tr").includes(q) || c.label.toLowerCase().includes(query.trim().toLowerCase()) || c.hex.includes(q)
  );
  // Best matches first: the label starts with the search, then a word in it does, then anything else.
  const rank = (c) => {
    if (!q) return 0;
    const l = c.label.toLocaleLowerCase("tr");
    if (l.startsWith(q)) return 0;
    if (l.split(/[\s,()]+/).some((w) => w.startsWith(q))) return 1;
    return 2;
  };
  matches.sort((a, b) => rank(a) - rank(b));
  const recent = recentLabels.map((l) => matches.find((c) => c.label === l)).filter(Boolean);
  const rest = matches.filter((c) => !recent.includes(c));
  return recent.map((c) => ({ ...c, recent: true })).concat(rest);
}

class ColorPicker extends obsidian.SuggestModal {
  constructor(plugin, editor, colors) {
    super(plugin.app);
    this.plugin = plugin;
    this.editor = editor;
    this.colors = colors;
    this.setPlaceholder("Renk ara… (ör. Karkat, John, Trickster)");
    this.setInstructions([
      { command: "↑↓", purpose: "seç" },
      { command: "↵", purpose: "renklendir" },
      { command: "esc", purpose: "kapat" },
    ]);
  }

  getSuggestions(query) {
    return filterColors(this.colors, this.plugin.getRecent(), query);
  }

  renderSuggestion(color, el) {
    el.addClass("character-colors-row");
    const swatch = el.createDiv({ cls: "character-colors-swatch" });
    swatch.style.backgroundColor = color.hex;
    const text = el.createDiv({ cls: "character-colors-text" });
    text.createSpan({ text: color.label });
    text.createSpan({ cls: "character-colors-hex", text: " " + color.hex });
    if (color.recent) el.createDiv({ cls: "character-colors-recent", text: "son kullanılan" });
  }

  onChooseSuggestion(color) {
    this.plugin.applyColor(this.editor, color);
  }
}

class CharacterColors extends obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "color-as",
      name: "Color text as…",
      editorCallback: (editor) => this.openPicker(editor),
    });
    this.addCommand({
      id: "remove-color",
      name: "Remove color from selection",
      editorCallback: (editor) => {
        const sel = editor.getSelection();
        if (sel) editor.replaceSelection(uncolor(sel));
      },
    });
    this.addStyle();
  }

  addStyle() {
    const style = document.createElement("style");
    style.textContent = `
      .character-colors-row { display: flex; align-items: center; gap: 10px; }
      .character-colors-swatch { width: 18px; height: 18px; flex: none; border-radius: 4px;
        border: 1px solid var(--background-modifier-border-hover); }
      .character-colors-text { flex: 1; }
      .character-colors-hex { color: var(--text-faint); font-size: var(--font-ui-smaller); }
      .character-colors-recent { color: var(--text-muted); font-size: var(--font-ui-smaller); }`;
    document.head.appendChild(style);
    this.register(() => style.remove());
  }

  async openPicker(editor) {
    const file = this.app.vault.getFiles().find((f) => f.name === LIST_FILE);
    if (!file) {
      new obsidian.Notice(`"${LIST_FILE}" bulunamadı. Renk listesi bu isimde bir notta olmalı.`);
      return;
    }
    const colors = parseColors(await this.app.vault.cachedRead(file));
    if (!colors.length) {
      new obsidian.Notice(`"${LIST_FILE}" içinde renk kodu yok (ör. #0715cd).`);
      return;
    }
    new ColorPicker(this, editor, colors).open();
  }

  applyColor(editor, color) {
    const sel = editor.getSelection();
    if (sel) {
      editor.replaceSelection(colorize(sel, color.hex));
    } else {
      const open = `<span style="color:${color.hex}">`;
      const cursor = editor.getCursor();
      editor.replaceRange(open + "</span>", cursor);
      editor.setCursor({ line: cursor.line, ch: cursor.ch + open.length });
    }
    this.addRecent(color.label);
  }

  // Recent colors are kept in this computer's browser storage, never in the vault, so they never sync.
  recentKey() {
    return "character-colors-recent-" + this.app.appId;
  }

  getRecent() {
    try {
      return JSON.parse(window.localStorage.getItem(this.recentKey())) || [];
    } catch (e) {
      return [];
    }
  }

  addRecent(label) {
    const recent = [label].concat(this.getRecent().filter((l) => l !== label)).slice(0, RECENT_COUNT);
    try {
      window.localStorage.setItem(this.recentKey(), JSON.stringify(recent));
    } catch (e) {
      /* storage unavailable: just don't remember */
    }
  }
}

module.exports = CharacterColors;
module.exports.default = CharacterColors;
module.exports._test = { parseColors, colorize, uncolor, filterColors };
