# F24 Frontend

3D geometria- és kompozit anyag tervező alkalmazás.

## Tech stack

- **Framework**: React 18 + TypeScript 5.9
- **Build**: Vite 7.3 (dev szerver port: 5124)
- **3D**: Three.js 0.182
- **B-Rep / NURBS**: OpenCascade.js (a `/nurbs` és `/composition` route-okon)
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS 3.4
- **Routing**: React Router DOM 7
- **Deploy**: Vercel (SPA rewrite `vercel.json`-ben)

## Parancsok

```bash
npm run dev      # Dev szerver (localhost:5124)
npm run build    # tsc + vite build
npm run preview  # Produkciós build előnézet
```

## Projekt struktúra

`src/components/` feature-mappákra bontva (nem lapos) — minden almappa egy route/domainhez tartozó komponenseket tartalmaz, `common/` a 2+ feature által ténylegesen megosztott darabokat:

```
src/
├── components/
│   ├── common/                  # 2+ feature-ben ténylegesen megosztott komponensek — egy fájl egy komponens elvén, alcsoportokba rendezve
│   │   ├── layout/              # Oldal-keret / chrome
│   │   │   ├── MainNav.tsx          # Fő navigáció — sticky, gradient bar + nav (NAV_ITEMS exportált)
│   │   │   ├── Footer.tsx           # eCon Engineering branding lábléc (SVG logo placeholder)
│   │   │   ├── Layout.tsx           # Passthrough wrapper — minden page maga rendereli MainNav+Footer
│   │   │   ├── PagePlaceholder.tsx  # Közös stub layout aloldalakhoz ("Coming soon")
│   │   │   └── ErrorBoundary.tsx    # Kritikus 3D/WASM részfák hibahatárolása
│   │   ├── list/                # Lista oldalak közös építőkockái
│   │   │   ├── SortableHeader.tsx   # Rendezhető <th> gomb + irány ikon
│   │   │   ├── Pagination.tsx       # Lapozó (belső pageWindow segédfüggvénnyel)
│   │   │   ├── FilterCheckbox.tsx   # Tri-state checkbox szűrő dropdownokhoz
│   │   │   └── Tip.tsx              # Hover tooltip wrapper sor-akció ikonokhoz
│   │   ├── viewer/               # 3D / bézier szerkesztő komponensek
│   │   │   ├── OccViewer.tsx        # OpenCascade.js IGES viewer — GeometryEdit + CompositionNew 3D háttere
│   │   │   ├── CoordinateGizmo.tsx  # XYZ tengely-indikátor overlay a 3D viewport felett
│   │   │   ├── RenderToggle.tsx     # Solid/wireframe render mode váltó overlay
│   │   │   ├── BezierEditor.tsx     # Interaktív cubic Bézier editor (drag + zoom + pan + yMin/yMax) — Geometry/Composition/LoadGroup megosztja
│   │   │   └── BezierZoomControls.tsx # BezierEditor zoom in/out gombpár
│   │   ├── card/                 # Grid-kártya komponensek
│   │   │   ├── GeometryCard.tsx     # Geometry kártya (Geometry grid + CompositionNew/CalculationNew picker)
│   │   │   ├── CardMenu.tsx         # Kártya jobb-felső "⋮" akció menü (Geometry/Composition kártyákon)
│   │   │   └── BladeThumbnail.tsx   # SVG szárny thumbnail — Geometry/Composition/Calculation kártyákon
│   │   ├── AirfoilPreview.tsx   # 2D NACA airfoil SVG — Geometry és Composition profil popoverekben (nem fér bele egyik alcsoportba sem, marad a common/ gyökerén)
│   │   └── BufferedNumberInput.tsx # Debounce-olt numerikus input — több feature form mezőjében (ua.)
│   ├── calculation/              # /calculation, /calculation/new
│   │   ├── CalculationRow.tsx, CalculationSubToolbar.tsx, TagSelect.tsx
│   │   └── CalculationGeneralTab.tsx, CalculationCompositionTab.tsx, CalculationConfigurationTab.tsx, CalculationLoadGroupTab.tsx, CalculationFatigueProfileTab.tsx
│   ├── load-group/               # /load-group, /load-group/new
│   │   ├── LoadGroupGeneralTab.tsx, LoadGroupLoadCasesTab.tsx, LoadGroupLimitsTab.tsx, LoadGroupFatigueProfilesTab.tsx
│   │   └── LoadCasePickerDialog.tsx, SelectInline.tsx
│   ├── composition/               # /composition, /composition/new
│   │   ├── CompositionCard.tsx, CompositionGeneralTab.tsx, CompositionGeometryTab.tsx
│   │   ├── TransversalMappingSection.tsx, SelectField.tsx, ProfileEditorPopover.tsx
│   │   ├── LayupMappingTable.tsx, LayupMappingBezierDialog.tsx, LayupMappingChart.tsx, LayupPickerDialog.tsx
│   │   └── CrossSectionDialog.tsx
│   ├── geometry/                  # /geometry/:id (GeometryEdit tabs)
│   │   ├── GeometryEditControls.tsx (Select/Tip/FormField)
│   │   ├── ProfileDistributionPanel.tsx (+Select/Switch), ProfilesPanel.tsx (+Select/ProfileDetailPopover/FormFields)
│   │   └── StackingPanel.tsx
│   ├── layup/                     # /layup/new — LayupBuilder tab (Layup lista maga a Layup.tsx page-ben marad)
│   │   ├── LayupBuilder.tsx, PlyStackViz.tsx
│   │   └── MaterialPickerDialog.tsx # egyedüli fogyasztója a LayupBuilder
│   ├── material/                   # /material, /material/new
│   │   ├── MaterialRow.tsx, MaterialDateFilterPopover.tsx
│   │   └── PropertyFormTab.tsx
│   ├── nurbs/                      # /nurbs
│   │   ├── NurbsViewer.tsx, LoftViewer.tsx
│   │   └── NurbsControls.tsx (ToggleBtn/StatBadge), ProfileEditor.tsx
│   └── ui/                         # shadcn/ui komponensek (badge, button, card, checkbox, input, label, slider, tabs, textarea) — VÁLTOZATLAN, nem kerül feature-mappába
├── pages/
│   ├── Home.tsx                 # / — Dashboard (Add new / Recently edited / What's new) — Figma 576:19645
│   ├── Material.tsx             # /material — Data table accordion-soros expand-dal — Figma 576:19313 / 584:15263
│   ├── MaterialNew.tsx          # /material/new — 3 tab: General / Mechanical / Fatigue — Figma 584:15600 / 596:2160 / 584:15789
│   ├── Geometry.tsx              # /geometry — List/Grid view toggle — Figma 600:22786 / 600:22858
│   ├── GeometryEdit.tsx         # /geometry/:id — Full-bleed OccViewer (IGES) + floating panel — Figma 596:22661
│   ├── Layup.tsx                # /layup — Layup data table list — Figma 600:23689
│   ├── LayupNew.tsx             # /layup/new — General + Layup building tabs — Figma 600:27124 / 600:24328
│   ├── Composition.tsx          # /composition — Composition list page (table) — Figma 600:27699
│   ├── CompositionNew.tsx       # /composition/new — General + Geometry + Layup mapping + Transversal mapping — Figma 600:27773 + 600:29097 + 600:28625 + 600:27811
│   ├── LoadGroup.tsx            # /load-group — Load group list page (table) — Figma 614:41830
│   ├── LoadGroupNew.tsx         # /load-group/new — General / Load cases / Limits / Fatigue profiles tabok
│   ├── Calculation.tsx          # /calculation — Calculation list page (timestamp + status badge) — Figma 614:45470
│   ├── CalculationNew.tsx       # /calculation/new — General / Composition / Configuration / Fatigue profile tabok
│   ├── Report.tsx               # /report — stub
│   ├── Settings.tsx             # /settings — stub (jobb felső ⚙ ikonról)
│   └── Nurbs.tsx                # /nurbs — teljes képernyős NURBS/Loft szerkesztő (nav nélkül)
├── data/
│   ├── materials.ts             # Material[] mock + típusok (cseréld API hívásra)
│   ├── materialFormFields.ts    # MECHANICAL_SECTIONS + FATIGUE_SECTIONS — PropertyFormTab data
│   ├── geometries.ts            # Geometry[] mock + típusok
│   ├── profiles.ts              # Profile[] mock + PROFILE_TYPES — Profiles tab data
│   ├── layups.ts                # Layup[] mock — Layup list page data
│   ├── compositions.ts          # Composition[] mock — Composition list page data
│   ├── loadGroups.ts            # LoadGroup[] mock — Load group list page data
│   ├── loadGroupForm.ts         # LoadGroupNew megosztott form-típusok + mock adat (load case, fatigue profil)
│   ├── calculations.ts          # Calculation[] mock — Calculation list page data
│   └── calculationFatigueLoadGroups.ts # CalculationNew fatigue tab mock adat + típusok
├── hooks/
│   └── useClickOutside.ts       # Kattintás-kívülre/Escape dismiss logika — dropdownok/popoverek 2+ helyen megosztva
├── types.ts                     # Cross-cutting, nem-domain UI-állapot típusok EGY fájlban, szekciónként rendezve
│                                 # (ControlPoint, RenderMode, ViewMode, SortDirection/SortState<K>, CalculationNew
│                                 # tab/sort típusai, minden lista oldal saját <Feature>SortKey uniója, GeometryType/
│                                 # NurbsGeometryType) — domain entitások (Material, Geometry stb.) változatlanul data/-ban
├── lib/
│   ├── utils/                   # cn, slugify, todayISO, uniqueId/nextLocalId — külön fájlban, index.ts barrel (@/lib/utils import változatlan)
│   ├── occ-init.ts              # OpenCascade.js WASM singleton inicializálás
│   ├── bezierMath.ts            # Bézier-görbe koordináta-transzformáció + interpoláció segédfüggvényei
│   ├── loftGeometry.ts          # Loft mesh építés (Three.js geometria) — LoftViewer segédfüggvényei
│   ├── crossSectionGeometry.ts  # NACA/SVG keresztmetszet-geometria segédfüggvényei — CrossSectionDialog
│   └── listTable.ts             # toggleSort, rowInteractionProps — lista oldalak megosztott sort/a11y segédfüggvényei (nem komponens, ezért lib/-ben, nem components/common/list/-ben)
├── App.tsx                      # Router konfiguráció
├── main.tsx                     # Belépési pont
└── index.css                    # Tailwind direktívák + CSS változók
```

