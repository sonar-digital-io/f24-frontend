# Lessons learned

Working notes a Figma → React implementáció során. Ha újra Figma-vezérelt page-eket csinálunk, ezt nézd át először.

---

## Figma MCP setup gotchák

### 1. A Dev Mode MCP toggle 2026-ban máshova költözött

**Régi docs (2024-2025):** Figma menü → Preferences → "Enable Dev Mode MCP Server".

**Új helye:** A fájlon belül.
1. Felső toolbar **jobb oldalán** `</>` ikon → Dev Mode bekapcsol
2. Dev Mode-ban a **jobb sidebar alján** "Enable MCP server" toggle

A "Preferences" útvonal **nincs többé**. Aki ott keresi, azt hiszi nem aktív a feature.

### 2. Claude Code-ot újra kell indítani a Figma server bekapcsolása után

A `mcp__Figma__*` kliens csak Claude Code induláskor csatlakozik. Ha a Figma MCP server később indul, a tool-hívások a régi "enable the Dev Mode MCP Server" hibaüzenetet adják, akkor is, ha a server fut a `localhost:3845`-en.

**Megoldás:** Indítsd újra a Claude Code-ot (Claude Desktop esetén: tálca → Quit → újraindítás).

**Ajánlott sorrend új session-höz:**
1. Figma desktop indítása + Dev Mode + MCP server bekapcsolás
2. A megfelelő fájl megnyitása **aktív tab-ként**
3. Aztán Claude Code indítása

### 3. "No node could be found" — rossz fájl van az aktív tab-en

A `mcp__Figma__get_metadata` ezt dobja, ha a node ID egy másik fájlhoz tartozik mint az aktív Figma tab. **Kattints a megfelelő fájl tab-jára** és próbáld újra. Selection nem kötelező, de aktív tab igen.

### 4. Remote MCP alternatíva minden csomagban

Ha a desktop MCP nem akar bejönni / nincs Pro/Org/Enterprise license:

```
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Böngészőben auth, link-alapú workflow.

### 5. Code Connect kérdés átugorható

A `get_design_context` első hívásakor felajánl egy "do you want to connect code components" promptot. Ha nem mondod neki, hogy ne kérdezze, minden hívásnál újrakérdezi — még akkor is, ha "yes/no"-val válaszoltál. A workaround: a screenshot + metadata + variable_defs hármas elég gyakran a pixel-pontos implementációhoz, a `get_design_context` opcionális.

### 6. Long `get_design_context` request timeout-olhat

Komplex komponens-instance-okon (`get_design_context` egy `top-nav-proto` instance-ra) a Figma MCP `Request timed out` hibát dobott. A `get_screenshot` + `get_metadata` általában elég, és gyorsabb. Csak akkor `get_design_context`, ha tényleg kell a generált kód minta.

---

## Tailwind / React gotchák

### Name collision: `Material` típus és `Material()` page függvény

A `src/data/materials.ts`-ben `interface Material`, és a `src/pages/Material.tsx`-ben `export function Material()`. Babel duplicate declaration hibát dob.

**Megoldás:** alias import:

```ts
import { type Material as MaterialItem } from '@/data/materials';
```

A page függvény nevét ne változtasd meg (App.tsx route-ja várja).

### Responsive padding: `max-w` + `mx-auto` > `xl:px-[260px]`

A Figma 1920px-es viewportra van tervezve, 260px paddinggel mindkét oldalon. Ha ezt 1:1-ben átveszed (`xl:px-[260px]`), akkor 1600px alatti viewporton a content szétnyúlik / túl szűk lesz.

**Helyes mintázat:**

```tsx
<main className="px-4 sm:px-8 lg:px-16">
  <div className="mx-auto w-full max-w-[1400px]">...</div>
