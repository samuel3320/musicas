# 🎸 CifraCloud — Minhas Cifras Pessoais

Site estático para consultar e gerenciar cifras para tocar na igreja.  
Hospedado no GitHub Pages: `https://seuusuario.github.io/Musicas`

---

## 🚀 Deploy no GitHub Pages

1. Crie um repositório no GitHub chamado **`Musicas`**
2. Suba todos os arquivos para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Primeiro commit — CifraCloud"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/Musicas.git
   git push -u origin main
   ```
3. No repositório, vá em **Settings → Pages → Source → Deploy from branch → main / (root)**
4. Aguarde ~1 minuto e acesse: `https://SEU_USUARIO.github.io/Musicas`

---

## ➕ Como Adicionar Cifras

### Método 1 — Página Admin (mais fácil ✅)

1. Abra `admin.html` no seu navegador
2. Cole a cifra completa do CifraClub ou do seu arquivo TXT
3. Clique em **"Analisar e Preencher"** — o sistema detecta título, artista, tom e converte os acordes
4. Revise os dados preenchidos automaticamente (edite se precisar)
5. Clique em **"Gerar Arquivos JSON"**
6. **Copie** o primeiro JSON → salve como `data/songs/ID-DA-MUSICA.json`
7. **Copie** a entrada do índice → abra `data/index.json` e adicione dentro do array `[…]`
8. Faça commit e push → música aparece no site automaticamente!

### Método 2 — Manual (para quem já sabe o formato)

Crie `data/songs/nome-da-musica.json`:

```json
{
  "id": "nome-da-musica",
  "title": "Nome da Música",
  "artist": "Nome do Artista",
  "key": "G",
  "capo": 2,
  "tags": ["louvor", "adoração"],
  "content": "[G]Primeira [D]parte da [Em]letra\n[C]Segunda parte da letra"
}
```

Adicione a entrada em `data/index.json` (dentro do array):

```json
{
  "id": "nome-da-musica",
  "title": "Nome da Música",
  "artist": "Nome do Artista",
  "key": "G",
  "tags": ["louvor"],
  "searchText": "primeira parte da letra segunda parte da letra"
}
```

---

## 📝 Formato das Cifras

O formato interno usa **colchetes inline** — o acorde fica imediatamente antes da sílaba correspondente:

```
[G]Hosana, [D]hosana,
[Em]Hosana nas [C]alturas
```

### Marcadores de Seção

Escreva os marcadores de seção em linha própria, sem colchetes:

```
Verso 1:
[G]Letra do verso aqui...

Refrão:
[Em]Letra do refrão...

Ponte:
[D]Letra da ponte...
```

### Seções Instrumentais (sem letra)

```
Intro:
[G]  [D]  [Em]  [C]  (2x)
```

---

## 🔍 Como Buscar

- Digite na caixa de busca: nome da música, artista ou trecho da letra
- Pressione `/` para focar no campo de busca a qualquer momento
- Clique nas **tags** para filtrar por categoria (louvor, adoração, hino...)
- A busca é instantânea — sem necessidade de pressionar Enter

---

## 🎼 Transposição de Tom

Na página de cada cifra:

| Botão | Ação |
|-------|------|
| **♭** | Abaixa 1 semitom |
| **♯** | Sobe 1 semitom |
| **↺ Original** | Volta ao tom original |
| **A− / A+** | Diminui / Aumenta a fonte |

O tom atual é exibido em destaque e mostra quantos semitons foram transpostos.

---

## 📁 Estrutura do Projeto

```
PROJETOCIFRA/
├── index.html              # Página inicial com busca
├── cifra.html              # Exibição da cifra com transposição
├── admin.html              # Adicionar novas cifras
├── css/
│   └── style.css           # Design system (dark/light mode)
├── js/
│   ├── transpose.js        # Motor de transposição
│   ├── render.js           # Parser e renderizador de cifras
│   └── app.js              # Lógica principal (busca, rotas, admin)
└── data/
    ├── index.json          # Índice com metadados de todas as músicas
    └── songs/              # Uma arquivo JSON por música
        ├── hosana.json
        ├── grande-e-o-senhor.json
        └── ...
```

---

## 💡 Dicas

- **Backup**: O `data/` inteiro é seu banco de dados. Mantenha sempre no Git.
- **Tags úteis**: `louvor`, `adoração`, `hino`, `comunhão`, `santa-ceia`, `natal`, `páscoa`, `instrumental`
- **Capo**: Se a música usa capo, coloque no campo `capo` (ex: `"capo": 2`). O site mostra a informação mas os acordes já estão escritos considerando o capo.
- **Busca por letra**: O campo `searchText` no `index.json` é usado para busca no conteúdo. A página admin preenche automaticamente com a letra sem acordes.

---

*Feito com ❤️ para louvar a Deus*