## Routing

| Útvonal | Komponens | Leírás |
|---------|-----------|--------|
| `/` | `Home` | Dashboard: Add new + Recently edited + What's new — Figma 576:19645 |
| `/material` | `Material` | Material data table accordion-szerű expand-dal — Figma 576:19313 |
| `/material/new` | `MaterialNew` | Új material létrehozás 3 tab-bal — Figma 584:15600 |
| `/geometry` | `Geometry` | Geometry list + grid view toggle — Figma 600:22786 / 600:22858 |
| `/geometry/:id` | `GeometryEdit` | Geometry edit full-bleed OccViewer canvas-szal. Sub-tabs: Create geometry (csak `/geometry/new`), Global properties (596:22661), Profile distribution (596:19816), Profiles (596:19631), Stacking (596:20399), 3D view (result generálás) |
| `/geometry/new` | `GeometryEdit` | Új geometria inline létrehozás (a `/geometry?new=1` link ide redirectel) |
| `/layup` | `Layup` | Layup list page (table) — Figma 600:23689 |
| `/layup/new` | `LayupNew` | New layup (General + Layup building) — Figma 600:27124 / 600:24328 |
| `/composition` | `Composition` | Composition list page (table) — Figma 600:27699 |
| `/composition/new` | `CompositionNew` | New composition (General + Geometry + Layup mapping + Transversal mapping) — Figma 600:27773 + 600:29097 + 600:28625 + 600:27811 |
| `/load-group` | `LoadGroup` | Load group list page (table) |
| `/load-group/new`, `/load-group/:id` | `LoadGroupNew` | Load group edit — General / Load cases / Limits / Fatigue profiles |
| `/calculation` | `Calculation` | Calculation list page (timestamp, status badge) |
| `/calculation/new`, `/calculation/:id` | `CalculationNew` | Calculation edit — General / Composition / Configuration / Fatigue profile |
| `/report` | `Report` | Stub |
| `/settings` | `Settings` | Stub (jobb felső ⚙ ikonról) |
| `/nurbs` | `Nurbs` | Teljes képernyős NURBS szerkesztő, nav nélkül |

