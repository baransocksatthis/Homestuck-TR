/*
 * Quirkifier: rewrites the selected text in a character's typing quirk.
 *
 * The quirks themselves live in quirks.js, next to this file. That is the only file you need to
 * touch to add or change a quirk; this file is the machinery (the menu, and keeping the text's
 * formatting safe). quirks.js is read again every time the menu opens, so edits show up at once,
 * without restarting Obsidian.
 *
 * Parts of the text that are formatting, not words, are hidden from the quirk so it can't break them:
 * color tags like <span style="color:#008282">, codes like &lt;, [[links]], %% comments %%,
 * `code`, web addresses, and the chat handle at the start of a line (GC:, CG:, ...).
 */
const obsidian = require("obsidian");

const QUIRKS_FILE = "quirks.js";
const RECENT_COUNT = 5;
const SAMPLE = "Merhaba! Işık, gölge ve çiçekler; iyi şanslar Karkat.";

// Things a quirk must never change. Each one is swapped for a single placeholder character while
// the quirk runs, then put back.
const PROTECTED = new RegExp(
  [
    /<\/?[a-zA-Z][^>]*>/.source, // HTML tags, e.g. color spans
    /&#?[a-zA-Z0-9]+;/.source, // codes like &lt; &gt; &#39;
    /\[\[[^\]]*\]\]/.source, // [[links]]
    /%%[\s\S]*?%%/.source, // %% comments %%
    /`[^`]*`/.source, // `code`
    /https?:\/\/\S+/.source, // web addresses
  ].join("|"),
  "g"
);
const PLACEHOLDER_BASE = 0xe000; // Unicode "private use" characters: never in real text, never letters
const PLACEHOLDER = /[-]/g;
// A chat handle at the start of a line, after any quote marks, list bullets or hidden tags.
const HANDLE = /^((?:\s|>|[-*+]\s|[-])*)([A-Z]{2,3}:\s?)/;

/* ---------- helpers that quirks.js can use ---------- */

const helpers = {
  /** Turkish-correct capitals: i → İ, ı → I. */
  upper: (text) => text.toLocaleUpperCase("tr"),
  /** Turkish-correct small letters: I → ı, İ → i. */
  lower: (text) => text.toLocaleLowerCase("tr"),
  /** True for any letter, Turkish ones included (ç, ğ, ı, İ, ö, ş, ü). */
  isLetter: (ch) => /\p{L}/u.test(ch),
  /** Swaps single characters by a table, e.g. swap(text, { a: "4", A: "4" }). */
  swap: (text, table) =>
    Array.from(text)
      .map((ch) => (Object.prototype.hasOwnProperty.call(table, ch) ? table[ch] : ch))
      .join(""),
  /** Runs fn(letter, n) on every letter, where n counts letters only (0, 1, 2, ...). */
  eachLetter: (text, fn) => {
    let n = 0;
    return Array.from(text)
      .map((ch) => (/\p{L}/u.test(ch) ? fn(ch, n++) : ch))
      .join("");
  },
};

/* ---------- loading quirks.js ---------- */

/** Runs the text of quirks.js and returns its list of quirks, or throws a readable error. */
function loadQuirks(code) {
  const module = { exports: null };
  const names = Object.keys(helpers);
  // eslint-disable-next-line no-new-func
  new Function("module", ...names, code)(module, ...names.map((n) => helpers[n]));
  const list = module.exports;
  if (!Array.isArray(list)) throw new Error("quirks.js must end with module.exports = [ ... ];");
  list.forEach((q, i) => {
    if (!q || typeof q.name !== "string" || typeof q.quirk !== "function") {
      throw new Error(`Quirk number ${i + 1} needs a name and a quirk(line) function.`);
    }
  });
  return list;
}

/* ---------- applying a quirk safely ---------- */

/** Applies one quirk to one line, keeping formatting and the chat handle as they were. */
function quirkLine(line, quirk) {
  if (!line.trim()) return line;
  const kept = [];
  const hide = (part) => {
    kept.push(part);
    return String.fromCharCode(PLACEHOLDER_BASE + kept.length - 1);
  };
  let masked = line.replace(PROTECTED, hide);
  if (quirk.keepHandle !== false) {
    masked = masked.replace(HANDLE, (all, start, handle) => start + hide(handle));
  }
  const changed = String(quirk.quirk(masked));
  const found = changed.match(PLACEHOLDER) || [];
  if (found.length !== kept.length) {
    throw new Error(`"${quirk.name}" removed or doubled some formatting; nothing was changed.`);
  }
  return changed.replace(PLACEHOLDER, (ch) => kept[ch.charCodeAt(0) - PLACEHOLDER_BASE]);
}

/** Applies a quirk to every line of text. */
function quirkText(text, quirk) {
  return text
    .split("\n")
    .map((line) => quirkLine(line, quirk))
    .join("\n");
}

/** Search: recent quirks first, then the rest; matches the name, the search words and the description. */
function filterQuirks(quirks, recentNames, query) {
  const q = query.trim().toLocaleLowerCase("tr");
  const haystack = (x) => [x.name, x.search || "", x.description || ""].join(" ").toLocaleLowerCase("tr");
  const matches = quirks.filter((x) => !q || haystack(x).includes(q));
  const rank = (x) => (!q ? 0 : x.name.toLocaleLowerCase("tr").startsWith(q) ? 0 : 1);
  matches.sort((a, b) => rank(a) - rank(b));
  const recent = recentNames.map((n) => matches.find((x) => x.name === n)).filter(Boolean);
  return recent.map((x) => ({ quirk: x, recent: true })).concat(
    matches.filter((x) => !recent.includes(x)).map((x) => ({ quirk: x, recent: false }))
  );
}

/* ---------- the menu ---------- */

class QuirkPicker extends obsidian.SuggestModal {
  constructor(plugin, editor, quirks, preview) {
    super(plugin.app);
    this.plugin = plugin;
    this.editor = editor;
    this.quirks = quirks;
    this.preview = preview; // the first line of the selection, shown quirked in each row
    this.setPlaceholder("Quirk ara… (ör. Terezi, büyük harf, 4)");
    this.setInstructions([
      { command: "↑↓", purpose: "seç" },
      { command: "↵", purpose: "uygula" },
      { command: "esc", purpose: "kapat" },
    ]);
  }

  getSuggestions(query) {
    return filterQuirks(this.quirks, this.plugin.getRecent(), query);
  }

  renderSuggestion(item, el) {
    const q = item.quirk;
    el.addClass("quirkifier-row");
    const top = el.createDiv({ cls: "quirkifier-top" });
    top.createSpan({ cls: "quirkifier-name", text: q.name });
    if (item.recent) top.createSpan({ cls: "quirkifier-recent", text: "son kullanılan" });
    if (q.description) el.createDiv({ cls: "quirkifier-desc", text: q.description });
    let example;
    try {
      example = quirkLine(this.preview, q);
    } catch (e) {
      example = "⚠ " + e.message;
    }
    el.createDiv({ cls: "quirkifier-preview", text: example });
  }

  onChooseSuggestion(item) {
    this.plugin.applyQuirk(this.editor, item.quirk);
  }
}

/* ---------- the plugin ---------- */

class Quirkifier extends obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "quirkify",
      name: "Quirkify selection…",
      editorCallback: (editor) => this.openPicker(editor),
    });
    this.addStyle();
  }

  addStyle() {
    const style = document.createElement("style");
    style.textContent = `
      .quirkifier-row { display: flex; flex-direction: column; gap: 2px; }
      .quirkifier-top { display: flex; gap: 8px; align-items: baseline; }
      .quirkifier-name { font-weight: var(--font-semibold); }
      .quirkifier-recent, .quirkifier-desc { color: var(--text-muted); font-size: var(--font-ui-smaller); }
      .quirkifier-preview { font-family: var(--font-monospace); font-size: var(--font-ui-smaller);
        color: var(--text-normal); white-space: pre-wrap; word-break: break-word; }`;
    document.head.appendChild(style);
    this.register(() => style.remove());
  }

  async readQuirks() {
    const path = obsidian.normalizePath(`${this.manifest.dir}/${QUIRKS_FILE}`);
    let code;
    try {
      code = await this.app.vault.adapter.read(path);
    } catch (e) {
      throw new Error(`${QUIRKS_FILE} bulunamadı (${path}).`);
    }
    try {
      return loadQuirks(code);
    } catch (e) {
      throw new Error(`${QUIRKS_FILE} içinde hata: ${e.message}`);
    }
  }

  async openPicker(editor) {
    let quirks;
    try {
      quirks = await this.readQuirks();
    } catch (e) {
      new obsidian.Notice(e.message, 10000);
      return;
    }
    if (!quirks.length) {
      new obsidian.Notice(`${QUIRKS_FILE} içinde hiç quirk yok.`);
      return;
    }
    const sel = editor.getSelection();
    const source = sel || editor.getLine(editor.getCursor().line);
    const preview = source.split("\n").find((l) => l.trim()) || SAMPLE;
    new QuirkPicker(this, editor, quirks, preview.length > 120 ? preview.slice(0, 120) + "…" : preview).open();
  }

  applyQuirk(editor, quirk) {
    try {
      if (editor.getSelection()) {
        editor.replaceSelection(quirkText(editor.getSelection(), quirk));
      } else {
        // No selection: quirk the whole line the cursor is on.
        const line = editor.getCursor().line;
        const text = editor.getLine(line);
        editor.replaceRange(quirkText(text, quirk), { line, ch: 0 }, { line, ch: text.length });
      }
      this.addRecent(quirk.name);
    } catch (e) {
      new obsidian.Notice(`Quirk uygulanamadı: ${e.message}`, 10000);
    }
  }

  // Recent quirks are kept in this computer's browser storage, never in the vault, so they never sync.
  recentKey() {
    return "quirkifier-recent-" + this.app.appId;
  }

  getRecent() {
    try {
      return JSON.parse(window.localStorage.getItem(this.recentKey())) || [];
    } catch (e) {
      return [];
    }
  }

  addRecent(name) {
    const recent = [name].concat(this.getRecent().filter((n) => n !== name)).slice(0, RECENT_COUNT);
    try {
      window.localStorage.setItem(this.recentKey(), JSON.stringify(recent));
    } catch (e) {
      /* storage unavailable: just don't remember */
    }
  }
}

module.exports = Quirkifier;
module.exports.default = Quirkifier;
module.exports._test = { loadQuirks, quirkLine, quirkText, filterQuirks, helpers };
