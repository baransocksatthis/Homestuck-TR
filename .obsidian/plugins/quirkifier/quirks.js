/*
 * QUIRK LIST
 *
 * Every quirk in the menu comes from this list. To add one, copy a block from { to }, paste it
 * before the final ]; and change it. Save, then open the menu again: no restart needed.
 * If something is wrong in this file, the menu shows the error instead of opening.
 *
 * Each quirk has:
 *   name         what the menu shows. Must be different for every quirk.
 *   description  (optional) one line under the name in the menu.
 *   search       (optional) extra words that find it when typed in the menu, e.g. "gc latula".
 *   keepHandle   (optional) leave out to keep the chat handle (GC:, CG:, ...) untouched.
 *                Set to false if the quirk should change the handle too.
 *   quirk(line)  gets ONE line of text and returns the changed line.
 *
 * You don't need to worry about color tags, &lt; codes, [[links]] or the chat handle: they are
 * hidden from quirk(line), so it only ever sees the words. Don't remove the odd invisible
 * characters you might see in line while testing, those are the hidden parts' spots.
 *
 * Helpers you can use inside quirk(line) (they are Turkish-correct):
 *   upper(text)                  capitals: "işık" → "IŞIK", "i" → "İ"
 *   lower(text)                  small letters: "IŞIK" → "ışık", "İ" → "i"
 *   isLetter(ch)                 true for letters, Turkish ones included
 *   swap(text, { a: "4" })       swaps single characters using a table
 *   eachLetter(text, (ch, n, w) => ...)
 *                                runs on every letter; n counts letters only (0, 1, 2, ...),
 *                                so spaces and punctuation don't count.
 *                                w is the letter's place inside its word: w === 0 means it is
 *                                the first letter of a word ("Karkat'ın" is one word).
 *                                Example, capitalise every word:
 *                                  eachLetter(line, (ch, n, w) => (w === 0 ? upper(ch) : ch))
 *   insertAt(text, i, piece)     puts piece before character number i (counting from 0):
 *                                  insertAt("hey", 1, "e")  → "heey"
 *                                  insertAt("hey", 0, "o")  → "ohey"
 *                                  insertAt("hey", -1, "e") → "heey"  (negative counts from the end)
 *                                To double letters while going through them, eachLetter can
 *                                also just return ch + ch.
 *   isWordStart(text, i)         true if character number i of text starts a word
 *                                (for when you go through the line yourself, e.g. with
 *                                Array.from(line).map((ch, i) => ...))
 *
 * Normal JavaScript works too, e.g. line.replace(/ben/g, "b3n") or line.split(" ").
 */

module.exports = [

  {
    name: "Aradia Megido",
    description: "Küçük harf, 'o,ö' = '0'",
    search: "aradia megido",
    quirk(line) {
      return swap(lower(line), { o: "0", ö: "0" });
    }
  },

  {
    name: "Tavros Nitram",
    description: "Büyük harf ters, '.' = ','",
    search: "tavros nitram",
    quirk(line) {
      return swap(eachLetter(line, (ch,n) => (ch == upper(ch) ? lower(ch) : upper(ch))), { ".": "," });
    }
  },

  {
    name: "Alternating caps",
    description: "Harfler sırayla küçük ve büyük olur: mErHaBa",
    search: "büyük küçük harf alternating sırayla",
    quirk(line) {
      // n is 0 for the first letter, 1 for the second... Even ones small, odd ones capital.
      return eachLetter(line, (ch, n) => (n % 2 === 0 ? lower(ch) : upper(ch)));
    },
  },

  {
    name: "A → 4",
    description: "Her A ve a, 4 olur: K4RK4T",
    search: "4 a terezi",
    quirk(line) {
      return swap(line, { A: "4", a: "4" });
    },
  },
];
