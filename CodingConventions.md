# Coding Conventions

Ez a dokumentum a projekt belső mérnöki kézikönyve — nem README, nem felhasználói dokumentáció. Célja, hogy AI asszisztensek és emberi fejlesztők konzisztens, karbantartható, a projekt tényleges tech stackjéhez illeszkedő kódot írjanak, és minden szabálynál értsék a **miértet** is, ne csak a szabályt magát. Lásd még: `CLAUDE.md` (projekt struktúra, routing), `design.md` (design tokenek), `lessons.md` (gotchák).

> **Megjegyzés a stackről**: néhány, sok React projektben elterjedt eszköz (pl. Zustand, TanStack Query, React Hook Form, Zod, React Three Fiber/Drei) **jelenleg nincs a függőségek között** — a projekt sima Three.js-t használ, helyi React state-et, mock adatot és natív form elemeket. Ahol ez releváns, a dokumentum jelzi, hogy mi az aktuális gyakorlat, és mi lenne az irány, *ha* egyszer indokolttá válik egy ilyen lib bevezetése — de **új dependency-t sose vezess be pusztán azért, mert "ez az iparági standard"**, csak ha a meglévő eszközök ténylegesen nem elegendőek.

## Filozófia

- **Olvashatóság a trükkösség helyett**: egy kód akkor jó, ha 6 hónap múlva egy másik fejlesztő (vagy AI) gyorsan megérti — ne írj tömörebb, de nehezebben követhető megoldást csak azért, mert "elegánsabb".
- **Explicit a implicit helyett**: típusok, prop-ok, side effect-ek legyenek láthatóak a hívási helyen — kerüld a "mágikus" viselkedést (rejtett globális mutáció, implicit type coercion).
- **Kompozíció az öröklés helyett**: a React ökoszisztéma amúgy is kompozícióra épül (komponens-gyerek, hook-ok, render props helyett children) — ne keress class-alapú öröklési mintát.
- **Karbantarthatóság a gyorsmegoldás helyett**: egy hack, ami most 10 perc, fél év múlva órákig tartó debug session — ha egy shortcut technikai adósságot termel, dokumentáld kommentben a miértet, vagy inkább oldd meg rendesen.
- **Teljesítmény mérés alapján**: ne optimalizálj feltételezés alapján — profilozz (React DevTools Profiler, Chrome Performance panel, Three.js `renderer.info`), és csak a ténylegesen bizonyított szűk keresztmetszetet célozd.
- **Újrahasználható komponensek, kiszámítható architektúra**: a `src/components/ui/` + feature komponensek rétegződése tudatos — ne törd meg egyedi, egyszeri megoldásokkal.
- **Erős típusosság**: a TypeScript strict módja nem formalitás, hanem védőháló — ne kerüld meg.
- **Akadálymentesség elsőként**: a UI-t úgy építsd, hogy billentyűzettel és screen readerrel is használható legyen, ne utólagos patch-ként.
- **Mobile-first, reszponzív gondolkodás**: Tailwind breakpointokat mobile-first irányban add hozzá (`sm:`, `lg:` a bázis stílus *felül*írása, nem fordítva).

## Általános elvek

