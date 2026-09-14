/* ============================================================
   transpose.js — Motor de Transposição e Reconhecimento de Acordes
   Suporte a notação americana, acordes com baixo (G/B), bemóis/sustenidos,
   diminutos (°/º/dim), sétimas maiores (7M), tensões e acidentes.
   ============================================================ */

'use strict';

const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Tonalidades que usam bemóis por convenção
const FLAT_KEYS = new Set([
  'F','Bb','Eb','Ab','Db','Gb',
  'Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'
]);

// Marcadores de seção (Intro, Verso, Refrão, Ponte, etc.)
const SECTION_RE = /^\s*\[?\s*(intro(dução|ducao)?|vers[oõ](\s*\d*)?|coro|refr[aã]o|refrao|ponte(\s*\d*)?|outro|solo|estrofe\s*\d*|pr[eé][- ]?(coro|refr[aã]o|refrao)|pre[- ]?chorus|bridge|chorus|verse\s*\d*|final|fim|tag|interl[uú]dio|interludio|instrumental|(primeira|segunda|terceira)\s*parte|parte\s*\d*)(\s*\d*)?\s*\]?[\s:.\-]*$/i;

/**
 * Retorna o índice (0-11) de uma nota.
 */
function _noteIndex(note) {
  let i = NOTES_SHARP.indexOf(note);
  if (i === -1) i = NOTES_FLAT.indexOf(note);
  return i;
}

/**
 * Transporta uma nota isolada (ex: "F#", "Bb", "D") por N semitons.
 */
function _transposeNote(note, semitones, useFlats) {
  const i = _noteIndex(note);
  if (i === -1) return note;
  const newI = ((i + semitones) % 12 + 12) % 12;
  return useFlats ? NOTES_FLAT[newI] : NOTES_SHARP[newI];
}

/**
 * Transporta um símbolo de acorde completo.
 * Suporta: G, Am, C#m7, G7sus4, F#m, G/B, Bb/D, D#°, C#º, F7M, C7(9), etc.
 */
