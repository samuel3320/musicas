/* ============================================================
   transpose.js — Motor de Transposição de Tonalidade
   Suporte a notação americana, acordes com baixo (G/B), bemóis/sustenidos
   ============================================================ */

'use strict';

const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Tonalidades que usam bemóis por convenção
const FLAT_KEYS = new Set([
  'F','Bb','Eb','Ab','Db','Gb',
  'Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'
]);

/**
 * Retorna o índice (0-11) de uma nota.
 */
function _noteIndex(note) {
  let i = NOTES_SHARP.indexOf(note);
  if (i === -1) i = NOTES_FLAT.indexOf(note);
  return i; // -1 se inválido
}

/**
 * Transporta uma nota isolada (ex: "F#", "Bb") por N semitons.
 */
function _transposeNote(note, semitones, useFlats) {
  const i = _noteIndex(note);
  if (i === -1) return note; // nota inválida, retorna original
  const newI = ((i + semitones) % 12 + 12) % 12;
  return useFlats ? NOTES_FLAT[newI] : NOTES_SHARP[newI];
}

/**
 * Transporta um símbolo de acorde completo.
 * Suporta: G, Am, C#m7, G7sus4, F#m, G/B, Bb/D, etc.
 */
function transposeChord(chord, semitones, useFlats) {
  if (!chord) return chord;
  if (semitones === 0) return chord;

  // Acorde com baixo: G/B → transporta raiz e baixo separadamente
  if (chord.includes('/')) {
    const slashIdx = chord.indexOf('/');
    const root = chord.slice(0, slashIdx);
    const bass = chord.slice(slashIdx + 1);
    return transposeChord(root, semitones, useFlats) + '/' + _transposeNote(bass, semitones, useFlats);
  }

  // Extrai a nota raiz (1 ou 2 caracteres: nota + opcional # ou b)
  const match = chord.match(/^([A-G][#b]?)(.*)/s);
  if (!match) return chord;

  const root   = match[1];
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

  // Usa bemol se a nova tonalidade é convencionalmente bemolada
  return (FLAT_KEYS.has(flatResult) || FLAT_KEYS.has(flatResult.replace(/m$/, '')))
    ? flatResult
    : sharpResult;
}

/**
 * Transporta toda a cifra (formato com colchetes inline).
 * Substitui todos os [ACORDE] no conteúdo.
 *
 * @param {string} content      Cifra no formato "[G]palavra [Am]outra"
 * @param {number} semitones    Quantidade de semitons
 * @param {string} originalKey  Tom original da música
 * @returns {string}            Cifra com acordes transpostos
 */
function transposeCifraContent(content, semitones, originalKey) {
  if (!content || semitones === 0) return content;

  const targetKey = getTransposedKey(originalKey || 'C', semitones);
  const useFlats  = keyUsesFlats(targetKey);

  return content.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return '[' + transposeChord(chord, semitones, useFlats) + ']';
  });
}