</main>
```

Így 1600px-en a content 1400px lesz (megfelel a Figma-nak), kisebb viewporton pedig graceful degradation.

### Pagination mindig renderelődjön

Csábító `{totalPages > 1 && <Pagination />}`-t írni. **Ne tedd.** A Figma a paginatort mindig mutatja (még 1 oldalas esetben is, ahol disabled). Hagyd, hogy a `Pagination` maga döntse el a disabled állapotokat — ne a renderelést.

### Sticky `<MainNav>` parent nem lehet `overflow:hidden`

A `position: sticky` csak akkor működik, ha NINCS overflow-clip a parent láncban. A `pages/Home.tsx` root `<div className="flex flex-col min-h-screen">` rendben — flex container nem clipel.

Ha hozzáadnál egy `overflow-hidden`-t bármelyik szülőhöz (pl. animation purposokra), a sticky elveszik. Inkább child-on használj overflow-ot, ne parent-en.

**Kivétel:** `GeometryEdit` `<main>`-je SZÁNDÉKOSAN `overflow-hidden` — ott a Three.js canvas a fő terület, nem akarjuk hogy az túllógjon. A `MainNav` ezen kívül van (a parent flex-col-on), tehát továbbra is sticky.

### HTML5 native drag-and-drop reorder gotchas

A `LayupBuilder` sortable ply-listája natív DnD-vel. Pár klassikus buktató:

1. **`onDragOver`-en kötelező a `preventDefault()`** — anélkül a `drop` event nem fires. A böngésző alapból "no drop allowed"-ot mond.
2. **`dataTransfer.setData('text/plain', ...)` kötelező** — ha üres a payload, némely böngésző nem indítja el a drag-et. Firefox például szigorúbb.
3. **A `dropEffect = 'move'`** az `onDragOver`-en kell, hogy a kurzor visszaadja a "move" jelet (különben default "copy").
4. **Mobil touch NEM fires HTML5 DnD-t**. Egy 5 elemű kis listához OK most desktop-only, de production-ra `dnd-kit` (vagy `react-dnd` + touch backend) kell.
5. **Drag source visual state**: a draggable elemen `opacity: 0.4` ha `draggingIdx === idx`. Drop target visual state: `bg-[#eef9ff]` ha `dropOverIdx === idx`. Mindkettő state-tartott, és `onDragEnd`-en cleared.

### Controlled input + reformat anti-pattern

A táblázat input mezői és a bezier görbe két-irányú szinkronja: drag a chart-on → input frissül, gépelés az inputba → görbe frissül.

**Anti-pattern**: `value={p.x.toFixed(4)}` minden render-en — a user által beírt `"0.5"` rögtön `"0.5000"`-ré formázódik, a cursor a végére ugrik, a következő karakter rossz helyre kerül. A teszt szerint technikailag a propagation működik, de az UX zavart.

**Helyes minta**: local `editingValues: Record<string, string>` state. Render value: `editingValues[key] ?? p.x.toFixed(4)`. OnChange: lerakja a nyers stringet a buffer-be, és ha `Number.isFinite(parseFloat(raw))`, propagálja a parent state-be. OnBlur: törli a buffer entry-t → render visszaáll a canonical formátumra.

```tsx
const [editingValues, setEditingValues] = useState<Record<string, string>>({});

function handleChange(key, raw) {
  setEditingValues(v => ({ ...v, [key]: raw }));
  const parsed = parseFloat(raw);
  if (Number.isFinite(parsed)) propagateToParent(key, parsed);
}
function handleBlur(key) {
  setEditingValues(v => { const n = {...v}; delete n[key]; return n; });
}
```

### HTML5 `type="number"` intermediate state "0." → ""

A `<input type="number">` "0." átmeneti gépelési állapotot a böngésző `validity.valid: false`-nek tekinti, és az `.value` üres stringet ad vissza JS-en keresztül. A `0.5` és `0.55` rendben — de a "0." pillanat nem.

Ha ez számít a use-case-nek (pl. tudományos jelölés `1e-6`), váltsd `type="text" inputMode="decimal"`-re, és a JS-en validálj saját regex-szel. Most a profil paraméterekhez `type="number"` elfogadott (a `0.` pillanat invisible — a user folytatja a tizedes számokat).

### viewBox-based zoom drag math no-op

A `BezierEditor`-ben a zoom + pan a `<svg>` viewBox szélességén és top-left offset-en történik. A control point drag handler használ `svg.getScreenCTM().inverse()`-t — és **ez automatikusan figyelembe veszi az új viewBox-ot**. Tehát semmi manuális zoom-adjustment a drag math-ban.

Plusz `vectorEffect="non-scaling-stroke"` minden stroke-on → vonalvastagság változatlan marad zoomban (különben 8x zoomban a 2.5px stroke 20px-szé válna).

### Y axis label float drift

A `for (let v = yMin; v <= yMax; v += yStep)` ciklusban a `v` float drift-be megy: `0.1 + 0.1 + 0.1 = 0.30000000000000004`. Ha a labelt `{v}` rendereled, az JS `String(0.30000000000000004)` → "0.30000000000000004" — csúnya.

**Fix**: `v.toFixed(decimals)` ahol `decimals = -log10(yStep)`. Ha `yStep = 0.1` → 1 decimális → "0.3" tisztán. Ha `yStep = 1` → 0 decimális → "24".

```tsx
const decimals = yStep >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(yStep)));
const label = v.toFixed(decimals);
```

### Custom Switch thumb pozicionálás

A `<span>` thumb-ot ne dinamikus `translate-x-[18px]`-szel mozgasd a track-en belül, mert a `top-[2px]` + `translate-x-[N]` kombináció gyakran 1-2px-szel "kilóg" a track-ből. **Helyes minta**:

```tsx
<button className="relative h-5 w-9 rounded-full">
  <span className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white transition-transform ${
    checked ? 'translate-x-4' : 'translate-x-0'
  }`} />
