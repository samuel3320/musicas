/* ============================================================
   render.js — Parser e Renderizador de Cifras
   Converte cifra no formato [ACORDE]letra em HTML estilizado
   ============================================================ */

'use strict';

// Padrões de marcadores de seção (Verso, Refrão, Ponte, etc.)
const SECTION_RE = /^\s*(intro|vers[oõ](\s*\d*)?|coro|refrão|refrao|refrão|ponte|outro|solo|estrofe\s*\d*|pr[eé]-?coro|pre[- ]?chorus|bridge|chorus|verse\s*\d*|final|fim|tag|interl[uú]dio|interludio|instrumental)[\s:.\-]*/i;

/**
 * Escapa caracteres HTML especiais.
 */
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Verifica se uma linha contém acordes inline ([G], [Am7], etc.)
 */
function _hasChords(line) {
  return /\[[A-G][^\]]*\]/.test(line);
}

/**
 * Renderiza uma linha que contém acordes inline.
 * Cada par (acorde, letra) vira um .chord-group com .chord em cima e .lyric embaixo.
 *
 * Ex: "[G]Hosana [D]hosana" → HTML com dois chord-groups
 */
function _renderChordLine(line) {
  // Divide a linha em partes: [ACORDE] e texto
  const parts = line.split(/(\[[^\]]+\])/);

  const groups = [];
  let pendingChord = null;

  for (const part of parts) {
    const chordMatch = part.match(/^\[([^\]]+)\]$/);
    if (chordMatch) {
      // É um acorde — pode ter acorde anterior sem letra ainda
      if (pendingChord !== null) {
        groups.push({ chord: pendingChord, lyric: '' });
      }
      pendingChord = chordMatch[1];
    } else {
      // É texto (letra)
      if (pendingChord !== null) {
        groups.push({ chord: pendingChord, lyric: part });
        pendingChord = null;
      } else if (part) {
        // Texto antes do primeiro acorde
        groups.push({ chord: '', lyric: part });
      }
    }
  }

  // Flush de acorde final sem letra
  if (pendingChord !== null) {
    groups.push({ chord: pendingChord, lyric: '' });
  }

  if (groups.length === 0) return '';

  let html = '<div class="cifra-row">';
  for (const g of groups) {
    const chordHtml = _esc(g.chord);
    const lyricHtml = _esc(g.lyric);
    html += `<span class="chord-group">` +
            `<span class="chord">${chordHtml}</span>` +
            `<span class="lyric">${lyricHtml}</span>` +
            `</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * Renderiza o conteúdo completo de uma cifra para HTML.
 *
 * Regras por linha:
 *  - Vazia           → espaçador
 *  - Começa com marcador de seção → .cifra-section
 *  - Contém [ACORDE] → chord-groups (.cifra-row)
 *  - Caso contrário  → letra pura (.cifra-lyric-only)
 *
 * @param {string} content  Conteúdo da cifra no formato inline
 * @returns {string}        HTML pronto para inserir no DOM
 */
function renderCifra(content) {
  if (!content || !content.trim()) {
    return '<div class="empty-state"><span class="empty-state-icon">🎵</span><h3>Cifra não disponível</h3></div>';
  }

  const lines = content.split('\n');
  let html = '';

  for (const line of lines) {
    if (line.trim() === '') {
      html += '<div class="cifra-empty"></div>';
    } else if (SECTION_RE.test(line.trim())) {
      html += `<div class="cifra-section">${_esc(line.trim())}</div>`;
    } else if (_hasChords(line)) {
      html += _renderChordLine(line);
    } else {
      html += `<div class="cifra-lyric-only">${_esc(line)}</div>`;
    }
  }

  return html;
}

