# F24 Design System

A design rendszer dokumentációja a kódhoz. Forrás: **Figma "Econ engineering — F24"** ([fájl link](https://www.figma.com/design/FHJ15Anm8hVwe0mJAoTRr8/Econ-engineering---F24)).

A page implementációk Figma frame ID-i a megfelelő szekcióknál.

---

## Design tokenek

Forrás: `mcp__Figma__get_variable_defs`. A kódban inline Tailwind utility-k formájában tartjuk (`text-[#0a0a0a]`, `rounded-[14px]`, stb.) — szándékosan **nem absztrakcióval CSS variable-ön keresztül**, mert a Figma változó nevek és a Tailwind theme nem mindig egyeznek 1:1-ben, és a pixel-pontos illesztéshez hex literálok megbízhatóbbak.

### Színek

| Token | Hex | Használat |
|---|---|---|
| `base/foreground` | `#0a0a0a` | Elsődleges szöveg |
| `base/muted-foreground` | `#6b7280` | Másodlagos / placeholder szöveg / helper text |
| `base/primary` | `#006496` | Primary gomb háttér ("New material", "New geometry", "Create") |
| `base/primary-foreground` | `#fafafa` | Primary gomb szöveg |
| `base/accent` | `#eef9ff` | Aktív nav item háttér, aktív tab/sidebar item |
| `base/accent-foreground` | `#171717` | Aktív item szöveg |
| `base/border` | `#e5e7eb` | Card / input keret |
| `base/input` | `#e2e8f0` | Form input keret |
| `base/muted` | `#f3f4f6` | Tabs konténer háttér |
| `base/secondary` | `#f1f5f9` | "Exit edit mode" gomb háttér, hover-state-ek |
| `tailwind colors/slate/50` | `#f8fafc` | App background |
| `tailwind colors/Econ blue/600` | `#007dbb` | Link szöveg ("Issue 05.2024") |
| `Schemes/On Surface` | `#181c20` | Heading szöveg ("Materials", "Add new") |
| `destructive` | `#dc2626` | Required asterisk (`*`) form mezők mellett |

**Brand gradient** (a gradient bar a nav teteján):
- `from-[#fc0]` (sárga) → `via-[#72b84c]` 50%-on (zöld) → `to-[#007dbb]` (Econ kék)

### Spacing

A Figma a Tailwind default spacing scale-t használja (`spacing/1` = 4px, `spacing/2` = 8px, `spacing/4` = 16px, `spacing/6` = 24px). Komponens-szintű kivételek:
- Card padding: **`p-6`** (24px)
- Section gap a Home-on: **`gap-[60px]`**
- Page horizontal padding: **`px-4 sm:px-8 lg:px-16`** + `max-w-[1400px] mx-auto` (nem fix `xl:px-[260px]` — lásd `lessons.md`)
- Sub-toolbar magasság: **`h-[52px]`**, MainNav alatti pozíció: **`top-[69px]`** (13px gradient + 56px nav)

### Typography

Font: **Geist** (CDN, `index.html`-ben betöltve).

| Token | Size | Line-height | Weight |
|---|---|---|---|
| `text-xl bold` | 20px | 28px | 700 (heading: Materials, Add new, szekciócímek) |
| `text-lg semibold` | 18px | 28px | 600 (sub-toolbar cím) |
| `text-base semibold` | 16px | 16px (none) | 600 (card titles: Geometry, Composition) |
| `text-sm medium` | 14px | 20px | 500 (nav items, table headers, labels) |
| `text-sm normal` | 14px | 20px | 400 (table cells, descriptions) |
| `text-sm semibold` | 14px | 20px | 600 (detail panel values) |
| `text-xs medium` | 12px | 16px | 500 (Exit edit mode gomb, render toggle pill) |

### Border radius

- `rounded` / `rounded-md`: 8px (gombok, input, kis card)
- `rounded-[10px]`: tabs konténer
- `rounded-[14px]` (Figma `rounded-xl`): card konténerek

### Shadows

- `shadow/xs` (`shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]`): gombok, input, kis akciók
- `shadow/sm` (`shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]`): card-ok
- Floating overlay (modal, panel canvas felett): `shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]` + `backdrop-blur-sm`

---

## Layout konvenciók

### Standard page (list / dashboard)

Minden routed page maga rendereli ki a navigációt és a footert:

```
<div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
  <MainNav />          {/* sticky, gradient + nav */}
  <main className="flex-1 px-4 sm:px-8 lg:px-16 py-6">
    <div className="mx-auto w-full max-w-[1400px]">
      {/* page content */}
    </div>
  </main>
  <Footer />
</div>
```

### Edit page sub-toolbar layout-tal

Material edit (`/material/new`), Geometry edit (`/geometry/:id`) — sub-toolbar van a MainNav alatt:

```
<div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
  <MainNav />
  <div className="sticky top-[69px] z-40 h-[52px] ...">
    {/* tabs + center title + Exit edit mode */}
  </div>
  <main>...</main>
  <Footer />  {/* opcionális — Geometry edit-en nincs */}
</div>
```

### Full-bleed 3D canvas + floating overlays (Geometry edit)

A `<main>` `relative overflow-hidden`, a canvas `absolute inset-0`, minden UI overlay z-index-szel felette:

```
<main className="relative flex-1 overflow-hidden">
  <BladeScene wireframe={...} />  {/* canvas alapként */}

  <div className="absolute inset-x-0 top-0 z-30 h-[52px]">  {/* sub-toolbar transparent */}
    <div className="absolute inset-y-0 left-4">{tabs}</div>
    <h1 className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">{title}</h1>
    <div className="absolute inset-y-0 right-4">{exitButton}</div>
  </div>

  <aside className="absolute left-4 top-[52px] z-20 w-[280px]">{propertiesPanel}</aside>
  <div className="absolute left-1/2 -translate-x-1/2 top-[52px] z-20">{renderToggle}</div>
  <div className="absolute bottom-4 left-4 z-20 pointer-events-none">{gizmo}</div>
</main>
```

A `Layout` komponens (`src/components/Layout.tsx`) szándékosan üres passthrough — történelmileg ott volt a hardcoded header.

**Kivételek**: `pages/Nurbs.tsx` fullscreen, nincs nav és footer. `GeometryEdit.tsx` és `Composition.tsx` nincs footer (edit mode).

---

## Komponens katalógus

### `MainNav` (`src/components/MainNav.tsx`)

A teljes app nav komponense. Magában foglalja a gradient bar-t (13px) + nav bar-t (56px).

- **Sticky** (`position: sticky; top: 0; z-index: 50`) — minden hosszú page-en (Material táblázat scroll-jakor, hosszú Home grid scroll-jakor) látható marad
- **Active indicator**: `useLocation()` + `isActivePath()` segédfüggvény. Az aktív item `bg-[#eef9ff]` + `aria-current="page"`
- **Nav itemek** (`NAV_ITEMS` exportált konstans): Home, Material, Geometry, Layup, Composition, Load group, Calculation, Report
- **Jobb oldal**: Settings ikon link (`/settings`, ugyanaz az active stílus) + User ikon (placeholder, még nincs handler)

### `Footer` (`src/components/Footer.tsx`)

eCon Engineering branding lábléc.

- SVG logo placeholder (sárga/kék háromszög) — ha hivatalos PNG/SVG asset érkezik, az `<svg>` blokk lecserélhető `<img src="...">`-re
- Verzió + copyright szöveg 3 sorban
- **Nem sticky** — a content alján természetesen jelenik meg

### `PagePlaceholder` (`src/components/PagePlaceholder.tsx`)

Stub layout azokhoz az aloldalakhoz, amik még nincsenek implementálva (Layup, LoadGroup, Calculation, Report, Settings).

Centered "Title" + "Coming soon" felirat, közte a sticky MainNav, alul Footer.

### `PropertyFormTab` (`src/components/PropertyFormTab.tsx`)

Sidebar + form body kombináció hosszú beállítás-listákhoz (Material Mechanical / Fatigue tab-ok).

- Props: `sections: FormSection[]`, `values: Record<string,string>`, `onChange`, `optionalAfterIndex`
- Bal sidebar (256px): szekció navigátor, sticky `top-[100px]`, scroll-spy aktív állapot frissítéssel
- Jobb body: szekciónként cím + `(optional)` suffix + FieldRow lista
- FieldRow: label (Geist 14px, required: piros `*`) + input (424px h-9) + helper text mellette (424px width)
- "Jump to section" smooth scroll a sidebar click-jén (100px offset a sticky toolbar alatt)
- A `FormSection[]` definíció `src/data/materialFormFields.ts`-ben: `MECHANICAL_SECTIONS` (6 szekció / 40 mező), `FATIGUE_SECTIONS` (4 szekció / 12 mező)

### `NewGeometryModal` (`src/components/NewGeometryModal.tsx`)

Custom modal a "Project configuration" dialog-hoz.

- Props: `open`, `onClose`, `onCreate({bladeType, manufacturingTechnology, name, description})`
- Overlay (`fixed inset-0 bg-black/40`), click-outside close, ESC close, body scroll lock
- Mezők: Blade type (`Select`), Manufacturing technology (`Select`, default "To be determined"), Name (`Input`), Description (`Textarea`)
- Create gomb disabled amíg Blade type + Name nincs kitöltve
- Belső `Select` komponens — custom dropdown (lásd Pattern-ek lent)

### `GeometryCard` (`src/components/GeometryCard.tsx`)

Geometry kártya, használja:
- A `Geometry` list page grid view-ja
- A `CompositionNew` "Geometry" sub-tab geometry-pickere

Cím (14px semibold) + `BladeThumbnail` (aspect-2/1) + dátum. `selected` prop esetén kék `border-[#006496]` + 30% opacity ring → a CompositionNew picker használja az aktív választás highlight-jára.

### `LayupPickerDialog` (`src/components/LayupPickerDialog.tsx`)

Modal-szerű layup picker — a `CompositionNew` Layup mapping során a "Select" gombra kattintva nyílik meg.

- `fixed inset-0 z-50 bg-black/40` overlay, click-outside + ESC bezárás, body scroll lock
- Header "Layups" + close X
- Search input (autofocus, query reset open-re)
- Scrollable table (sticky thead): Name (sortable) | Description | Last updated (sortable) | "Select" gomb per sor (primary kék)
- `currentLayupId` highlight (`bg-[#eef9ff]` az éppen kiválasztott sornál)
- Pagination

### `LayupMappingBezierDialog` (`src/components/LayupMappingBezierDialog.tsx`)

Bezier modal a layup mapping per-row "Open bezier view" gombra.

- Title: dinamikus `"Upper side / mappingName"` vagy `"Lower side / mappingName"`
- Undo/Redo gombok (placeholder handler-ekkel)
- `BezierEditor` `xMin=5 / xMax=55 / xStep=5`, `yMin=-14 / yMax=0 / yStep=2` (longitudinal vs transversal m)
- 2 oszlopos layout: bal chart, jobb tábla (Index | Longitudinal (m) | Transversal (m) | Delete)
- 2-irányú sync az `editingValues` buffer pattern-rel
- Sor delete: min 2 control point marad (cubic-szerű alacsony fokszámú görbéhez kell)

### `LayupBuilder` + `PlyStackViz` (`src/components/LayupBuilder.tsx`, `PlyStackViz.tsx`)

A LayupNew "Layup building" tab tartalma. Két oldalt: bal egy ply-tábla, jobb egy izometrikus SVG ply-stack.

**`LayupBuilder`** — 812px wide table:
- 7 oszlop: drag handle (GripVertical ikon) | color swatch (16×16 rounded) | Name (input) | Material (input) | Thickness (mm, number input) | Orientation (deg, number input) | Delete (kuka)
- "Add layer" + gomb fent (primary kék 36×36)
- "Unified visualization" checkbox alul
- **HTML5 native drag-and-drop**: `draggable={true}` minden `<tr>`-en, `onDragStart` → `setData('text/plain', String(idx))`, `onDragOver` → preventDefault + drop target highlight, `onDrop` → tömb átrendezés `splice` + `splice`, `onDragEnd` → state cleanup
- Drag állapot vizualizáció: drag source `opacity: 0.4`, drop target `bg-[#eef9ff]`
- Color automatikusan szinkronizálódik az orientation-nel a `defaultColorForOrientation()` mapping szerint: 0°→`#0066cc` (kék), 45°→`#22c55e` (zöld), 90°→`#f59e0b` (sárga). Manually felülbírálható a state-ben

**`PlyStackViz`** — 440px max-w, izometrikus SVG:
- Minden ply 45°-os rhombus (parallelogramma) — top/right/bottom/left csúcsokkal
- Y-offset `Y_STEP = 60px` minden ply között — egymás alatt sztack-elve
- Fiber lines: orientation → screen angle mapping (0°→30°, 45°→90°, 90°→150°), ~14px szakaszközzel, clipPath-szal a rhombus alakzatra levágva
- Fill: ply.color 18% opacity, stroke: ply.color 2.5px

**Mindkét fél ugyanazt a `plies: Ply[]` arrayt használja** → sorrend és szín konzisztens marad automatikusan. Reorder a táblában → a viz azonnal frissíti a stack-et.

Figma: `600:24328`

### `BezierEditor` (`src/components/BezierEditor.tsx`)

Interaktív cubic Bézier görbe szerkesztő, 4 control point-tal, dragelhető pontokkal és viewBox-based zoom+pan-nel.

- **State data space-ben**: `points: { x: 0..1, y: yMin..yMax }[]`. Pixel-koordinátákat minden render-en újraszámol — resize / zoom = no-op a state-re.
- **Pointer Events** + `setPointerCapture` → unified mouse + touch + pen drag. `touch-action: none` a draggable elemeken, hogy mobil böngészők ne scrolloljanak drag közben.
- **Two-way sync**: a parent owns a `points` state-et, `onChange` callback-kel. Ugyanaz az array renderelődik a chart-on és a táblázatban (lásd `ProfileDistributionPanel`, `StackingPanel`).
- **Constraints**: P0.x és P_last.x fix; közbenső pontok monoton x-ben (`points[idx-1].x + 0.001 ≤ x ≤ points[idx+1].x - 0.001`).
- **Zoom**: viewBox alapú. `+`/`-` gombok (center pivot), scroll-wheel zoom (cursor pivot), pan drag a background `<rect>`-en (csak `zoom > 1` esetén), dupla klikk reset. `vectorEffect="non-scaling-stroke"` minden stroke-on → vonalvastagság változatlan zoom-ban.
- **`yMin` / `yMax` props** (default 0 / 24): negatív Y range is támogatott (pl. Stacking tab Sweep: `-0.3..0.3`).
- **`xMin` / `xMax` / `xStep` props** (default 0 / 1 / 0.1): a layup mapping bezier `5..55 m / step 5`-ben dolgozik. Az x-monoton constraint epsilon scale-aware: `(xMax - xMin) * 0.001`.
- **`yStep` / `xStep` driven label formatting**: `v.toFixed(decimals)` ahol `decimals = -log10(step)` → integer ha `step >= 1`, különben annyi decimális ahány a step pontossága.
- **`previousPoints`** prop (read-only): vékony zöld referencia görbe.
- **`rootX`** prop: narancs root indicator (vertikális vonal a chart-on a root pozíciónál).

Bundle cost: 0 (csak React + Pointer Events). Skálázáshoz lásd `lessons.md`-t.

### `ProfilesPanel` + `ProfileDetailPopover` (`src/components/ProfilesPanel.tsx`)

A Geometry edit "Profiles" tab tartalma. 404px wide panel: kis tábla (Profile name | Position) 6 sorral + "Add new profile" gomb. Sor click → highlight + kuka ikon megjelenik a jobb oldalán + popover nyit.

`ProfileDetailPopover` — floating dialog `fixed left-1/2 top-1/2 z-40 w-[791px]`. Nincs overlay (clickelhető háttér), ESC bezárja. Form mezők: Name, Position (relative radius), Type custom `Select`, Maximum camber (%), Max camber position, Thickness (TMC) (%) + 2D airfoil preview SVG a jobb oldalon.

Az `AirfoilPreview` komponens NACA 4-digit airfoil parametric equations alapján rendereli a kontúrt (cosine-spaced 50 pont, upper + lower surface, kék 2px stroke). A `maxCamber`, `maxCamberPosition`, `thickness` paraméterek %-ban változnak.

Figma: `596:19631` (panel), `596:19710` (opened profile)

### `StackingPanel` (`src/components/StackingPanel.tsx`)

A Geometry edit "Stacking" tab tartalma. 516px wide, scroll-olható panel (max-h, overflow-y-auto), accordion 2 szekcióval: **Sweep** + **Dihedral**. Mindkettő bezier editor (Y range `-0.3..0.3`, step `0.1`) + table két irányú sync-kel.

Top: Undo/Redo gombok. Section accordion ugyanazt a stílust követi mint a Profile distribution folded mode (lásd Accordion card style pattern).

Figma: `596:20399`

### `ProfileDistributionPanel` (`src/components/ProfileDistributionPanel.tsx`)

A Geometry edit "Profile distribution" tab panel-tartalma. 924px wide (a többi tab 280px-es panelhez képest).

- **Top row** grid: Type custom Select (NACA 4 digit / 5 digit / Custom airfoil), Start position, End position, Profile count input-ok, "Fold profiles" gomb (primary kék, `FoldHorizontal` ikon)
- **Sub-tabs**: Maximum camber / Maximum camber position / Thickness (TMC) — shadcn Tabs minta
- **Undo / Redo** outline gombok (`Undo2`, `Redo2` ikonok)
- **2 oszlopos grid** (lg+): bal `Distribution view` switch + `BezierChartPlaceholder` SVG, jobb `Table` switch + 3-oszlopos táblázat (Index / Relative radius / Max Cam %)
- **Belső komponensek**: `Select`, `Switch`, `BezierChartPlaceholder`

`Switch` — custom toggle, `role="switch"` + `aria-checked`. Track 36×20px (`bg-[#006496]` on, `#cbd5e1` off), thumb `absolute left-[2px] top-[2px] h-4 w-4` + `translate-x-4` (on) / `translate-x-0` (off). **NEM** dinamikus `translate-x-[18px]`-szel — az gyakran "kilóg" mert a `top-2` és `translate` keveredik. Helyette explicit `left-[2px]` rögzített pozíció + `translate-x-4` (16px) → kerek, megbízható pozicionálás.

`BezierChartPlaceholder` — inline SVG, hardcoded path-okkal és control point-okkal. Pixel-pontosan a Figma referencia alapján. **Cserélendő** valódi interaktív görbe-szerkesztőre később (D3 / visx / custom canvas). Most read-only minta.

Figma: `596:19816`

### `BladeScene` (`src/components/BladeScene.tsx`)

Three.js 3D scene a Geometry edit page-en. Tapered blade placeholder a `BoxGeometry(12, 0.6, 2)` per-vertex skálázott vertikálisain.

- Gradient háttér (`#f1f5f9` → `#f8fafc` → `#e2e8f0`)
- OrbitControls (rotate, zoom, pan; min 4 / max 40 distance; damping 0.06)
- Ambient + key (cast shadow) + fill light
- GridHelper a "földön" (40×40), ShadowMaterial árnyékfogadó
- `wireframe` prop: material opacity + edge szín váltás useEffect-tel, re-render nélkül
- ResizeObserver a parent méretváltozásokra
- Cleanup: dispose all geometries/materials, removeEventListener, cancelAnimationFrame

Helyettesíthető valódi B-Rep blade-del amikor az OpenCascade pipeline kész.

### `BladeThumbnail` (`src/components/BladeThumbnail.tsx`)

SVG placeholder szárny thumbnail a Geometry grid card-okhoz. Egyszerű elnyúlt path + section guideline-ok.

### Home page komponensek (`src/pages/Home.tsx`)

| Komponens | Méret | Leírás |
|---|---|---|
| `AddNewCard` | 150px magas | Title (16px semibold) + leírás (14px muted) + primary kék gomb |
| `RecentItem` | 64px magas | Név (14px medium) + chevron-right gomb (h-9 w-9) |
| `NewsCard` | 170px magas | Title + 2-soros leírás + "Read more" outline gomb |

Layout: 3 szekció `gap-[60px]` távolsággal.
- "Add new" — 3 oszlop grid (`md:grid-cols-3`)
- "Recently edited" — 2 oszlop grid (`lg:grid-cols-2`), 3 sor
- "What's new in F24?" — 3 oszlop grid

Figma: frame `576:19645`. **Add new "New geometry" gomb** → `/geometry?new=1` (modal auto-nyitás).

### Material page komponensek (`src/pages/Material.tsx`)

| Komponens | Leírás |
|---|---|
| `SortableHeader` | Oszlopfejléc gomb. Ikon: `ArrowUpDown` (inactive), `ArrowDown` (desc active), `ChevronUp` (asc active) |
| `MaterialRow` | Sor + opcionális expanded detail panel (`<tr>` colSpan=5 a chevron alatti tartalom) |
| `MaterialDetailGrid` | 5 sor kulcs-érték (Reinforcement, Matrix, Modulus, Density, TDS Ref) |
| `Pagination` | Previous / page-számok / Next, aria-current az aktívra, disabled határoknál |
| `DetailRow` | Egy label/value pár az expanded panelban |

**Adat** (`src/data/materials.ts`): `Material[]` típusos mock array.

**State**: `expandedId` (string | null, csak egy nyitva), `query`, `sort {key, direction}`, `page`.

Figma frames: `576:19313` (zárt), `584:15263` (nyitott Envalior 101-gyel)

### `MaterialNew` (`src/pages/MaterialNew.tsx`)

Material létrehozása 3 tab-bal: General, Mechanical properties, Fatigue properties.

- **General tab**: Name input, Type custom Select (8 ply opció), Description textarea — 468px wide card a bal felső sarokban
- **Mechanical / Fatigue tab**: `PropertyFormTab` komponens, `MECHANICAL_SECTIONS` / `FATIGUE_SECTIONS` data-driven
- Sub-toolbar (sticky `top-[69px]`): Tabs pill, dinamikus cím ("New material" General-on, a Name értéke a többi tab-on), "Exit edit mode" gomb (`/material`-ra navigál)
- Belső `Select` komponens — custom dropdown

Figma frames: `584:15600` (General), `596:2160` (Mechanical), `584:15789` (Fatigue)

### Geometry page komponensek (`src/pages/Geometry.tsx`)

| Komponens | Leírás |
|---|---|
| `SortableHeader` | (ugyanaz mint Material) |
| `Pagination` | (ugyanaz mint Material) — Figma szerint csak list view-n |
| `GeometryCard` | Grid view kártya: cím (14px semibold) + BladeThumbnail (aspect-2/1) + dátum |

- List/Grid view toggle (jobb felül): `ListIcon` és `LayoutGrid` ikonok, `aria-pressed`
- Sor / kártya click → `navigate('/geometry/:id')`
- "New geometry" gomb → `NewGeometryModal` open
- Query param `?new=1` → modal auto-open (Home dashboard-ról jövő flow)
- `useEffect`: a query-param auto-open után `navigate('/geometry', { replace: true })` — hogy a vissza-navigálás ne nyissa újra

Figma: `600:22786` (list), `600:22858` (grid)

### `GeometryEdit` (`src/pages/GeometryEdit.tsx`)

Full-bleed 3D canvas + floating overlays. 5 tab: Global properties, Profile distribution, Profiles, Stacking, 3D view.

- `BladeScene` `absolute inset-0` (canvas háttér)
- Sub-toolbar `absolute inset-x-0 top-0 z-30 h-[52px]` — **transparent háttér** (canvas látszik mögötte)
  - Bal: Tabs pill (`bg-[#f3f4f6]/95 backdrop-blur-sm`)
  - **Közép**: `<h1>` cím `absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2` — viewport-szélesség közepén, függetlenül a bal/jobb elemek szélességétől, `pointer-events-none`
  - Jobb: Exit edit mode link (`bg-[#f1f5f9]/95 backdrop-blur-sm`)
- Properties panel `absolute left-4 top-[52px] z-30` — floating overlay, `bg-white/95 backdrop-blur-sm`. **Width tab-függő**: `w-[280px]` a legtöbb tab-on, `w-[924px] max-w-[calc(100vw-2rem)]` a Profile distribution tab-on. **z-30**: a render toggle (z-20) felett van, ha vízszintesen átfednek (a Profile distribution panel a viewport közepén túlnyúlik a render toggle alá)
- Render toggle (Solid/Wireframe) `absolute left-1/2 -translate-x-1/2 top-[52px] z-20`
- `CoordinateGizmo` SVG (lásd lent) `absolute bottom-4 left-4 z-20 pointer-events-none`

**Z-index hierarchia** (Geometry edit):
- 50: MainNav (sticky a page tetején)
- 30: sub-toolbar overlay, properties panel
- 20: render toggle, gizmó
- 0: canvas (alap)

A panel és sub-toolbar nem fednek át vertikálisan (`top-[52px]` panel vs `top-0 + h-[52px]` toolbar = perfectly adjacent). A panel és render toggle viszont **igen** átfedhetnek vízszintesen (Profile distribution-on), ezért panel z-30 > toggle z-20.

**Vertikális spacing**: a tab pill `items-center` a 52px-es sub-toolbarban → 8px padding top + bottom. A panel és toggle `top-[52px]` → tab pill alja és card teteje között szintén 8px. **Szimmetrikus 8-8px gap**.

Figma: `596:22661`

`CoordinateGizmo` — inline SVG komponens X (piros), Y (kék), Z (zöld) tengelyekkel, nyilakkal.

---

## Pattern-ek

### Sticky navigáció

A `MainNav` `<div className="sticky top-0 z-50">`-be van csomagolva. Bármely page használja, a header marad helyén scroll alatt.

Fontos: a parent flexbox-nak NEM lehet `overflow:hidden`, különben a sticky nem működik. A `bg-[#f8fafc]` page wrapper-en flex-col van, ez OK.

### Sticky sub-toolbar (3-szegmens absolute layout)

Edit page-ek toolbar pattern-je (Material edit, Geometry edit). A `justify-between` flex NEM biztosítja, hogy a középső elem a viewport közepén legyen — csak a bal és jobb közötti tér közepén. **Ha a teljes viewport-szélesség közepén kell**, 3 absolute pozicionált elem:

```tsx
<div className="relative h-[52px]">
  <div className="absolute inset-y-0 left-4 flex items-center">{leftContent}</div>
  <h1 className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
    {title}
  </h1>
  <div className="absolute inset-y-0 right-4 flex items-center">{rightContent}</div>
</div>
```

A `pointer-events-none` a címen biztosítja, hogy a click a canvas-ra eljut (Geometry edit OrbitControls-hoz).

### Floating overlay panel canvas felett

Geometry edit pattern. A panel `bg-white/95 backdrop-blur-sm` — majdnem átlátszatlan, de a canvas színe érződik mögötte (depth perception). A shadow erősebb: `shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]`.

### Three.js scene re-render kerülése

A `wireframe` toggle nem rebuildeli a teljes scene-t. A material és edge line `useRef`-ben van, és a prop-change `useEffect` csak az `opacity` / `color` értéket frissíti.

A scene initialization egyetlen `useEffect(() => {...}, [])` blokkban — empty deps, hogy ne re-create-elődjön. ESLint warning: `// eslint-disable-next-line react-hooks/exhaustive-deps`.

### Expandable table rows

Nem shadcn Accordion (lásd `lessons.md`). Egyszerű `useState<string | null>(initialId)` + conditional render egy második `<tr>`-rel.

```tsx
{expanded && (
  <tr id={`${prefix}-${item.id}`} className="...">
    <td className="w-[52px]" />
    <td colSpan={5} className="px-3 pb-5 pt-1">
      <DetailComponent {...item.details} />
    </td>
  </tr>
)}
```

- `aria-expanded` a chevron button-on
- `aria-controls` az ID-re mutat
- Csak egy nyitva egyszerre (`expandedId === id ? null : id`)

### Custom Select (dropdown) komponens

Sem shadcn select, sem dropdown-menu — minden helyen ahol `<select>` kéne, inline custom button + lebegő `<ul role="listbox">`. Előnyök:
- Pixel-pontos illeszkedés a Figma-hoz
- Nincs új dependency
- ESC close, click-outside close, hover/active stílusok

Most több helyen használjuk:
- `MaterialNew` (Type)
- `NewGeometryModal` (Blade type, Manufacturing technology)
- `ProfileDistributionPanel` (Type — NACA 4/5/Custom)
- `ProfilesPanel` (Type a popover form-ban)

**Dropdown overlay overflow**: `min-w-full whitespace-nowrap` az `<ul>`-en → ha a leghosszabb opció hosszabb mint a trigger, jobbra túlnyúlik. Folded mode-ban a Type oszlop csak 160px wide, de a "Custom airfoil" opció befér.

Ha egységes komponensbe extraktálni szeretnéd, `src/components/ui/select.tsx` jó hely (4+ helyen ismétlődik már).

### Modal pattern

`NewGeometryModal` minta:
- `fixed inset-0 z-50 bg-black/40` overlay
- `role="dialog" aria-modal="true" aria-labelledby="..."`
- Body scroll lock (`document.body.style.overflow = 'hidden'`)
- ESC keylistener → `onClose()`
- Click overlay → `onClose()`, click form → `stopPropagation()` (nem terjed)

Ha sok modal kell, érdemes shadcn `dialog` primitivre váltani (`npx shadcn add dialog`), ami Radix-on alapul (a11y + focus trap).

### Hover-only row actions

A `CompositionNew` Layup mapping táblájában minden sor 4 actiont kínál (Drag handle, Duplicate, Open bezier, Delete) — de a táblázat scan-elhetősége érdekében ezek **csak hover-en jelennek meg**. Pattern:

```tsx
<tr className="group">
  <td>
    {/* Drag handle */}
    <span className="opacity-0 transition-opacity group-hover:opacity-100">
      <GripVertical />
    </span>
  </td>
  {/* ... */}
  <td>
    {/* Action button cluster */}
    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button>Duplicate</button>
      <button>Open</button>
      <button>Delete</button>
    </div>
  </td>
</tr>
```

A `group` osztály a `<tr>`-en, és a `group-hover:opacity-100` a gyerekeknek — Tailwind alap pattern. A drop slot átmenete (`bg-[#eef9ff]` aktív drop target-en) így nem zavarja a hover-only láthatóságot, mert ez egy másik prop.

### HTML5 native drag-and-drop reorder

`LayupBuilder` mintája. Egy `<tr draggable>` + handlerek:

```tsx
<tr
  draggable
  onDragStart={(e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    setDraggingIdx(idx);
  }}
  onDragOver={(e) => {
    e.preventDefault(); // CRITICAL — without this, drop won't fire
    e.dataTransfer.dropEffect = 'move';
    setDropOverIdx(idx);
  }}
  onDrop={(e) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    setList(arr => {
      const next = [...arr];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
  }}
  onDragEnd={() => { setDraggingIdx(null); setDropOverIdx(null); }}
>
```

Vizuális visszacsatolás: drag source `opacity-40`, drop target `bg-[#eef9ff]`.

**Mobile touch nem fires HTML5 DnD-t**. Ha touch support kell, swap-elhető `dnd-kit`-re (`@dnd-kit/core` + `@dnd-kit/sortable`) — modern, touch-friendly, accessible. Egyetlen 5 elemű kis listához most a HTML5 elég.

### Color-from-property mapping (pl. orientation → color)

`LayupBuilder` az orientation-ből származó default színt rendel a swatch-hoz és a viz-hez:

```ts
function defaultColorForOrientation(o: number): string {
  if (o <= 22.5) return '#0066cc';   // 0° kék
  if (o <= 67.5) return '#22c55e';   // 45° zöld
  if (o <= 112.5) return '#f59e0b';  // 90° sárga
  if (o <= 157.5) return '#22c55e';  // 135° zöld
  return '#0066cc';                  // 180° kék
}
```

Orientation változáskor a state-ben `color` mező automatikusan újra-eljárul:
```ts
if (key === 'orientation') {
  next.color = defaultColorForOrientation(value as number);
}
```

A táblázat color swatch + a `PlyStackViz` rhombus + fiber lines mind a `ply.color`-t használják → automatikus szinkron.

### Accordion card style (vertikális szekciólista)

A `ProfileDistributionPanel` folded mode-ban és a `StackingPanel`-ben azonos minta:

```tsx
<div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
  <button
    type="button"
    onClick={toggle}
    aria-expanded={open}
    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9fafb]"
  >
    <span className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">
      {label}
    </span>
    {open ? <ChevronUp .../> : <ChevronDown .../>}
  </button>
  {open && (
    <div className="border-t border-[#e5e7eb] p-4">{body}</div>
  )}
</div>
```

A wrapper külön bordered card → vizuálisan elválasztja a szekciókat anélkül hogy nagy `gap-6` kéne. Külső `gap-3` az item-ek közt.

### Two-way sync controlled input + editing buffer

A `ProfileDistributionPanel` táblázat-input-jai két irányba szinkronok a `BezierEditor`-rel: drag a chart-on → input frissül; gépelés az inputba → bezier görbe módosul.

**Anti-pattern**: `value={p.x.toFixed(4)}` minden render-en — a user által beírt `"0.5"` rögtön `"0.5000"`-ré formázódik, a cursor a végére ugrik, a következő karakter rossz helyre kerül.

**Helyes minta**: local `editingValues: Record<string,string>` buffer. Render value: `editingValues[key] ?? canonicalFormat(...)`. OnChange: lerakja a nyers stringet a buffer-be, és ha `Number.isFinite(parseFloat(raw))`, propagálja a parent state-be. OnBlur: törli a buffer entry-t → render visszaáll a canonical formátumra.

### viewBox-based zoom + pan SVG-ben

A `BezierEditor` viewBox-szal zoomol — a `<svg>` viewBox-ának szélessége `BASE / zoom`, a pan offset módosítja a top-left-et. Pan korlátozott `±centerOffset` range-re (a chart nem mehet ki a látható területről).

**Mellék előny**: a pointer-event drag math ugyanaz marad. A `svg.getScreenCTM().inverse()` automatikusan figyelembe veszi az új viewBox-ot — semmi manuális zoom-adjustment a control point drag handler-ben.

**`vectorEffect="non-scaling-stroke"`** minden vonalon és path-on → stroke-width változatlan marad zoom-ban (2.5px aktív görbe 8x zoomban is 2.5px).

**Wheel zoom focal point math**:
```js
const local = screenToViewBox(cursorX, cursorY);
const ratioX = (local.x - viewX) / viewW;
const nextViewX = local.x - ratioX * nextViewW;
```
A cursor data-koordinátáját a zoom előtt és után ugyanazon a screen pozíción tartjuk.

### Tab-függő panel width

A `GeometryEdit` aside-ja `width` tab szerint változik:

| Tab | Width |
|---|---|
| Global properties | 280px |
| Profile distribution (expanded) | 924px |
| Profile distribution (folded) | 516px |
| Profiles | 404px |
| Stacking | 516px |

Mindegyik `max-w-[calc(100vw-2rem)]`-mel kiegészítve a kisebb viewportra.

### Custom Switch toggle

A `ProfileDistributionPanel`-ben használt minta. `role="switch"` + `aria-checked` button, track 36×20, thumb 16×16 `absolute left-[2px] top-[2px]` rögzített pozícióval, `translate-x-4` (on) / `translate-x-0` (off) — 16px csúsztatás, ami pontosan a thumb szélességével egyezik. Track padding mindkét oldalon szimmetrikus 2px.

**Anti-pattern**: `translate-x-[18px]` (egyenlő 36 - 16 - 2-vel) **rendszerint kilóg**, mert a transform numerikus kalkulációja gyakran +/- 1-2px eltérést produkál a böngészők között. A `translate-x-4` Tailwind preset (`1rem` = 16px) megbízhatóbb.

### Tab-függő panel width

A `GeometryEdit` aside-ja `width` tab szerint változik:

```tsx
<aside className={`absolute left-4 top-[52px] z-30 ${
  activeTab === 'profile-distribution' ? 'w-[924px] max-w-[calc(100vw-2rem)]' : 'w-[280px]'
}`}>
```

A `max-w-[calc(100vw-2rem)]` garantálja, hogy a 924px-es panel ne lógjon ki kisebb viewporton (a `2rem` a `left-4 + right-4` padding-ra utal).

### Sortable headers

`SortableHeader` komponens fogadja a `sortKey` + `currentSort` state-et + `onClick` handlert. Az ikon a state alapján vált. Click toggle: első kattintás `asc`, második `desc`, ugyanazon másik oszlopra → reset `asc`-ra.

### Pagination

Mindig renderelődik (akkor is, ha `totalPages === 1`) — Figma-konzisztens. `Previous` / `Next` `disabled` állapotban kapja a határoknál. Sok oldal esetén ellipsis (`MoreHorizontal` ikon) megjelenik.

### Aktív route indikátor

```tsx
function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}
```

A `/` csak akkor match-el ha pontosan `/` — nem akarunk minden route-on aktív Home-ot. A `startsWith(itemPath + '/')` biztosítja, hogy `/material/new` is aktiválja a "Material" nav itemet.

### Scroll-spy + smooth scroll

`PropertyFormTab` mintája. `useEffect` scroll listener-rel:

```tsx
window.addEventListener('scroll', () => {
  const offsets = sections.map((s) => ({
    id: s.id,
    top: sectionRefs.current[s.id]?.getBoundingClientRect().top ?? Infinity,
  }));
  const aboveOrAt = offsets.filter((o) => o.top <= 200);
  setActive(aboveOrAt[aboveOrAt.length - 1]?.id ?? offsets[0].id);
}, { passive: true });
```

Click a sidebar item-en → `window.scrollTo({ top: targetY - 100, behavior: 'smooth' })`. A 100px offset a sticky toolbar magasságát kompenzálja.

---

## Routes

| Path | Komponens | Page típus |
|---|---|---|
| `/` | `Home` | Dashboard (3 szekció, Figma 576:19645) |
| `/material` | `Material` | Data table accordion-szerű soros expand-dal (Figma 576:19313) |
| `/material/new` | `MaterialNew` | 3-tab edit (Figma 584:15600 / 596:2160 / 584:15789) |
| `/geometry` | `Geometry` | List + grid view toggle (Figma 600:22786 / 600:22858) |
| `/geometry/:id` | `GeometryEdit` | Full-bleed Three.js + floating panel. Tabs: Global properties / Profile distribution / Profiles / Stacking / 3D view (Figma 596:22661 + 596:19816 + 596:19631 + 596:20399) |
| `/layup` | `Layup` | Layup list page (table) — Figma 600:23689 |
| `/layup/new` | `LayupNew` | New layup edit, 2 tabs (General + Layup building) — Figma 600:27124 + 600:24328 |
| `/composition` | `Composition` | Composition list page (table) — Figma 600:27699 |
| `/composition/new` | `CompositionNew` | New composition, 4 tabs (General + Geometry + Layup mapping + Transversal mapping) — Figma 600:27773 + 600:29097 + 600:28625 + 600:27811 |
| `/layup` | `Layup` | Stub |
| `/composition` | `Composition` | 3D editor (régi Home tartalma) |
| `/load-group` | `LoadGroup` | Stub |
| `/calculation` | `Calculation` | Stub |
| `/report` | `Report` | Stub |
| `/settings` | `Settings` | Stub (jobb felső ⚙ ikonról elérhető) |
| `/nurbs` | `Nurbs` | Fullscreen 3D NURBS editor (nav nélkül) |

---

## Hogyan adj hozzá új oldalt

### Standard list / dashboard page

1. **Figma frame megnyitása** Dev Mode-ban (jobb felső `</>` toggle), MCP server bekapcsolva a jobb sidebar-ban
2. `mcp__Figma__get_screenshot` + `get_metadata` + `get_variable_defs` a node ID-vel
3. `src/pages/NewPage.tsx` létrehozás:
   ```tsx
   import { MainNav } from '@/components/MainNav';
   import { Footer } from '@/components/Footer';

   export function NewPage() {
     return (
       <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
         <MainNav />
         <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
           <div className="mx-auto w-full max-w-[1400px]">
             {/* content */}
           </div>
         </main>
         <Footer />
       </div>
     );
   }
   ```
4. Route hozzáadása `src/App.tsx`-be
5. Ha új nav item is kell: add be `NAV_ITEMS`-be a `MainNav.tsx`-ben

### Edit page sub-toolbar-ral

Lásd `MaterialNew.tsx`-et (form-based) vagy `GeometryEdit.tsx`-et (canvas-based) mintaként. Sticky sub-toolbar `top-[69px]`, 3-szegmens layout (Tabs / cím / Exit).

### Full-bleed canvas page

Lásd `GeometryEdit.tsx`-et. Canvas `absolute inset-0`, minden UI overlay z-index-szel felette. Transparent sub-toolbar (`bg-transparent` a wrapper-en, csak az interaktív elemek tartanak saját `bg-...../95 + backdrop-blur-sm` hátteret).