</button>
```

- `left-[2px] top-[2px]` rögzített pozíció a track-en belül (2px szimmetrikus padding)
- `translate-x-4` (16px = thumb szélesség) on-state-ben → thumb pontosan a jobb szélen, 2px padding marad
- `translate-x-0` off-state-ben → thumb a bal szélen, 2px padding

Tailwind preset (`translate-x-4`) megbízhatóbb mint custom arbitrary value (`translate-x-[18px]`), mert a böngészők renderelése konzisztensebb.

### `aria-current="page"` link active state-hez

A nav active indicator-on használj `aria-current="page"`-t a `<Link>` aria attribútumon — könnyű inspectálni, screen reader-baráti, és nem keveredik a `:active` CSS pseudo-class-szal (ami csak a kattintás pillanatában igaz).

```tsx
<Link
  to={path}
  aria-current={isActive ? 'page' : undefined}
  className={isActive ? 'bg-[#eef9ff]' : '...'}
>
```

### Flex `justify-between` NEM viewport-szélesség közepe

Háromelemes `flex justify-between`-ben a középső elem a bal és jobb elem közötti tér közepén ül, NEM a teljes szélesség közepén. Ha a viewport-szélesség közepére kell:

```tsx
<div className="relative">
  <div className="absolute inset-y-0 left-4">{left}</div>
  <h1 className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
    {center}
  </h1>
  <div className="absolute inset-y-0 right-4">{right}</div>
</div>
```

A `pointer-events-none` a középső elemen átengedi a kattintást a háttér canvas-nak (Geometry edit).

### `<form>`-ban a `<Button asChild={false}>` + `<Link>` antipattern

A shadcn Button komponens nem mindig támogatja az `asChild` prop-ot (Radix Slot-tól függ). A Material page-en előbb `<Button>` benne `<Link>` szerkezetet próbáltunk — disable kattintás, type submit hiba. **Inkább a `<Link>`-et stílusozd a Button-os classNames-zel**:

```tsx
<Link to={...} className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] ...">
  {label}
</Link>
```

### React Router pushState NEM mindig triggereli a re-render-t

A `preview_eval`-ból `window.history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))` néha nem indítja el a React Router újraértékelését. **Hard reload-ot használj** ehelyett (`window.location.href = '/new-path'`) ha biztos akarsz lenni.

A valós user-flow (Link kattintás) viszont triggereli. Csak a programatikus teszteléskor érdemes erre figyelni.

---

## Preview tool gotchák

### `preview_inspect` csak az első match-et adja vissza

A tool selector-onkint **egy** elem styles + bounding box-át adja vissza, nem listát. Ha több elem van a selector-ral (`button[aria-expanded='true']`), csak az első hierarchiabeli sorrendben.

Ha listát akarsz, használj `preview_eval`-t:

```js
Array.from(document.querySelectorAll("button[aria-expanded='true']"))
  .map(b => b.getAttribute('aria-controls'))
