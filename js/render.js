/* ============================================================
   render.js — Parser e Renderizador de Cifras
   Converte cifra no formato [ACORDE]letra em HTML estilizado,
   com acordes aproximados da frase e seções destacadas.
   ============================================================ */

'use strict';

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
 * Formata o título da seção (ex: "[Refrão]" → "REFRÃO")
 */
function _formatSectionTitle(str) {
  return str.trim()
    .replace(/^\[+|\]+$/g, '')
    .replace(/[:.\-]+$/, '')
    .trim()
    .toUpperCase();
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
 */
function _renderChordLine(line) {
  // Limpa possíveis colchetes aninhados como [[Am7]G/B]
  const cleaned = line.replace(/\[\[([^\]]+)\]([^\]]+)\]/g, '[$1] [$2]');

  // Divide a linha em partes: [ACORDE] e texto
  const parts = cleaned.split(/(\[[^\]]+\])/);

  const groups = [];
  let pendingChord = null;

  for (const part of parts) {
    const chordMatch = part.match(/^\[([^\]]+)\]$/);
    if (chordMatch) {
      if (pendingChord !== null) {
        groups.push({ chord: pendingChord, lyric: '' });
      }
      pendingChord = chordMatch[1];
    } else {
      if (pendingChord !== null) {
        groups.push({ chord: pendingChord, lyric: part });
        pendingChord = null;
      } else if (part) {
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
    const chordHtml = g.chord ? _esc(g.chord) : '&nbsp;';
    const lyricHtml = g.lyric ? _esc(g.lyric) : '&nbsp;';
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
 *  - Marcador seção  → .cifra-section (ex: REFRÃO, VERSO 1)
 *  - Contém [ACORDE] → chord-groups (.cifra-row)
 *  - Caso contrário  → letra pura (.cifra-lyric-only)
 */
function renderCifra(content) {
  if (!content || !content.trim()) {
    return '<div class="empty-state"><span class="empty-state-icon">🎵</span><h3>Cifra não disponível</h3></div>';
  }

  // Garante que qualquer acorde em linha tradicional seja normalizado para [acorde]
  const normalized = (typeof normalizeToInlineChords === 'function')
    ? normalizeToInlineChords(content)
    : content;

  const lines = normalized.split('\n');
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      html += '<div class="cifra-empty"></div>';
    } else if (SECTION_RE.test(trimmed)) {
      html += `<div class="cifra-section">${_esc(_formatSectionTitle(trimmed))}</div>`;
    } else if (_hasChords(line)) {
      html += _renderChordLine(line);
    } else {
      html += `<div class="cifra-lyric-only">${_esc(line)}</div>`;
    }
  }

  return html;
}
