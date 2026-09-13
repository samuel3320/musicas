/* ============================================================
   app.js — Lógica Principal do CifraCloud
   Gerencia: busca, página de cifra e página admin
   ============================================================ */

'use strict';

/* ============================================================
   UTILIDADES COMPARTILHADAS
   ============================================================ */

/** Gerenciador de Tema (dark / light) */
const Theme = {
  KEY: 'cifracloud-theme',
  get() { return localStorage.getItem(this.KEY) || 'dark'; },
  apply(t) { document.documentElement.setAttribute('data-theme', t); },
  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(this.KEY, next);
    this.apply(next);
    this._updateIcon(next);
  },
  _updateIcon(t) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  },
  init() {
    const t = this.get();
    this.apply(t);
    this._updateIcon(t);
    document.getElementById('theme-toggle')
      ?.addEventListener('click', () => this.toggle());
  }
};

/** Exibe uma notificação toast temporária */
function showToast(msg, type = 'success', ms = 2800) {
  let c = document.querySelector('.toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/** Copia texto para a área de transferência */
async function copyToClipboard(text, successMsg = '✓ Copiado!') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), {
      value: text, style: 'position:fixed;opacity:0'
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  showToast(successMsg);
}

/** Debounce simples */
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Slug seguro para nomes de arquivo */
function slugify(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Escape para regex */
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Escape HTML simples */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================================================
   PÁGINA DE BUSCA (index.html)
   ============================================================ */

let _allSongs = [];
let _activeTag = null;

async function initSearchPage() {
  Theme.init();

  // Carrega índice de músicas
  try {
    const r = await fetch('data/index.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _allSongs = await r.json();
  } catch (err) {
    document.getElementById('results-container').innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3>Erro ao carregar músicas</h3>
        <p>Verifique se o arquivo <code>data/index.json</code> existe.</p>
      </div>`;
    return;
  }

  _renderResults(_allSongs, '');
  _setupSearchListeners();
  _setupTagFilters();

  // Atalho: "/" foca no campo de busca
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  });
}

function _setupSearchListeners() {
  const main   = document.getElementById('search-input');
  const header = document.getElementById('header-search');
  const doSearch = debounce(q => {
    if (main   && main.value   !== q) main.value   = q;
    if (header && header.value !== q) header.value = q;
    _performSearch(q);
  }, 160);

  main?.addEventListener('input',   e => doSearch(e.target.value));
  header?.addEventListener('input', e => doSearch(e.target.value));
}

function _performSearch(query) {
  const q = query.trim();
  let results = q ? _searchSongs(q, _allSongs) : _allSongs;
  if (_activeTag) results = results.filter(s => (s.tags || []).includes(_activeTag));
  _renderResults(results, q);
}

/** Busca com pontuação por relevância */
function _searchSongs(query, songs) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = songs.map(song => {
    const title      = (song.title  || '').toLowerCase();
    const artist     = (song.artist || '').toLowerCase();
    const tags       = (song.tags   || []).join(' ').toLowerCase();
    const searchText = (song.searchText || '').toLowerCase();

    let score = 0;
    let miss  = false;

    for (const term of terms) {
      if      (title.startsWith(term))   score += 20;
      else if (title.includes(term))     score += 12;
      else if (artist.startsWith(term))  score += 8;
      else if (artist.includes(term))    score += 5;
      else if (tags.includes(term))      score += 3;
      else if (searchText.includes(term))score += 1;
      else { miss = true; break; }
    }

    return { song, score: miss ? 0 : score };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.song);
}

function _setupTagFilters() {
  const tagSet = new Set();
  _allSongs.forEach(s => (s.tags || []).forEach(t => tagSet.add(t)));

  const container = document.getElementById('tags-filter');
  if (!container || tagSet.size === 0) return;

  // Botão "Todas"
  const allBtn = document.createElement('span');
  allBtn.className = 'tag active';
  allBtn.textContent = 'Todas';
  allBtn.dataset.tag = '';
  container.appendChild(allBtn);

  tagSet.forEach(tag => {
    const btn = document.createElement('span');
    btn.className = 'tag';
    btn.textContent = tag;
    btn.dataset.tag = tag;
    container.appendChild(btn);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('.tag');
    if (!btn) return;
    container.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    _activeTag = btn.dataset.tag || null;
    _performSearch(document.getElementById('search-input')?.value || '');
  });
}

function _renderResults(songs, query) {
  const container = document.getElementById('results-container');
  if (!container) return;

  if (songs.length === 0 && !query && !_activeTag) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🎵</span>
        <h3>Nenhuma cifra cadastrada ainda</h3>
        <p>Adicione suas cifras pela página <a href="admin.html">➕ Adicionar</a></p>
      </div>`;
    return;
  }

  if (songs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🔍</span>
        <h3>Nenhuma música encontrada</h3>
        <p>Tente buscar por outro nome, artista, letra ou acorde</p>
      </div>`;
    return;
  }

  const term0 = (query || '').trim().split(/\s+/)[0] || '';
  const hl = (text) => {
    if (!term0) return esc(text);
    return esc(text).replace(
      new RegExp('(' + escapeRegex(esc(term0)) + ')', 'gi'),
      '<mark>$1</mark>'
    );
  };

  const header = `<div class="results-header">${songs.length} música${songs.length !== 1 ? 's' : ''}</div>`;

  const cards = songs.map(s => {
    const tagsHtml = (s.tags || [])
      .map(t => `<span class="song-tag">${esc(t)}</span>`)
      .join('');
    return `
    <a class="song-card" href="cifra.html?id=${encodeURIComponent(s.id)}">
      <div class="song-card-content">
        <div class="song-title">${hl(s.title || '')}</div>
        <div class="song-artist">${hl(s.artist || '')}</div>
      </div>
      <div class="song-meta">
        ${tagsHtml ? `<div class="song-tags-list">${tagsHtml}</div>` : ''}
        <span class="key-badge">${esc(s.key || '?')}</span>
        <span class="arrow-icon">›</span>
      </div>
    </a>`;
  }).join('');

  container.innerHTML = header + '<div class="song-list">' + cards + '</div>';
}

/* ============================================================
   PÁGINA DE CIFRA (cifra.html)
   ============================================================ */

let _song         = null;
let _semitones    = 0;
let _fontSize     = 100;

async function initCifraPage() {
  Theme.init();

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'index.html'; return; }

  const display = document.getElementById('cifra-display');

  try {
    const r = await fetch(`data/songs/${encodeURIComponent(id)}.json`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _song = await r.json();
  } catch {
    if (display) display.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">😕</span>
        <h3>Cifra não encontrada</h3>
        <p>O arquivo <code>data/songs/${esc(id)}.json</code> não existe.</p>
        <p style="margin-top:.5rem"><a href="admin.html">➕ Adicionar esta cifra</a></p>
      </div>`;
    return;
  }

  // Metadados
  document.title = `${_song.title || 'Cifra'} — CifraCloud`;
  document.getElementById('song-title').textContent  = _song.title  || '';
  document.getElementById('song-artist').textContent = _song.artist || '';
  document.getElementById('original-key').textContent = _song.key   || '?';

  const capoEl = document.getElementById('capo-info');
  if (capoEl) {
    if (_song.capo) {
      capoEl.querySelector('strong').textContent = `Capo ${_song.capo}ª`;
      capoEl.style.display = '';
    } else {
      capoEl.style.display = 'none';
    }
  }

  // Fonte salva
  _fontSize = parseInt(localStorage.getItem('cifracloud-fontsize') || '100');
  _applyFontSize();

  // Renderiza cifra inicial
  _renderCifraPage();

  // Controles de transposição
  document.getElementById('transpose-up')
    ?.addEventListener('click', () => _shiftSemitones(+1));
  document.getElementById('transpose-down')
    ?.addEventListener('click', () => _shiftSemitones(-1));
  document.getElementById('transpose-reset')
    ?.addEventListener('click', () => { _semitones = 0; _renderCifraPage(); _updateTransposeUI(); });

  // Controles de fonte
  document.getElementById('font-increase')
    ?.addEventListener('click', () => _changeFontSize(+10));
  document.getElementById('font-decrease')
    ?.addEventListener('click', () => _changeFontSize(-10));
}

function _renderCifraPage() {
  const content = transposeCifraContent(_song.content || '', _semitones, _song.key || 'C');
  document.getElementById('cifra-display').innerHTML = renderCifra(content);
  _updateTransposeUI();
}

function _shiftSemitones(delta) {
  _semitones += delta;
  // Mantém no intervalo -5 a +6 (uma oitava)
  if (_semitones > 6)  _semitones -= 12;
  if (_semitones < -5) _semitones += 12;
  _renderCifraPage();
}

function _updateTransposeUI() {
  const currentKey = getTransposedKey(_song.key || 'C', _semitones);
  const keyEl  = document.getElementById('key-display');
  const semiEl = document.getElementById('semitones-display');

  if (keyEl)  keyEl.textContent = currentKey;
  if (semiEl) {
    if (_semitones === 0) {
      semiEl.textContent = 'tom original';
      semiEl.style.color = '';
    } else {
      const sign = _semitones > 0 ? '+' : '';
      const n    = Math.abs(_semitones);
      semiEl.textContent = `${sign}${_semitones} semitom${n !== 1 ? 's' : ''}`;
      semiEl.style.color = 'var(--accent)';
    }
  }
}

function _changeFontSize(delta) {
  _fontSize = Math.max(70, Math.min(190, _fontSize + delta));
  localStorage.setItem('cifracloud-fontsize', _fontSize);
  _applyFontSize();
}

function _applyFontSize() {
  const el = document.getElementById('cifra-display');
  if (el) el.style.fontSize = _fontSize + '%';
}

/* ============================================================
   PÁGINA ADMIN (admin.html)
   ============================================================ */

function initAdminPage() {
  Theme.init();

  // Botões principais
  document.getElementById('parse-btn')
    ?.addEventListener('click', _handlePaste);
  document.getElementById('clear-btn')
    ?.addEventListener('click', _clearAdmin);
  document.getElementById('generate-btn')
    ?.addEventListener('click', _generateOutput);
  document.getElementById('copy-song-btn')
    ?.addEventListener('click', () =>
      copyToClipboard(document.getElementById('song-json-output').textContent, '✓ JSON da música copiado!'));
  document.getElementById('copy-index-btn')
    ?.addEventListener('click', () =>
      copyToClipboard(document.getElementById('index-json-output').textContent, '✓ Entrada do índice copiada!'));

  // Auto-parse ao colar
  document.getElementById('admin-input')
    ?.addEventListener('input', debounce(_handlePaste, 600));

  // Preview ao vivo
  ['admin-title','admin-artist','admin-key','admin-content'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', debounce(_updateAdminPreview, 250));
  });

  // Atualiza preview do nome do arquivo
  document.getElementById('admin-id')?.addEventListener('input', e => {
    const v = e.target.value || '...';
    document.querySelectorAll('.output-filename').forEach(el => el.textContent = v);
  });
}

/** Analisa o texto colado e preenche os campos */
function _handlePaste() {
  const raw = document.getElementById('admin-input')?.value?.trim();
  if (!raw) return;

  const parsed = _parsePastedCifra(raw);

  const set = (id, val) => { if (val && document.getElementById(id)) document.getElementById(id).value = val; };
  set('admin-title',   parsed.title);
  set('admin-artist',  parsed.artist);
  set('admin-key',     parsed.key);
  set('admin-capo',    parsed.capo);
  set('admin-content', parsed.content);

  if (parsed.title) {
    const id = slugify(parsed.title) + (parsed.artist ? '-' + slugify(parsed.artist.split(' ')[0]) : '');
    document.getElementById('admin-id').value = id;
    document.querySelectorAll('.output-filename').forEach(el => el.textContent = id);
  }

  _updateAdminPreview();
  if (parsed.title || parsed.content) showToast('✓ Cifra analisada!', 'success');
}

/** Parser principal — detecta formato e extrai metadados */
function _parsePastedCifra(text) {
  const lines = text.split('\n');
  let title = '', artist = '', key = '', capo = '';
  let contentStart = 0;

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const l = lines[i].trim();
    if (!l) continue;

    // Tom
    const keyM = l.match(/^tom[:\s]+([A-G][#b]?m?)/i);
    if (keyM) { key = keyM[1]; continue; }

    // Capo
    const capoM = l.match(/^capo[:\s]+(\d+)/i);
    if (capoM) { capo = capoM[1]; continue; }

    // Artista entre parênteses
    const artistParens = l.match(/^\((.+)\)$/);
    if (artistParens && title) { artist = artistParens[1]; continue; }

    // Título (primeira linha não vazia que não é metadado)
    if (!title && !l.match(/^(tom|capo|intro|tuning|afinação)/i)) {
      title = l;
      contentStart = i + 1;
      continue;
    }
  }

  // Detecta onde começa o conteúdo real da cifra
  // (pula linhas de metadado no início)
  let bodyLines = lines.slice(contentStart);

  // Remove linhas de metadado no início do corpo
  while (bodyLines.length > 0 && /^(tom[:\s]|capo[:\s]|\(.+\)$|tuning|afinação)/i.test(bodyLines[0].trim())) {
    bodyLines.shift();
  }

  // Remove linhas vazias iniciais
  while (bodyLines.length > 0 && !bodyLines[0].trim()) bodyLines.shift();

  const content = _convertToInlineFormat(bodyLines.join('\n'));

  // Tenta extrair tom do conteúdo se não encontrou no cabeçalho
  if (!key && content) {
    const m = content.match(/\[([A-G][#b]?m?)\]/);
    if (m) key = m[1].replace(/m.*/, ''); // usa a primeira nota encontrada como dica
  }

  return { title, artist, key, capo, content };
}

/* ============================================================
   CONVERSOR: Formato acordes-acima-da-letra → colchetes inline
   ============================================================ */

/** Detecta se um token individual é um acorde válido */
function _isChordToken(tok) {
  return /^[A-G][#b]?(m(aj\d*)?|min|aug|dim|sus[24]?|add\d*|M)?(\d+)?(\/[A-G][#b]?)?([#b])?$/.test(tok);
}

/** Detecta se uma linha inteira é de acordes (todos os tokens são acordes) */
function _isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  return toks.length > 0 && toks.every(_isChordToken);
}

/** Extrai acordes e suas posições de coluna de uma linha de acordes */
function _extractChords(line) {
  const result = [];
  const re = /([A-G][#b]?\S*)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    if (_isChordToken(m[1])) result.push({ chord: m[1], col: m.index });
  }
  return result;
}

/**
 * Junta uma linha de acordes com uma linha de letras no formato inline.
 * Insere [ACORDE] antes da posição correspondente na letra.
 */
function _mergeChordAndLyric(chordLine, lyricLine) {
  const chords = _extractChords(chordLine);
  if (chords.length === 0) return lyricLine;

  let result = lyricLine;

  // Insere da direita para a esquerda para não deslocar posições
  const sorted = [...chords].sort((a, b) => b.col - a.col);

  for (const { chord, col } of sorted) {
    const pos = Math.min(col, result.length);
    result = result.slice(0, pos) + `[${chord}]` + result.slice(pos);
  }

  return result;
}

/**
 * Converte texto de cifra para o formato com colchetes inline.
 * Suporta:
 *  - Formato com acordes acima da letra (CifraClub tradicional)
 *  - Formato já com colchetes [G]letra
 */
function _convertToInlineFormat(text) {
  if (!text.trim()) return '';

  // Se já tem colchetes inline, retorna direto (pode limpar espaços extras)
  if (/\[[A-G][^\]]*\]/.test(text)) {
    return text.trim();
  }

  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line     = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

    if (_isChordLine(line)) {
      if (nextLine !== null && nextLine.trim() !== '' && !_isChordLine(nextLine)) {
        // Par acorde + letra → merge
        result.push(_mergeChordAndLyric(line, nextLine));
        i += 2;
      } else if (nextLine === null || nextLine.trim() === '') {
        // Linha de acordes pura (instrumental, sem letra)
        const chords = _extractChords(line);
        result.push(chords.map(c => `[${c.chord}]`).join('  '));
        i += (nextLine !== null && nextLine.trim() === '') ? 2 : 1;
      } else {
        // Duas linhas de acordes seguidas — guarda a primeira como instrumental
        const chords = _extractChords(line);
        result.push(chords.map(c => `[${c.chord}]`).join('  '));
        i++;
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n').trim();
}

/** Atualiza o painel de preview */
function _updateAdminPreview() {
  const title   = document.getElementById('admin-title')?.value   || 'Título da Música';
  const artist  = document.getElementById('admin-artist')?.value  || '';
  const key     = document.getElementById('admin-key')?.value     || 'C';
  const content = document.getElementById('admin-content')?.value || '';

  const titleEl  = document.getElementById('preview-title');
  const artistEl = document.getElementById('preview-artist');
  const keyEl    = document.getElementById('preview-key');
  const contEl   = document.getElementById('preview-content');

  if (titleEl)  titleEl.textContent  = title;
  if (artistEl) artistEl.textContent = artist;
  if (keyEl)    keyEl.textContent    = key;
  if (contEl)   contEl.innerHTML     = renderCifra(content);
}

/** Gera os JSONs prontos para salvar */
function _generateOutput() {
  const id     = (document.getElementById('admin-id')?.value     || '').trim();
  const title  = (document.getElementById('admin-title')?.value  || '').trim();
  const artist = (document.getElementById('admin-artist')?.value || '').trim();
  const key    = (document.getElementById('admin-key')?.value    || 'C').trim();
  const capo   = (document.getElementById('admin-capo')?.value   || '').trim();
  const tagsRaw= (document.getElementById('admin-tags')?.value   || '').trim();
  const content= (document.getElementById('admin-content')?.value|| '').trim();

  if (!id || !title) {
    showToast('⚠️ Preencha pelo menos ID e Título', 'error');
    return;
  }

  const tags       = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const searchText = content.replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);

  const songObj = { id, title, artist, key, tags, content };
  if (capo) songObj.capo = Number(capo);

  const indexEntry = { id, title, artist, key, tags, searchText };
  if (capo) indexEntry.capo = Number(capo);

  document.getElementById('song-json-output').textContent  = JSON.stringify(songObj, null, 2);
  document.getElementById('index-json-output').textContent = JSON.stringify(indexEntry, null, 2);

  document.querySelectorAll('.output-filename').forEach(el => el.textContent = id);

  const outSection = document.getElementById('output-section');
  if (outSection) outSection.style.display = '';
  showToast('✓ JSON gerado! Copie e salve os arquivos.', 'success', 4000);
}

function _clearAdmin() {
  ['admin-input','admin-title','admin-artist','admin-capo','admin-tags','admin-id','admin-content']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const keyEl = document.getElementById('admin-key');
  if (keyEl) keyEl.value = 'G';
  const outSection = document.getElementById('output-section');
  if (outSection) outSection.style.display = 'none';
  _updateAdminPreview();
}

/* ============================================================
   BOOTSTRAP — detecta qual página inicializar
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if      (document.getElementById('search-input'))  initSearchPage();
  else if (document.getElementById('cifra-display'))  initCifraPage();
  else if (document.getElementById('admin-input'))    initAdminPage();
});