function transposeChord(chord, semitones, useFlats) {
  if (!chord) return chord;
  if (semitones === 0) return chord;

  const clean = chord.trim();

  // Acorde com baixo: G/B → transporta raiz e baixo separadamente
  if (clean.includes('/')) {
    const slashIdx = clean.indexOf('/');
    const root = clean.slice(0, slashIdx);
    const bass = clean.slice(slashIdx + 1);
    return transposeChord(root, semitones, useFlats) + '/' + _transposeNote(bass, semitones, useFlats);
  }

  // Extrai a nota raiz (A-G com opcional # ou b) e o sufixo restante
  const match = clean.match(/^([A-G][#b]?)(.*)/s);
  if (!match) return clean;

  const root = match[1];
  const suffix = match[2];
  const newRoot = _transposeNote(root, semitones, useFlats);
  return newRoot + suffix;
}

/**
 * Determina se uma tonalidade usa bemóis.
 */
function keyUsesFlats(key) {
  if (!key) return false;
  return FLAT_KEYS.has(key) || FLAT_KEYS.has(key.replace(/m$/, '') + 'm');
}

/**
 * Calcula o nome da tonalidade após transportar.
 * @param {string} originalKey  Ex: "G", "Am", "F#m"
 * @param {number} semitones    Semitons (positivo = sobe, negativo = desce)
 * @returns {string}            Ex: "A", "Bm", "Gb"
 */
function getTransposedKey(originalKey, semitones) {
  if (!originalKey) return '?';
  if (semitones === 0) return originalKey;

  const isMinor = originalKey.endsWith('m') && originalKey.length > 1;
  const rootNote = isMinor ? originalKey.slice(0, -1) : originalKey;
  const suffix   = isMinor ? 'm' : '';

  const sharpResult = _transposeNote(rootNote, semitones, false) + suffix;
  const flatResult  = _transposeNote(rootNote, semitones, true)  + suffix;

  return (FLAT_KEYS.has(flatResult) || FLAT_KEYS.has(flatResult.replace(/m$/, '')))
    ? flatResult
    : sharpResult;
}

/**
 * Detecta se um token textual representa um acorde válido.
 * Suporta:
 *  - Básicos: C, D, E, F, G, A, B (#, b)
 *  - Menores/Maiores: m, M, maj, min, 7M
 *  - Diminutos/Aumentados: °, º, dim, aug, +, -
 *  - Suspensos e Adicionados: sus, sus4, sus2, 4, add9, etc.
 *  - Tensões e Parênteses: (9), (b5), (#5), (13), 7(9), m7(b5), etc.
 *  - Baixos invertidos (slash chords): /G, /D, /F#, /B, etc.
 *  - Notações de repetição em cifras: (2x), 2x, %
 */
function isChordToken(token) {
  if (!token) return false;
  let s = token.trim();
  // Se todo o acorde estiver entre parênteses ou colchetes tipo (G) ou [G]
  if ((s.startsWith('(') && s.endsWith(')')) || (s.startsWith('[') && s.endsWith(']'))) {
    s = s.slice(1, -1).trim();
  }
  // Remove apenas pontuações finais reais
  s = s.replace(/[,;:]+$/g, '');
  if (!s) return false;

  // Marcações de repetição aceitas em linhas de acorde
  if (/^(\d+x|\(\d+x\)|%|\|+|bis)$/i.test(s)) return true;

  // Deve começar com uma nota musical válida (A-G com opcional # ou b)
  if (!/^[A-G][#b]?/i.test(s)) return false;

  // Padrão abrangente para acordes populares
  const chordPattern = /^[A-G][#b]?(m(aj|in)?|M|dim|aug|sus|add)?(\d+)?(M)?(\+|[\-–]|°|º|ø)?(\([^\)]+\))?(\/([A-G][#b]?|\d+))?(\+|[\-–]|°|º)?$/;
  return chordPattern.test(s);
}

/**
 * Detecta se uma linha inteira é de acordes.
 */
function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (SECTION_RE.test(trimmed) && !trimmed.includes('  ')) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  let chords = 0;
  for (const w of words) {
    if (isChordToken(w)) chords++;
  }

  // Linha é de acordes se todos forem acordes,
  // ou se houver pelo menos 2 acordes e representarem 70%+ dos tokens
  return (chords === words.length) || (words.length >= 2 && (chords / words.length) >= 0.7);
}

/**
 * Extrai acordes e suas posições exatas de caractere em uma linha de acordes.
 */
function extractChordsWithPositions(chordLine) {
  const list = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine)) !== null) {
    const word = m[0];
    let cleanChord = word.trim();
    if ((cleanChord.startsWith('(') && cleanChord.endsWith(')')) || (cleanChord.startsWith('[') && cleanChord.endsWith(']'))) {
      cleanChord = cleanChord.slice(1, -1).trim();
    }
    cleanChord = cleanChord.replace(/[,;:]+$/g, '');
    if (isChordToken(cleanChord)) {
      list.push({ chord: cleanChord, col: m.index });
    }
  }
  return list;
}

/**
 * Mescla uma linha de acordes com uma linha de letra no formato [ACORDE]letra.
 */
function mergeChordAndLyric(chordLine, lyricLine) {
  const chords = extractChordsWithPositions(chordLine);
  if (chords.length === 0) return lyricLine;

  let paddedLyric = lyricLine;
  const maxCol = Math.max(...chords.map(c => c.col));
  if (paddedLyric.length < maxCol) {
    paddedLyric = paddedLyric.padEnd(maxCol + 1, ' ');
  }

  let result = paddedLyric;
  const sorted = [...chords].sort((a, b) => b.col - a.col);

  for (const { chord, col } of sorted) {
    const pos = Math.min(col, result.length);
    result = result.slice(0, pos) + `[${chord}]` + result.slice(pos);
  }

  return result;
}

/**
 * Converte qualquer texto de cifra (seja com acordes acima da letra ou misto)
 * para o formato padronizado com colchetes inline [ACORDE].
 */
function normalizeToInlineChords(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = (i + 1 < lines.length) ? lines[i + 1] : null;
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('');
      i++;
      continue;
    }

    // Se for cabeçalho de seção
    if (SECTION_RE.test(trimmed) && !trimmed.includes('  ')) {
      result.push(trimmed);
      i++;
      continue;
    }

    // Se a linha já tiver acordes inline [C], preserva
    if (/\[[A-G][^\]]*\]/.test(line)) {
      result.push(line);
      i++;
      continue;
    }

    // Se for linha de acordes tradicional
    if (isChordLine(line)) {
      if (nextLine !== null && nextLine.trim() !== '' && !isChordLine(nextLine) && !SECTION_RE.test(nextLine.trim())) {
        result.push(mergeChordAndLyric(line, nextLine));
        i += 2;
      } else {
        const chords = extractChordsWithPositions(line);
        result.push(chords.map(c => `[${c.chord}]`).join('  '));
        i++;
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Transporta toda a cifra (garantindo normalização de acordes antes).
 */
function transposeCifraContent(content, semitones, originalKey) {
  if (!content) return '';
  const normalized = normalizeToInlineChords(content);
  if (semitones === 0) return normalized;

  const targetKey = getTransposedKey(originalKey || 'C', semitones);
  const useFlats  = keyUsesFlats(targetKey);

  return normalized.replace(/\[([^\]]+)\]/g, (match, chord) => {
    if (SECTION_RE.test(chord.trim())) return match;
    if (/^\d+x$/i.test(chord.trim())) return match;
    return '[' + transposeChord(chord, semitones, useFlats) + ']';
  });
}