## Konvenciók

- **Page szerkezet** (standard list / dashboard): minden routed page maga rendereli a `MainNav` + `Footer`-t.
  ```tsx
  <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
    <MainNav />
    <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
      <div className="mx-auto w-full max-w-[1400px]">...</div>
    </main>
    <Footer />
  </div>
  ```
- **Edit page szerkezet** (`MaterialNew`, `GeometryEdit`): sub-toolbar a MainNav alatt, sticky `top-[69px] h-[52px]`, tartalmazza a tabs + középre pozícionált címet + Exit edit mode gombot. Részletek `design.md`-ben.
- **Full-bleed canvas page** (`GeometryEdit`): a `<main>` `relative overflow-hidden`, a Three.js canvas `absolute inset-0`, minden UI overlay (sub-toolbar, panel, gizmó) z-index-szel felette, transparent háttérrel. **Footer eltávolítva** (edit mode).
- **Kivételek**: `Nurbs` (fullscreen, nincs nav, nincs footer), `GeometryEdit`, `CompositionNew`, `CalculationNew` (nincs footer — edit mode).
- **Layout** (`src/components/common/layout/Layout.tsx`) szándékosan passthrough — történelmi okból maradt.
- **Stílusok**: Tailwind utility classok inline. Pixel-pontos Figma illesztéshez **hex literálok** (`text-[#0a0a0a]`, `rounded-[14px]`) — nem CSS változókon keresztül abstraction.
- **shadcn primitívek**: `src/components/ui/` — `npx shadcn add <name>` az új komponensekhez. Nem módosítjuk közvetlenül.
- **Mock adatok**: `src/data/` — típusos export, később lecserélhető API hívásra ugyanazzal a shape-pel.
- **Path alias**: `@` = `src/` (vite.config.ts-ben konfigurálva)
- **Prettier**: 100 char szélesség, single quotes (package.json-ben)