- **Single Responsibility Principle (SRP)**: egy komponens/hook/függvény egy okból változzon. Ha egy `GeometryEdit`-hez hasonló komponens egyszerre kezel adatbetöltést, 3D renderelést és form state-et, az három felelősség — külön hook/komponens/util kandidátus.
- **DRY (Don't Repeat Yourself)**: ismétlődő logikát (pl. bezier szerkesztő logika `BezierEditor.tsx` vs `ProfileDistributionPanel.tsx`) emelj közös hook/util szintre — de csak ha a duplikáció *véletlen egybeesés*, nem szándékos hasonlóság (két hasonló, de független domain logikát ne erőltess közös absztrakcióba).
- **KISS (Keep It Simple)**: a legegyszerűbb megoldást válaszd, ami megoldja a feladatot — ne tervezz rugalmas, konfigurálható rendszert egy jelenleg egyetlen use case-hez.
- **YAGNI (You Aren't Gonna Need It)**: ne építs be paramétert, absztrakciós réteget vagy generikus API-t "a jövőbeli igényekhez" — a jelenlegi konkrét igényt oldd meg.
- **Separation of concerns**: UI (JSX/render), state/logika (hook-ok) és adat (data/services) réteg legyen szétválasztva — lásd [Adat- és API-réteg](#adat--és-api-réteg).
- **Feature-first gondolkodás**: egy route/feature (pl. Geometry, Layup, Composition) komponensei, hook-jai, adatai logikailag tartozzanak össze, még ha a jelenlegi lapos mappastruktúra miatt fizikailag nem is egy almappában vannak (lásd [Projekt struktúra](#projekt-struktúra)).
- **Clean Code**: beszédes nevek, kis függvények, minimális beágyazási mélység, korai return a mély if-else láncok helyett.
- **SOLID, ahol értelmezhető**: React funkcionális világban elsősorban az SRP és az Interface Segregation (kis, fókuszált props interface, ne egy "god prop object") releváns — Liskov/Dependency Inversion class hierarchia hiányában kevésbé alkalmazható közvetlenül.
- **Kerüld a korai optimalizálást**: ne írj `useMemo`/`useCallback`-et vagy manuális cache-t "biztos ami biztos" alapon — csak akkor, ha profilozással igazolt renderelési probléma van.

## Tech stack referencia

| Kategória | Eszköz | Verzió |
|---|---|---|
| Nyelv | TypeScript | 5.9 (strict) |
| UI framework | React | 18.3 |
| Build | Vite | 7.3 |
| Routing | React Router DOM | 7 |
| Stílus | Tailwind CSS | 3.4 (+ `tailwindcss-animate`) |
| UI primitívek | Radix UI (`@radix-ui/react-*`) via shadcn/ui | — |
| Ikonok | lucide-react | — |
| Class utils | `clsx` + `tailwind-merge` (→ `cn()`), `class-variance-authority` | — |
| 3D | Three.js (natív, nem React Three Fiber) | 0.182 |
| B-Rep / NURBS | OpenCascade.js | 1.1 |
| Dátum picker | react-day-picker | — |
| Lint | ESLint 9 (flat config) + typescript-eslint | — |
| Formázás | Prettier | 3.9 |
| Csomagkezelő | npm | 10.9.3 |

**Jelenleg nincs a projektben** (ne feltételezd a meglétüket): state management lib (Zustand/Redux), szerver-state lib (TanStack Query/SWR), form lib (React Hook Form), séma-validáció (Zod), React Three Fiber/Drei, teszt framework (Vitest/RTL/Playwright). Ha egy jövőbeli feladat ezek bevezetését indokolja, jelezd explicit módon, és csak azután vezesd be.

## Projekt struktúra

```
src/
├── components/
│   ├── common/       # 2+ feature által ténylegesen használt, valóban megosztott komponensek
│   ├── <feature>/    # pl. calculation/, load-group/, composition/, geometry/, layup/, material/, nurbs/
│   └── ui/           # shadcn/ui primitívek — ne módosítsd közvetlenül
├── pages/            # Route-hoz kötött oldalak, egy route = egy fő komponens
├── hooks/            # 2+ komponens által ténylegesen megosztott custom hookok (pl. useClickOutside)
├── types.ts          # Cross-cutting, nem-domain UI-állapot típusok EGY fájlban, szekciónként rendezve
├── data/             # Mock adat + a hozzá tartozó domain típusok (típusos export)
├── lib/              # Framework-független segédkód (utils/, OCC init, geometria/bezier matek)
├── App.tsx           # Router konfiguráció
├── main.tsx          # Belépési pont
└── index.css         # Tailwind direktívák + CSS változók
```

- **`components/<feature>/`**: egy adott route/domain (pl. `calculation/`, `geometry/`) komponensei — tab-tartalmak, dialógusok, panel-specifikus segédkomponensek (pl. egy panel privát `Select`/`Switch` másolata). Az, hogy egy komponens melyik feature-mappába kerül, a **tényleges fogyasztóján** (ki importálja) múlik, nem a fájlnéven — pl. `MaterialPickerDialog.tsx` a `layup/`-ban van, mert kizárólag a `LayupBuilder.tsx` használja, annak ellenére, hogy a neve "Material"-lal kezdődik.
- **`components/common/`**: kizárólag azok a komponensek, amiket **2+ feature-mappa** ténylegesen importál (pl. `MainNav`, `Footer`, `OccViewer`, `BezierEditor`, `GeometryCard`). Ha valami csak egyetlen feature-ön belül több fájl között oszlik meg, az a feature saját mappájában marad, nem a `common/`-ban.
  - **Egy fájl, egy komponens** itt szigorúan érvényes — a `common/` a legszélesebb körben importált réteg, itt a legnagyobb az ára, ha egy fájl 2+ komponenst rejt (nehezebb megtalálni, nehezebb a `react-refresh` fast-refresh, nagyobb az esély felesleges re-exportra). Ha egy meglévő `common/` fájl 2+ komponenst exportál, bontsd szét — ahogy a `ListTable.tsx` (`SortableHeader` + `Pagination` + a nem-komponens `toggleSort`/`rowInteractionProps`/`pageWindow` segédfüggvények) és a `ViewerOverlayControls.tsx` (`CoordinateGizmo` + `RenderToggle`) szét lett bontva `list/`, illetve `viewer/` alá.
  - **Alcsoportok**: ha a `common/` 4+ egymással rokon (azonos témájú) komponenst tartalmaz, csoportosítsd egy alcsoportba (pl. `layout/` az oldal-keret komponenseknek, `list/` a lista-oldal építőkockáknak, `viewer/` a 3D/bézier komponenseknek, `card/` a grid-kártyáknak) — ugyanaz az elv, mint a feature-mappáknál. Egyedi, sehova nem illő komponens (pl. `AirfoilPreview.tsx`, `BufferedNumberInput.tsx`) maradhat a `common/` gyökerén, nem kell mesterségesen alcsoportba erőltetni egyetlen fájl miatt.
  - Egy komponenshez szorosan kötődő, de **nem komponens** segédfüggvény (pl. `toggleSort`, `rowInteractionProps` — ezeket sok különböző lista oldal importálja függetlenül a `SortableHeader`/`Pagination` komponensektől) a `src/lib/`-be kerül, nem a `components/common/`-ba — a `components/` mappa kizárólag React komponenseknek szól.
- **`components/ui/`**: kizárólag shadcn/ui generált primitívek, feature-mappáktól függetlenül — új elem `npx shadcn add <name>` paranccsal, kézi módosítás nélkül.
- **`pages/`**: route-onként egy fájl, ami maga rendereli a saját layoutját (`MainNav` + `Footer`) — lásd `CLAUDE.md`. A `pages/` maga nem bontott feature-mappákra, mivel route-onként eleve egyértelmű a hovatartozás.
- **`data/`**: mock adat típusos formában, API-hívásra cserélhető shape-pel — ez a projekt jelenlegi "adatréteg" helyettesítője.
- **`lib/`**: tisztán funkcionális, React-független segédkód. `utils/` almappa (`cn`, `slugify`, `todayISO`, `uniqueId`/`nextLocalId`, egy-egy fájlban, `index.ts` barrel-lel az `@/lib/utils` import változatlanul hagyásához), plusz `occ-init.ts`, `bezierMath.ts`, `loftGeometry.ts`, `crossSectionGeometry.ts`.
- **`hooks/`**: React-hookok, amiket 2+ komponens ténylegesen megoszt (pl. `useClickOutside` — kattintás/Escape alapú dismiss logika dropdownokhoz/popoverekhez). Egy komponens saját, máshol nem használt hookja maradjon a komponens fájljában — a `hooks/` csak a ténylegesen megosztott eseteknek szól, ne szervezz át mindent ide preventívan.
- **`types.ts`**: kizárólag olyan, nem-domain, cross-cutting UI-állapot típusok, amiket 2+ komponens/feature importál (pl. `ControlPoint`, `RenderMode`, `SortState<K>`), **plusz** az egyes lista oldalak saját `<Feature>SortKey` union típusai (pl. `MaterialSortKey`, `GeometrySortKey`) — ezek jelenleg csak egy fájlból importálódnak, de mivel a már megosztott `SortState<K>` generikus típus konkrét paraméterei, egy helyen a dokumentált "mivel rendezhető ez a lista" katalógust adják, nem szórva page fájlokban. **Egyetlen fájl, nem mappa** — a tartalom (10-15 kis, egymástól független típus) nem indokol egy fájlonkénti szétbontást, csak navigációs overheadet adna hozzáadott érték nélkül (YAGNI); belül `// ─── szekció ───` kommentekkel van csoportosítva feature szerint, hogy könnyű legyen benne keresni. Ha a fájl a jövőben ténylegesen nagyra nőne (pl. 300+ sor, sok, egymástól teljesen független típuscsoporttal), akkor indokolt lehet visszabontani — de ezt csak konkrét, akkori tartalom alapján döntsd el, ne előre.
  - Ha egy union két oldalon **véletlenül** azonos értékkészletű (pl. `LayupSortKey` és `LoadGroupSortKey` mindkettő `'name' | 'lastUpdated'`), **ne vond össze** egyetlen közös típusba — a két feature független, csak épp jelenleg egybeesik az értékkészletük; az összevonás felesleges csatolást hozna létre, ami az egyik oldal jövőbeli bővítésekor (pl. egy harmadik sort-oszlop hozzáadása) a másikra is kihatna.
  - A domain entitás típusok (`Material`, `Geometry`, `Composition` stb.) **változatlanul a `data/*.ts`-ben maradnak** — nem kerülnek át `types.ts`-be, mert a mock adatukhoz és a jövőbeli API shape-hez vannak kötve.
  - Egy komponens saját `<Component>Props` interfésze is a komponens fájljában marad — a `types.ts` nem gyűjtőhely mindenre, csak a ténylegesen több helyről importált (vagy egy már megosztott generikus típus paramétereként dokumentált), nem-Props típusokra.
- Nincs külön `services/`, `three/` mappa — ha egy jövőbeli feladat során ezekre ténylegesen szükség lesz (pl. valós API bevezetésekor a `services/` az [Adat- és API-réteg](#adat--és-api-réteg) szerint), ekkor érdemes bevezetni, de **ne hozd létre előre, üresen**, csak amikor tényleges tartalom indokolja (YAGNI).

## Feature-szervezés

- A `components/` feature-mappákra van bontva (`calculation/`, `load-group/`, `composition/`, `geometry/`, `layup/`, `material/`, `nurbs/`, `common/`) — ez tudatos, végrehajtott döntés, nem csak jövőbeli lehetőség. Új komponens létrehozásakor mindig döntsd el, melyik feature-mappába tartozik a **fogyasztója** alapján (grep-eld ki, ki importálja), ne a név alapján.
- **Új komponens elhelyezése**: ha csak egy feature-ön belüli fájl(ok) használják, abba a feature-mappába kerül. Ha a létrehozáskor még bizonytalan, hogy 2+ feature fogja-e használni, kezdd a valószínűbb feature-mappában, és told át `common/`-ba csak akkor, amikor egy második feature ténylegesen importálni kezdi — ne tegyél előre mindent `common/`-ba "biztos, ami biztos" alapon (YAGNI).
- Egy feature-mappán belül nincs további almappázás (pl. nincs `components/geometry/panels/`, `components/geometry/dialogs/`) — egy szint elég, amíg egy feature-mappa nem nő 15+ fájlra; ha ez bekövetkezik, az egy külön, tudatos döntést igénylő további bontás lenne, nem alapértelmezés.
- `pages/` marad lapos — a route-hoz kötött oldalak (pl. `CalculationNew.tsx`, `GeometryEdit.tsx`) nem kerülnek a saját feature-mappájukba, mivel a fájlnév/route már egyértelművé teszi a hovatartozást, és a page mindig csak a saját feature-mappájából importál.

## Komponens irányelvek

- **Ajánlott max méret**: ~300 sor egy `.tsx` fájlban. E fölött nagy valószínűséggel több felelősség keveredik — bontsd al-komponensre vagy custom hookra.
- **Egy komponens, egy felelősség**: ha egyszerre végez adatlekérést/számítást *és* renderel *és* kezel komplex helyi UI state-et, válaszd szét (logika → hook, render → komponens).
- **Presentational vs. container szemlélet**: törekedj rá, hogy a "buta" (presentational) komponensek csak props alapján rendereljenek, side effect és adatlogika nélkül; a state/adatkezelést a szülő (vagy egy dedikált hook) végezze. Nem kell szigorú fájl-szintű szétválasztás mindenhol, de a keveredés kerülendő nagy komponensekben.
- **Kompozíció**: preferáld a `children`/render prop mintát a sok, egymást kizáró boolean prop helyett (`<Card><CardHeader />...</Card>` jobb, mint `<Card variant="withHeaderAndFooterButBoth" />`).
- **Prop drilling elkerülése**: ha egy prop 3+ szinten megy keresztül csak azért, hogy egy mélyen fekvő komponenshez eljusson, fontold meg `children`-alapú kompozíciót, vagy — ha tényleg sok komponens osztozik rajta — lokális Context-et (lásd [React best practice-ek](#react-best-practice-ek)). Ne vezess be globális state lib-et egyetlen prop-lánc miatt.
- **JSX olvashatóság**: mély beágyazás (4+ szint feltételes renderelés) esetén emelj ki al-komponenst vagy korai return-t (`if (!data) return null`) a JSX elején, ne egymásba ágyazott ternary-kkal.
- **Elnevezés**: lásd [Kódstílus](#kódstílus).
- **Mikor bontsunk komponenst**: ismétlődő JSX blokk → külön komponens; egynél több, egymástól független `useState`/`useEffect` csoport → külön komponens vagy hook; 300+ soros fájl → bontás jelzése (de ne bontogass csak a sorszám miatt, ha a felelősség koherens, pl. `OccViewer.tsx`).

## React best practice-ek

- **Hookok**: csak a React hook szabályok szerint (top-level, nem feltételes hívás) — az ESLint `react-hooks/recommended` ezt kikényszeríti, ne kerüld meg `eslint-disable`-lel.
- **Custom hook**: ha 2+ komponens ugyanazt a stateful logikát ismétli (pl. egy drag state, egy debounce logika), emeld ki `useXyz` custom hookba.
- **Memoizáció (`useMemo`, `useCallback`, `React.memo`)**: csak *mért*, ténylegesen lassú render vagy felesleges child re-render esetén használd — alapértelmezésben ne. Indokolatlan memoizáció plusz komplexitást és karbantartási terhet ad, valós nyereség nélkül.
- **Context**: kis hatókörű, ritkán változó érték megosztására (pl. téma, aktuális felhasználó) rendben van; gyakran változó state-hez (pl. minden billentyűleütés) ne használd, mert minden fogyasztót renderel — ilyenkor state lifting vagy lokális state a megoldás.
- **State lifting**: ha két testvér-komponensnek szinkronban kell lennie, told fel a state-et a legközelebbi közös ősbe — ne globális store-t vezess be erre.
- **Error boundary**: kritikus, önállóan hibázható részfákhoz (pl. `OccViewer`/`NurbsViewer` WASM betöltés) érdemes dedikált error boundary-t bevezetni, hogy egy 3D renderelési hiba ne vigye le az egész oldalt.
- **Lazy loading / code splitting / Suspense**: nagy, ritkán használt route-okhoz (pl. `Nurbs.tsx`, ami OpenCascade WASM-et tölt) `React.lazy` + `Suspense` fontolandó, hogy a fő bundle-ből kikerüljön a nehéz kód — jelenleg a route-ok nincsenek lazy-loadolva, ez jövőbeli optimalizálási irány, ha a bundle méret indokolja.
- **Felesleges renderelés elkerülése**: elsősorban helyes state-elhelyezéssel (ne told fel state-et feleslegesen magasra) és stabil key-ekkel (lista renderelésnél sose index alapú key, ha a lista sorrendje/tartalma változhat).
- **Controlled vs. uncontrolled input**: a projekt jelenleg natív, controlled inputokat használ (`value` + `onChange`) form libek nélkül — maradj ennél a mintánál, ne keverd uncontrolled `ref`-alapú inputtal ugyanabban a formban.

## State kezelés

- **UI state** (panel nyitva/zárva, aktív tab, form mező érték): helyi `useState`/`useReducer` a komponensben vagy egy hozzá tartozó custom hookban — jelenleg nincs globális UI state lib (Zustand) a projektben. Csak akkor vezesd be, ha valódi, több, egymástól távoli komponens közötti megosztott UI state jelentkezik, amit prop drilling/Context már nem tud ésszerűen kezelni.
- **Szerver state** (API-ból jövő adat): jelenleg nincs valós backend, a `src/data/*.ts` mock adat szolgál helyette. Ha valós API kerül bevezetésre, a szerver state kezelésére (cache, refetch, loading/error state) egy dedikált lib (pl. TanStack Query) bevezetése ajánlott irány — addig ne szimulálj kézzel cache-elést/refetch logikát, ha nincs rá valós szükség.
- **Form state**: jelenleg natív controlled input state (`useState` mezőnként vagy egy form-objektum state) — nincs React Hook Form. Komplexebb, sok mezős, komplex validációjú form esetén megfontolandó egy form lib (RHF) + séma-validáció (Zod) bevezetése, de ez egy tudatos, külön döntést igénylő lépés legyen, ne alapértelmezés.
- **Derived state**: számított értéket (pl. összesítés, szűrt lista) sose duplikálj külön state-be — számold ki renderelés közben (esetleg `useMemo`-val, ha mérten indokolt), ne `useEffect`-tel szinkronizálj két state-et egymással.
- **Ne duplikálj state-et**: ugyanaz az információ (pl. "kiválasztott elem ID-ja" és "kiválasztott elem objektuma") ne éljen két külön state-ben — az egyikből vezesd le a másikat.

## TypeScript szabályok

- **Strict mód mindig be van kapcsolva** (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Ne írj kódot, ami ezeket kikapcsolná vagy megkerülné.
- **Tilos az `any`**: ha egy külső, típus nélküli lib (pl. `opencascade.js`) miatt laza típus kellene, szűkíts `unknown`-ra és type guard-dal élesítsd, vagy írj minimális lokális típusdeklarációt.
- Nem használt paramétereket/változókat `_` prefixszel jelölj (`_event`, `_unused`) — az ESLint konfiguráció ezt explicit engedi.
- **`interface`** objektum-alakú adatstruktúrákhoz (props, entity-k: `Material`, `Geometry`, `Layup`); **`type`** union/intersection/tuple/mapped type esetén (`type ViewMode = 'list' | 'grid'`).
- **Discriminated union** mintát használj, ha egy állapotnak több, egymást kizáró alakja van (pl. `{ status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: Geometry }`) — ne opcionális mezők halmazával modellezd ugyanezt.
- **Utility type-ok** (`Partial`, `Pick`, `Omit`, `Record`) preferálandók egy már létező típus módosított változatának deklarálása helyett — ne duplikáld a mezőket.
- **Generikusok**: ha egy komponens/hook/util a típusától függetlenül ugyanazt a logikát végzi (pl. egy generikus lista/table wrapper), típusparaméterrel írd, ne `any`-vel vagy duplikált változatokkal domainenként.
- **`readonly`** használata olyan tömb/objektum propnál, aminek nem szabadna mutálódnia a fogyasztó oldalon (pl. `readonly items: Geometry[]`).
- Típusokat és mock adat shape-eket a `src/data/*.ts` fájlokban definiáljuk, exportált formában — ugyanezt a shape-et követi a majdani API válasz is.
- Path alias: `@/*` → `src/*`.
- `.tsx` kiterjesztés komponenseknek, `.ts` mindennek ami nem renderel JSX-et.

## Adat- és API-réteg

- **Jelenlegi állapot**: nincs valós backend hívás a kódbázisban — a `src/data/*.ts` fájlok típusos mock adatot exportálnak, amit a page/komponens közvetlenül importál.
- **Irányelv valós API bevezetésekor**: a réteg-sorrend `UI (komponens) → hook → service → API hívás` legyen — **komponens sose hívjon közvetlenül `fetch`-et vagy más HTTP klienst**. A service réteg felelőssége: endpoint URL-ek, request/response mapping, hibakezelés egy helyen; a hook réteg felelőssége: a service hívás React életciklushoz kötése (loading/error/data state, esetleg TanStack Query, ha bevezetésre kerül).
- Amíg mock adat van használatban, kövesd ugyanezt a réteg-elvet szimulált szinten: a komponens ne "tudjon" arról, hogy az adat mock vagy valós — importálja típusos formában a `data/`-ból, hogy a későbbi csere ne igényeljen komponens-szintű átírást.

## Form kezelés

- **Jelenlegi gyakorlat**: natív, controlled HTML inputok (`<input>`, `<textarea>`, shadcn `Input`/`Textarea`) + kézzel írt validáció (feltétel-vizsgálat submit előtt, hibaüzenet helyi state-ben) — nincs React Hook Form, nincs Zod.
- Új form mezőt lehetőleg meglévő `components/ui/` primitívekből építs fel (`Input`, `Label`, `Checkbox`, stb.), ne írj egyedi natív `<input>`-ot stílus nélkül.
- Validációs hibaüzenetet a mező mellett, hozzáférhető módon jelenítsd meg (lásd [Akadálymentesség](#akadálymentesség) — `aria-invalid`, `aria-describedby`).
- **Ha egy form komplexitása indokolja** (sok egymástól függő mező, komplex séma-validáció, teljesítményproblémák nagy formoknál a re-render miatt): React Hook Form + Zod bevezetése megfontolandó irány, de ez tudatos, külön megbeszélendő döntés legyen, ne automatikus választás minden új formhoz.

## TailwindCSS szabályok

- **Utility-first, inline JSX-ben** — nincs külön CSS modul/styled-components réteg.
- Pixel-pontos Figma illesztéshez **hex literálokat** használj (`text-[#0a0a0a]`, `bg-[#f8fafc]`, `rounded-[14px]`), nem CSS-változó absztrakción keresztül, hacsak a `design.md` másképp nem definiál tokent.
- **Ne duplikálj hosszú class-string-eket** több helyen — ha ugyanaz a class-kombináció 3+ helyen ismétlődik, emeld ki komponensbe vagy `cva` variant-ba, ne copy-paste-eld.
- Class-ok összefésüléséhez/feltételes class-okhoz mindig `cn()` (`src/lib/utils/cn.ts`, re-exportálva `src/lib/utils/index.ts`-ből) — ne konkatenálj template stringgel.
- Variant-alapú komponens stílushoz `class-variance-authority` (`cva`) mintát követünk, ahogy a `src/components/ui/` shadcn komponensekben.
- **Inline `style` attribútumot kerüld**, kivéve dinamikusan számított értéket (pl. Three.js canvas méret, drag pozíció), amit Tailwind statikus class-szal nem lehet kifejezni.
- `tailwindcss-animate` plugin elérhető animációkhoz — ne vezess be külön animációs libet.

## shadcn/ui szabályok

- A shadcn/ui-t **design systemként** kezeld: a `src/components/ui/` generált komponensek a projekt alap-építőkockái.
- **Sose módosítsd közvetlenül** a generált fájlokat egyedi feature-igény miatt — ehelyett építs rájuk épülő, üzleti logikát tartalmazó wrapper/kompozit komponenst a `components/` alatt (pl. `PropertyFormTab.tsx` a `Tabs`/`Input` primitívekre épülve).
- Ha egy globális stílusváltoztatás kell (pl. minden `Button` sarka kerekebb legyen), azt a shadcn komponens forrásában (`components/ui/button.tsx`) módosítsd egy helyen, ne feature komponensben felülíró class-okkal minden hívási helyen.
- Új primitív hozzáadása mindig `npx shadcn add <name>` — kézzel ne írj újra egy shadcn komponenst.

## Three.js standards (natív Three.js, nem React Three Fiber)

> A projekt jelenleg **imperatív, natív Three.js**-t használ dedikált viewer komponensekben (`OccViewer.tsx`, `NurbsViewer.tsx`, `LoftViewer.tsx`), nem React Three Fiber/Drei-t. Az alábbi irányelvek ehhez a mintához igazodnak.

- **Scene/komponens szervezés**: egy viewer komponens felelős a teljes Three.js életciklusért (scene, camera, renderer, animation loop létrehozása és takarítása) — a scene-hez tartozó objektum-létrehozó/frissítő logikát emeld ki nevesített helper függvényekbe a komponensen belül vagy a komponens melletti helper modulba, ne egy monolitikus `useEffect`-be zsúfold.
- **Renderelési logika elválasztása az üzleti logikától**: a domain adat (pl. IGES geometria paraméterek, profil lista) betöltése/transzformálása ne a Three.js render kódba ágyazva történjen — a viewer komponens kapja meg propként a már feldolgozott adatot, és csak a 3D reprezentációért feleljen.
- **Kamera, fények, environment tulajdonlása**: egy viewer komponens hozza létre és birtokolja a saját kameráját/fényeit — ne osszunk meg egy Three.js `Camera`/`Light` instance-ot komponensek között; ha közös beállítás kell (pl. azonos háttérszín, azonos fény-preset), azt konstansként/konfig objektumként oszd meg, ne instance-ként.
- **`useFrame`-hez hasonló animation loop (`requestAnimationFrame`) maradjon könnyű**: az animáció ciklusban ne allokálj új objektumot (`new THREE.Vector3()`, `new THREE.Matrix4()`) minden frame-ben — hozz létre egy újrafelhasználható scratch-objektumot a komponens/modul szinten, és minden frame-ben azt írd újra (`.set()`, `.copy()`).
- **Geometria/anyag/textúra újrafelhasználás**: azonos geometriát/anyagot használó objektumoknál egy megosztott `THREE.BufferGeometry`/`THREE.Material` instance-ot hozz létre és többször használj (`mesh.geometry = sharedGeometry`), ne példányonként új geometriát/anyagot.
- **Erőforrás felszabadítás (dispose)**: minden Three.js objektum, ami GPU erőforrást foglal (`geometry`, `material`, `texture`, `renderer`), explicit `.dispose()`-t kell kapjon a komponens unmountján (`useEffect` cleanup függvényben) — különben a route váltás (pl. Geometry → Layup → vissza Geometry) memóriaszivárgást okoz.
- **Instancing ismétlődő objektumokhoz**: ha sok azonos geometriájú objektumot kell renderelni (pl. sok azonos profil-szegmens), `THREE.InstancedMesh`-t használj egyedi `Mesh` példányok helyett.
- **GLTF/GLB és tömörítés**: ha a projekt jövőben előre elkészített 3D modelleket tölt be (jelenleg IGES/OCC-alapú a geometria, nem GLTF), GLTF/GLB formátumot használj, Draco/Meshopt geometria-tömörítéssel és KTX2 textúra-tömörítéssel — ez jelenleg nem releváns a tisztán procedurális/OCC-alapú geometriákra, de irányadó, ha statikus asset-ek kerülnek be.
- **Lazy loading / Suspense nehéz asset-eknél**: a WASM alapú OpenCascade inicializálás és nagy modellek betöltése ne blokkolja a fő UI-t — a jelenlegi `src/lib/occ-init.ts` singleton mintát tartsd meg, betöltés közben mutass explicit loading state-et (a projekt jelenlegi mintája szerint, nem React Suspense boundary-vel).
- **PBR (fizikailag alapú renderelés)** preferálandó anyagmodellként (`MeshStandardMaterial`/`MeshPhysicalMaterial`) az egyszerűbb (`MeshBasicMaterial`/`MeshLambertMaterial`) helyett, ahol a vizuális pontosság számít.
- **Shader-szervezés**: ha egyedi shader (`ShaderMaterial`/`RawShaderMaterial`) válik szükségessé, a shader forráskódot (vertex/fragment) külön fájlban/konstansban tartsd a komponenstől elválasztva, ne inline template stringként a komponens közepén.
- **Profilozás**: teljesítményproblémánál mérd az FPS-t, draw call számot, háromszög számot és memóriahasználatot (`renderer.info.render`, `renderer.info.memory`, böngésző Performance panel) — a beavatkozás előtt ez adja meg, hol van a tényleges szűk keresztmetszet.

## Teljesítmény irányelvek

- **React**: helyes state-elhelyezés > memoizáció. Csak profilozással igazolt esetben nyúlj `useMemo`/`useCallback`/`React.memo`-hoz.
- **Bundle splitting / dynamic import**: nehéz, ritkán használt route-okhoz (WASM-et töltő oldalak) `React.lazy` — jövőbeli optimalizálási irány, ha a bundle méret ezt indokolja.
- **Kép optimalizálás**: statikus képekhez megfelelő formátum (WebP/AVIF, ha a build pipeline támogatja) és explicit méret, hogy elkerüld a layout shiftet.
- **Three.js optimalizálás**: lásd fenti Three.js szekció (geometria/anyag újrafelhasználás, instancing, dispose).
- **Lista virtualizáció**: ha egy táblázat/lista várhatóan sok (100+) sort renderel egyszerre, fontold meg virtualizációt (pl. csak a látható sorok renderelése) — jelenlegi list oldalak (Material, Geometry, Layup) mérete ezt még nem indokolja, ne vezesd be preventívan.
- **Debounce/throttle**: gyakori eseményeknél (drag, resize, search input) debounce-old/throttle-old a state-frissítést vagy a drága számítást (pl. `BezierEditor` drag interakció), ne minden pixelmozgásra futtass újraszámítást, ha az mérhetően lassú.
- **Mérj, mielőtt optimalizálsz** — minden fenti pontra igaz: a profilozás előzze meg a beavatkozást.

## Akadálymentesség

- **Szemantikus HTML**: `<button>` gombhoz, `<a>` navigációhoz, `<label>` minden input mellé — ne `<div onClick>`-kel helyettesítsd az interaktív elemeket.
- **Billentyűzet-navigáció**: minden interaktív elem elérhető és működtethető legyen `Tab`/`Enter`/`Space`/nyílbillentyűkkel — Radix primitívek (shadcn alapja) ezt alapból biztosítják, egyedi interaktív elemnél (pl. custom drag handle a `BezierEditor`-ban) külön figyelmet igényel.
- **ARIA**: csak ott, ahol a natív szemantika nem elég (pl. egyedi tab, popover, dialog) — Radix komponensek ezt már kezelik, ne írj felül ARIA attribútumot indokolatlanul.
- **Fókusz állapot**: sose távolíts el fókusz-gyűrűt (`focus:outline-none`) helyettesítő vizuális jelzés nélkül — Tailwind `focus-visible:ring-*` mintát használj.
- **Csökkentett mozgás (`prefers-reduced-motion`)**: díszítő animációkhoz (Tailwind `animate-*`, Three.js kameramozgás) vegyél figyelembe `prefers-reduced-motion` media query-t, ahol az animáció nem funkcionális, csak dekoratív.
- **Szín-kontraszt**: a `design.md`-ben rögzített színtokeneket használd — egyedi hex szín bevezetésekor ellenőrizd a WCAG AA kontraszt-arányt szöveghez.
- **Form**: minden mezőhöz `label`, hibaüzenethez `aria-describedby`/`aria-invalid` (lásd [Form kezelés](#form-kezelés)).
- **Dialog/modal**: fókusz-csapda és `Escape`-re zárás — Radix `Dialog` ezt biztosítja, egyedi modalt ne írj Radix nélkül.
- **Canvas (Three.js) akadálymentesség**: a 3D canvas maga nem screen-reader-barát — biztosíts szöveges alternatívát/összefoglalót a canvas mellett (pl. a geometria numerikus paraméterei a panelben), és a canvas körüli vezérlők (zoom, forgatás gombok, ha vannak) legyenek natív, billentyűzettel elérhető elemek, ne csak egérrel/érintéssel kezelhető canvas-interakció.

## Hibakezelés

- **Error boundary**: kritikus, önállóan hibázható részfákhoz (WASM betöltés, 3D viewer) dedikált boundary, hogy egy hiba lokálisan bukjon el, ne vigye le az egész oldalt.
- **Async hibák**: minden async művelet (jövőbeli API hívás, WASM inicializálás) explicit `try/catch`-sel vagy promise `.catch`-csel kezelje a hibát — ne hagyj kezeletlen promise rejectiont.
- **Felhasználóbarát hibaüzenet**: a felhasználó felé sose nyers stack trace-t vagy technikai hibaüzenetet mutass — fordítsd le emberi nyelvre ("A geometria betöltése sikertelen, próbáld újra" a nyers WASM hiba helyett).
- **Toast/inline visszajelzés**: jelenleg nincs globális toast rendszer a függőségek között — ha bevezetésre kerül, egységesen azt használd sikeres/hibás művelet visszajelzésére, ne kevert `alert()`/egyedi banner mintákat.
- **Graceful degradation**: ha egy nem kritikus funkció (pl. 3D előnézet) hibázik, a körülötte lévő UI (form, lista) maradjon használható.
- **Logolás**: fejlesztői hibát (`console.error`) a hiba kontextusával együtt logolj (mely komponens, milyen input mellett), ne csak a nyers exception objektumot.

## Tesztelés

- **Jelenlegi állapot**: a projektben nincs teszt infrastruktúra (nincs Vitest/RTL/Playwright a `package.json`-ban). Új teszt bevezetésekor ezt explicit módon jelezd, és először a build/lint pipeline-ba illeszd (`package.json` scripts, CI, ha van).
- **Ajánlott irány, ha teszt bevezetésre kerül**:
  - **Vitest** unit/integrációs teszthez (util függvények, adat-transzformáló logika, custom hookok).
  - **React Testing Library** komponens teszthez — felhasználói interakció alapján tesztelj (`getByRole`, `userEvent`), ne implementációs részletet (belső state) assertálj.
  - **Playwright** kritikus end-to-end user flow-khoz (pl. "új geometria létrehozása és mentése").
- **Prioritási sorrend** teszt hiányában induláskor: 1) tiszta util függvények (`src/lib/utils/`), 2) komplex, hibalehetőséges logika (bezier számítás, NACA profil generálás), 3) kritikus user flow-k, 4) UI komponensek renderelése.
- **Kerüld a felesleges snapshot tesztet** — egy nagy JSX fát lefotózó snapshot teszt gyakran csak zajt termel (minden apró stílusváltás töri), és nem mond semmit a viselkedésről; preferáld a viselkedés-alapú assertiont.

## Kódstílus

- **Komponens fájl és a benne exportált fő komponens neve** PascalCase, egyezzen meg (`LayupBuilder.tsx` → `LayupBuilder`).
- **Hook fájlok/függvények** `use` prefixszel, camelCase.
- **Nem-komponens `.ts` fájlok** (data, lib, types) camelCase, kivéve ha egy szomszédos fájl már kebab-case-t honosított meg (pl. `occ-init.ts`) — kövesd a helyi konvenciót.
- **Típus/interface nevek** PascalCase, entitást jelölő főnév (`Material`, `Geometry`); props interface `ComponentNévPropsvel` (`PropertyFormTabProps`).
- **Boolean** `is`/`has`/`should` prefixszel (`isOpen`, `hasError`).
- **Event handler prop** `on` prefixszel (`onSave`), lokális handler `handle` prefixszel (`handleSave`).
- **Konstansok**: modul-szintű, komponensen kívüli konstans `SCREAMING_SNAKE_CASE` (`NAV_ITEMS`, `PROFILE_TYPES`) — domain-adathoz `data/*.ts`-ben, UI-specifikushoz a komponens fájl tetején. 2+ fájl által importált konstans a hozzá logikailag tartozó `data/` fájlban éljen. Ne "mágikus szám"-ozz — emelj ki névvel ellátott konstansba. `as const` tömb/objektum literálon, ahol union típust vezetünk le belőle.
- **Utility függvények**: framework-független segédkód kizárólag `src/lib/`-ben, pure function ahol lehet. Új util írása előtt ellenőrizd, nincs-e már hasonló (`cn`, `slugify`, `uniqueId`, `todayISO`). Komponens-specifikus, egyszeri segédfüggvény maradhat a komponens fájlban.
- **Import sorrend**: 1) React/harmadik féltől származó libek, 2) `@/`-alias-os belső importok, 3) relatív importok, 4) típusimportok (ha külön blokkban). Csoportok között üres sor.
- **Export stratégia**: named export komponensenként/függvényenként — ne keverd feleslegesen a default és named exportot egy modulon belül.
- **Barrel fájlok (`index.ts` re-export)**: csak akkor vezesd be, ha egy mappa tartalma tényleg egy egységként importálódik több helyről (pl. `components/ui/index.ts`) — ne alkalmazz automatikusan minden mappára, mert felesleges indirekciót és néha körkörös import kockázatot ad.
- **Kommentek**: csak a *miértet* magyarázd (nem-triviális workaround, rejtett constraint), ne a *mit* — a jól elnevezett kód ezt már elmondja. Lásd meglévő minta az `eslint.config.js`-ben.
- **Formázás/lint**: Prettier (100 char, single quote) és ESLint (flat config, `js.configs.recommended` + `typescript-eslint` + `react-hooks` recommended) a mérvadó — `npm run format`/`npm run lint` előtt/után ez legyen az irányadó, ne kézzel próbálj megfelelni. `npm run build` (`tsc && vite build`) típushiba esetén elbukik — típushiba nélküli kódot írj.

## Git workflow

- **Kis, fókuszált commitok**: egy commit egy logikai változást tartalmazzon (egy bugfix, egy feature-lépés) — ne keverj benne össze nem függő refaktort.
- **Beszédes commit üzenet**: a *miértet* fogalmazd meg, ne csak a *mit* ("fix: geometry export crash on empty profile list" jobb, mint "fix bug").
- **Feature branch**: új munka külön branch-en, ne közvetlenül a `main`-en.
- **Pull request + code review**: minden érdemi változás PR-en keresztül kerüljön be, legalább egy másik szem átnézze (lásd [Code review checklist](#code-review-checklist)).
- **Husky + lint-staged**: ha bevezetésre kerül, commit előtti automatikus lint/format futtatásra használd — jelenleg nincs a projektben, bevezetése megfontolandó, ha a csapat mérete/gyakorisága indokolja.

## Dokumentáció

- Minden komplexebb feature (nem triviális algoritmus, nem magától értetődő architektúra döntés) mellé írj rövid magyarázatot — kommentben a kódban, vagy a `design.md`/`lessons.md`-ben, ha szélesebb kontextusú.
- A dokumentáció térjen ki: **cél** (mi a probléma, amit megold), **architektúra** (hogyan illeszkedik a többi részhez), **függőségek** (mitől függ, mi függ tőle), **trade-off-ok** (milyen alternatívát vetettünk el és miért), **teljesítmény szempontok** (ha relevánsak), **komplex algoritmus** magyarázata (pl. bezier-alapú profil interpoláció logikája).
- Ne írj dokumentációt olyan dolgokról, amik a kódból (jó névadással) magától értetődőek — a dokumentáció a *nem nyilvánvaló* részekre koncentráljon.

## AI asszisztens szabályok

Ez a szekció kifejezetten az AI-asszisztensek (Claude Code és hasonló eszközök) számára szól, amikor ezen a kódbázison dolgoznak:

- **Ne vezess be szükségtelen dependency-t** — nézd meg előbb, mi van a `package.json`-ban, és csak akkor javasolj újat, ha a meglévő eszközök ténylegesen nem elegendőek, és ezt explicit indokold.
- **Ne írd át az architektúrát ok nélkül** — egy bugfix vagy kis feature nem indok egy nagyobb refaktorra; ha egy refaktor mégis indokolt, jelezd külön, és kérj megerősítést, mielőtt nagy felületen változtatsz.
- **Preferáld a meglévő projekt-mintákat** az általános "best practice" felett, ha a kettő ütközik — pl. natív controlled input a projektben konzisztens minta, ne cseréld le React Hook Formra egyetlen form módosítás kapcsán.
- **Tartsd a konzisztenciát**: kövesd a meglévő elnevezési, fájlszervezési és stílus-mintákat (lásd [Kódstílus](#kódstílus)).
- **Kerüld a duplikált logikát** — mielőtt új util/komponens/hook-ot írnál, keress rá, van-e már hasonló.
- **Preferáld az újrahasználható absztrakciót**, de ne túltervezz (overengineering) — három hasonló, de egyszerű sor gyakran jobb, mint egy korai, rossz absztrakció.
- **Ne optimalizálj bizonyíték nélkül** — teljesítmény-módosítást csak mért probléma alapján javasolj.
- **Tartsd tiszteletben az akadálymentességet** minden UI változtatásnál (lásd [Akadálymentesség](#akadálymentesség)).
- **Tartsd tiszteletben a TypeScript strictséget** — sose vezess be `any`-t vagy `@ts-ignore`-t a hiba megkerülésére, oldd meg a típushibát a gyökerénél.
- **Olvasható, karbantartható, tesztelhető kódot generálj** — még akkor is, ha jelenleg nincs teszt infrastruktúra, a kód legyen olyan szerkezetű (tiszta függvények, elválasztott logika), hogy később tesztelhető legyen.
- **Magyarázd el a trade-off-okat**, amikor architekturális döntést hozol (pl. "ezt a state-et Context helyett prop-drillinggel oldom meg, mert csak 2 szinten megy át").
- **Ha több megoldás is létezik, a legegyszerűbb, karbantartható megoldást válaszd.**

## Code review checklist

- [ ] A komponens/függvény egy felelősséget lát el?
- [ ] Az üzleti logika el van választva a UI/renderelési kódtól?
- [ ] A kód újrahasználható, ahol ez értelmes elvárás?
- [ ] Van benne felesleges duplikáció egy már létező util/komponenshez képest?
- [ ] A típusok helyesek, nincs indokolatlan `any`?
- [ ] Az akadálymentességi alapok (szemantikus HTML, fókusz, label) megvannak?
- [ ] A teljesítmény elfogadható (nincs nyilvánvaló, mért probléma)?
- [ ] Three.js kódnál: geometria/anyag/textúra újrafelhasználva, nem újraallokálva minden frame-ben?
- [ ] Three.js kódnál: GPU erőforrások (`geometry`/`material`/`texture`/`renderer`) unmountkor `dispose()`-olva vannak?
- [ ] Az animation loop (`requestAnimationFrame`) könnyű, nincs benne felesleges allokáció?
- [ ] Az elnevezés konzisztens a projekt meglévő mintáival?
- [ ] Egy másik fejlesztő (vagy AI) fél év múlva is meg fogja érteni ezt a kódot magyarázat nélkül?

## Anti-patterns

Ezeket kerüld:

- Óriás, sok felelősségű komponens (300+ sor, kevert logika).
- Üzleti logika közvetlenül a JSX-be ágyazva (komplex feltétel/számítás inline a render-ben).
- Mély prop drilling (3+ szinten átmenő prop csak azért, hogy egy mélyen fekvő komponenshez eljusson).
- Túlzott Context-használat gyakran változó értékekhez (feleslegesen sok re-render).
- Egymásba ágyazott ternary operátorok (2-nél mélyebb) — helyette korai return vagy külön változó/függvény.
- Mágikus számok/stringek magyarázat és névvel ellátott konstans nélkül.
- Duplikált util függvény, ahol már van meglévő megoldás `src/lib/`-ben.
- Korai/feltételezésen alapuló optimalizálás mérés nélkül.
- Új geometria/anyag/textúra létrehozása minden render/frame alkalmával Three.js-ben.
- Vektor/matrix objektum allokálása az animation loopban (`requestAnimationFrame`/`useFrame`-szerű ciklusban).
- Minden asset betöltése az alkalmazás indulásakor, ahelyett hogy csak a szükséges pillanatban (route/feature belépéskor) töltenénk.
- shadcn generált komponens belső fájljának közvetlen módosítása.
- `any` típus használata a típushiba megkerülésére.
- Akadálymentesség figyelmen kívül hagyása (pl. `<div onClick>` gomb helyett, hiányzó `label`).
- Szerver state és UI state összekeverése egyetlen state objektumban (pl. betöltött adat és "panel nyitva" flag egy state-ben).
- Új dependency bevezetése "iparági standard" hivatkozással, tényleges szükség igazolása nélkül.

## Projekt cél

A cél egy karbantartható, skálázható, jó teljesítményű, akadálymentes, erősen típusos, moduláris kódbázis, amit emberi fejlesztők és AI asszisztensek egyaránt könnyen megértenek és bővítenek — évekre visszamenőleg és évekre előre is.