```

### Click + inspect race condition

Click után közvetlenül az inspect még a régi React renderelést láthatja (state-update mikrotask). Ha az inspect output furcsa, használj `preview_eval`-t setTimeout-tal:

```js
btn.click();
await new Promise(r => setTimeout(r, 150));
// most már tiszta a re-render
```

A 150ms a tapasztalat alapján elég. 50ms időnként kevés.

### `preview_screenshot` mindig kicsi, nem skálázódik viewport-tal

A screenshot tool fix méretben rendereli a képet, függetlenül a viewport-tól. Ha a layout-ot pontosan akarod látni, használj `preview_inspect`-et CSS property-kkel — sokkal megbízhatóbb mint a pixel-counting screenshot-ot.

A screenshot csak smoke teszthez jó ("látszik-e bármi", "fault state-e").

### `preview_resize` desktop preset nem 1280px lehet

A "desktop" preset alapból a notebook felbontást használja. Ha 1600+ wide-ra akarod tesztelni a Figma-méretű layoutot, adj explicit `width` / `height` paramétert (`width: 1600, height: 1000`).

### Vite reload error log perzisztens

A `preview_console_logs` log-okat halmoz az előző failed reload-okból, akkor is, ha a hiba már javítva. **Tudjuk:** az utolsó reload után friss-e a log. Ha a page-en `getBoundingClientRect()` realisztikus értékeket ad vissza, a build oké függetlenül a régi error logoktól.

### Three.js canvas screenshot fail

`UnknownVizError` jöhet ha a screenshot tool nem tudja megragadni a WebGL canvas-t. **Próbáld újra** közvetlenül utána (általában működik a 2. próbálkozásra). Vagy: használj `preview_eval`-t `getBoundingClientRect`-tel a layout ellenőrzésére, és csak vizuálisan ellenőrizd a screenshot-ot ha kell.

---

## Architektúra döntések

### Page-ek maguk renderelnek MainNav + Footer-t

A `Layout` komponens passthrough lett. Lehetne globális, de:
- A `Nurbs` page fullscreen — semmi nav, semmi footer
- A `Home` és `Material` ugyanazt a stack-et építik fel, de mindkét helyen explicit ott a kód
- A `GeometryEdit` és `Composition` szándékosan footer NÉLKÜL (edit mode)

**Trade-off:** kicsit több ismétlődés (`<MainNav />` + `<Footer />` minden page elején/végén), cserébe nincs "page kivétel" logika a Layout-ban. Ha minden page biztosan MainNav-ot akar, a `PagePlaceholder` mintát kell követni — minden új page-be expliciten beilleszteni.

### Két nézet egyetlen state-tel (sortable list + viz)

A `LayupBuilder` táblázat és a `PlyStackViz` izometrikus rajz **ugyanazt a `plies: Ply[]` arrayt** kapja. Reorder a táblázatban → state frissül → mindkét komponens újra renderel. **Soha NE duplikáld a state-et két komponensbe**, mert nem fognak konzisztensen maradni.

Plusz: a szín a `Ply.color` mezőben tárolva mindkettő ugyanazt használja. Ha az orientation megváltozik, a `defaultColorForOrientation()` mapping újra rendel színt — egy helyen frissítve, mindkettő automatikusan átvált.

```tsx
function updatePly(idx, key, value) {
  setPlies(arr => arr.map((p, i) => {
    if (i !== idx) return p;
    const next = { ...p, [key]: value };
    if (key === 'orientation') {
      next.color = defaultColorForOrientation(value);
    }
    return next;
  }));
}
```

Ezzel a mintával "single source of truth" + automatikus szinkron a táblázat és viz között.

### Interaktív bezier editor: custom SVG > D3/visx

A `BezierEditor` 4 control point-tal, zoom+pan-nel ~430 sor kód, 0 új dependency. Alternatívák:

- **D3** (`d3-drag` + `d3-shape` + `d3-zoom`): ipari standard, de imperatív API — React-tel `useEffect`-tel + DOM manipulationnel kell wrap-elni. Bundle ~30KB gzip. Overkill 4 pontra.
- **visx** (`@visx/curve` + `@visx/drag` + `@visx/zoom`): React-natív, deklaratív D3-wrap. Bundle ~15KB gzip per modul. Jó alternatíva ha sok más chart is jön a projektbe.
- **Konva / react-konva**: Canvas-alapú, excellent performance 100+ interaktív elemre. Bundle ~70KB. Túl nagy ehhez a use-case-hez.

A custom SVG + Pointer Events minta a projekt méreténél (4 pont, 2 chart) optimális. Pattern: state data-space-ben (`{x, y}`), pixel-koordinátákat minden render-en újraszámol, `getScreenCTM().inverse()` a screen→viewBox átalakításhoz. Lásd `BezierEditor.tsx`-et.

### Custom expand state vs shadcn Accordion

A shadcn Accordion `details/summary` szemantikára épül, ami **nem fér** egy table row-ba. A Material page-en saját `useState<string | null>(initialId)` + conditional render egy második `<tr>`-rel sokkal egyszerűbb és teljes vezérlést ad (aria-controls, csak egy nyitva, animation később ha kell).

### Custom `Select` dropdown vs shadcn select / dropdown-menu

A shadcn `select` (Radix Select) komponens megbízható, de:
- A trigger stílus nem egyezik 1:1-ben a Figma-val (chevron pozíció, border-radius)
- A popover content-en nem mindig könnyű felülírni a Radix CSS-jét
- Extra dependency

A `MaterialNew` és `NewGeometryModal` saját custom `Select` komponenst használ. ESC close, click-outside close, `aria-haspopup="listbox"`, `<li role="option">` szemantika. ~70 sor + teljes vezérlés. **Ha sok helyen kell**, érdemes közös komponensbe extrahálni `src/components/ui/select.tsx`-be.

### Mock data külön `src/data/` mappában

`src/data/materials.ts`, `geometries.ts`, `materialFormFields.ts` típusos export-ok. Mikor API-ra váltunk, csak ezeket cseréljük le (vagy fetch-elünk + ugyanazt a típust visszaadunk). A page komponensek nem fognak változni.

A `materialFormFields.ts` egy data-driven approach példája: ~40 mező + helper text egy `FormSection[]` struktúrában, a `PropertyFormTab` ezt rendereli ki egységesen. Új mezők hozzáadása csak data-szerkesztés.

### Z-index hierarchia overlay layout-ban

Geometry edit overlay-réteg sorrendje (lentről felfelé):
- canvas (z-auto)
- render toggle, gizmó (z-20)
- properties panel, sub-toolbar (z-30)
- MainNav (z-50, sticky)

**A panel z-30** akkor fontos, ha **vízszintesen átfed** a render toggle-val. A Profile distribution tab-on a panel 924px wide és a render toggle a viewport közepén — egy ~1500px viewport-on biztosan átfednek. A 280px-es panelek nem fednek át (a render toggle 700px+ left-tel kezdődik). Mindkét esetben z-30 a panel megoldja az átfedéseket.

A sub-toolbar és panel nem fednek vertikálisan (`top-0 + h-52` toolbar vs `top-[52px]` panel = perfectly adjacent), tehát ott a z-index nem számít.

### Full-bleed canvas: transparent sub-toolbar overlay

A `GeometryEdit` mintája — a 3D canvas a teljes `<main>`-t kitölti, és a sub-toolbar `absolute top-0` rajta van, transparent háttérrel. Csak az interaktív pill / gomb elemek tartanak saját `bg-...../95 + backdrop-blur-sm` hátteret olvashatóság miatt. A cím `pointer-events-none` — kattintás átengedve a canvas-nak (OrbitControls).

Ez a pattern erősebb mint egy hagyományos sidebar layout (`flex-row aside + main`), mert:
- A 3D scene tényleg fullscreen, nem szűkül egy panellel
- A panel "rá van lógatva" → vizuálisan depth perception, modern UX
- Resize-kor a canvas magától növekszik (ResizeObserver), nem törik a layout

### Symmetrikus spacing sub-toolbar körül

A `h-[52px]` sub-toolbarban a tab pill `items-center` → 8px padding top + bottom (52 - 36 = 16, /2 = 8). Ha a sub-toolbar **alatti** elemek `top-[52px]`-en vannak, az pontosan a sub-toolbar alja → szintén 8px gap a tab pill alja és a card teteje között. **Ugyanaz a vizuális ritmus** mint a sub-toolbar felett.

Ha 4px gap-et kértem volna, `top-[48px]`. Ha 16px-et: `top-[60px]`.

---

## Kis dolgok ami időt megspóroltak

- A Figma `get_variable_defs` minden hexért + spacingért egyszerre — egy hívás, sok token. Mindig kérd le.
- A `get_metadata` mutatja a frame hierarchiát — *innen tudod*, mi a frame X/Y/W/H. Mielőtt írnál egy `gap-[60px]`-et, számold ki a metadata-ból.
- Vite HMR megőrzi a React state-et default-ban. Ha az expand state-ben furcsaság van, hard reload (`window.location.reload()`) segít.
- A Geist font CDN-ről jön (lásd `index.html`). Ha új Tailwind utility kell hozzá (`font-medium`, `font-semibold`, stb.), nem kell semmit hozzáadni — alapból megy.
- A Three.js scene a `useEffect(() => {...}, [])` empty deps-ben épül fel. Material/edge color változás `useRef`-fel megy re-mount nélkül. Lásd `BackgroundScene.tsx` és `BladeScene.tsx`.
- A `BoxGeometry(W, H, D, segW, segH, segD)` segment-jeit lehet per-vertex módosítani: `geo.attributes.position.setY(i, ...)` + `geo.computeVertexNormals()`. Így könnyű tapered szárny-szerű alakzatokat építeni placeholderként, valódi B-Rep nélkül.
