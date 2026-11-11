/** npm run build:dict — (re)import CC-CEDICT from data/sources/ into data/dict.db. */
import { buildDict, dictPath } from "../lib/dict-build";

const t = Date.now();
const n = buildDict();
console.log(`Imported ${n} CC-CEDICT entries into ${dictPath()} in ${((Date.now() - t) / 1000).toFixed(1)}s`);