## AI agent munkamódszer (ponytail + caveman)

Ebben a projektben minden prompt írásakor és minden válaszadáskor az alábbi két konvenciót kell követni ([ponytail](https://github.com/DietrichGebert/ponytail) és [caveman](https://github.com/juliusbrussee/caveman) filozófiája alapján):

- **Minimális kód (ponytail)**: kód írása előtt végig kell menni a döntési létrán — kell egyáltalán? már megvan a kódbázisban? standard library/natív platform feature megoldja? már telepített dependency tartalmazza? egy sorban megoldható? — és csak ezután jöhet az egyedi implementáció, azt is a lehető legkisebb terjedelemben. Kerülendő a túlbiztosítás, felesleges absztrakció, nem használt konfigurálhatóság.
- **Tömör kommunikáció (caveman)**: a válaszok legyenek tömörek, felesleges körítés nélkül — ugyanaz a technikai pontosság, kevesebb szóval. Kód, parancsok, hibaüzenetek változatlanul, szó szerint maradnak; csak a magyarázó szöveg tömörödik.

Ha a Claude Code plugin verziók telepítve vannak (`/plugin install ponytail@ponytail`, `/plugin install caveman@caveman`), ez a két szabály automatikusan érvényesül; egyébként is ez az elvárt írásmód ebben a projektben.

## Fontos konfigurációs részletek

- **Vite**: CORS fejlécek WebAssembly-hez (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`), `opencascade.js` kizárva a dep optimizalasbol
- **Tailwind**: `tailwind.config.js` — CSS variable alapú színrendszer, `tailwindcss-animate` plugin
- **TypeScript**: strict mód, `tsconfig.json`

## Figma workflow

A kódbázis Figma-vezérelt. Új oldal / komponens implementáció előtt:

1. Figma desktop appban Dev Mode bekapcsolva (`</>` ikon jobb felül), MCP server jobb sidebar-on aktív
2. Megfelelő file az aktív tab (ellenőrzés: `mcp__Figma__get_metadata` "no node could be found" hibát dob, ha rossz tab van nyitva)
3. `mcp__Figma__get_screenshot` + `get_metadata` + `get_variable_defs` a Figma node ID-vel
4. Pixel-pontos implementáció `design.md`-ben felsorolt tokenek és pattern-ek alapján

A Figma MCP setup gotchákat lásd: `lessons.md` és a felhasználói memory (`~/.claude/projects/.../memory/reference_figma_mcp_setup.md`).

## Megjegyzések

- A `README.md` jelenleg elavult (Angular-t ír, de ez egy React projekt) — frissíteni kellene
- Font: Geist Sans (CDN-ről töltve az `index.html`-ben)
- Részletes design tokenek + komponens katalógus: `design.md`
- Tanulságok / gotchák: `lessons.md`
