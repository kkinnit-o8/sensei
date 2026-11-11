"""Export a compact Chinese word-frequency table from the `wordfreq` package.

Run once (needs Python 3 and `pip install wordfreq`):

    python3 scripts/export-wordfreq.py

Writes data/zh-freq.tsv: one line per word, "<word>\t<occurrences per billion tokens>".
Only words written entirely in Han characters that also appear in CC-CEDICT
(data/sources/cedict_*.txt.gz) are kept, which keeps the file small.

The first line is a header comment with the total frequency mass of all
Han-only words in wordfreq, so the app can turn sums into percentages.

wordfreq data is licensed CC BY-SA 4.0 (https://github.com/rspeer/wordfreq).
"""
import gzip
import glob
import re
import sys

import importlib.metadata

import wordfreq

HAN = re.compile(r"^[㐀-䶿一-鿿豈-﫿]+$")

def cedict_words():
    paths = glob.glob("data/sources/cedict_*.txt.gz")
    if not paths:
        sys.exit("CC-CEDICT not found in data/sources/")
    words = set()
    with gzip.open(paths[0], "rt", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.split(" ", 2)
            if len(parts) >= 2:
                words.add(parts[1])
    return words

def main():
    freqs = wordfreq.get_frequency_dict("zh", wordlist="large")
    han = {w: f for w, f in freqs.items() if HAN.match(w)}
    total = sum(han.values())
    known = cedict_words()
    rows = sorted(((w, f) for w, f in han.items() if w in known), key=lambda r: -r[1])
    with open("data/zh-freq.tsv", "w", encoding="utf-8") as out:
        out.write(f"# source=wordfreq {importlib.metadata.version('wordfreq')} large_zh; license=CC BY-SA 4.0; han_total_per_billion={total * 1e9:.0f}\n")
        for w, f in rows:
            per_billion = round(f * 1e9)
            if per_billion < 1:
                continue
            out.write(f"{w}\t{per_billion}\n")
    print(f"wrote {len(rows)} words; Han mass {total:.4f}")

if __name__ == "__main__":
    main()
