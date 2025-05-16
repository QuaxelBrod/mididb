import fs from 'fs';

function extractInstrumentNames(lines) {
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith("'")) continue;
    // Splitte an Leerzeichen/Tabs, aber erhalte den Text ab dem ersten Wort mit Buchstaben
    const parts = trimmed.split(/\s+/);
    // Finde das erste Teilstück, das einen Buchstaben enthält (Instrumentenname beginnt hier)
    const firstTextIdx = parts.findIndex(p => /[A-Za-z]/.test(p));
    if (firstTextIdx !== -1) {
      // Instrumentenname ist alles ab diesem Index, wieder zu einem String verbinden
      const name = parts.slice(firstTextIdx).join(' ');
      result.push(name);
    }
  }
  return result;
}

let data = fs.readFileSync('instrumenten_liste_raw.txt', 'utf8');
let res = extractInstrumentNames(data.split('\n'));
fs.writeFileSync('instrumenten-namen.txt', res.join('\n'), 'utf8');