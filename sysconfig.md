# System Configuration

`System-Configuration.json` is the single, declarative description of **every user-editable
parameter in Propeller**: what it is called, what type it has, which unit it carries, which
input group it belongs to, what its bounds and defaults are, and under what conditions it
becomes visible / fixed / optional.

Nothing about these parameters is hard-coded in the backend or in the frontend. The backend
loads the file once at Django startup, validates it, and serves it over `GET /sysconfig/`;
the Angular app builds its whole parameter editor UI from that response. Adding a new input
field to the application is — in the normal case — a JSON edit, not a code change.

The companion file `System-Configuration-Schema.json` (JSON Schema draft 2020-12) describes
the allowed shape of the configuration file.

| File | Purpose |
|---|---|
| `System-Configuration.json` | The configuration itself (repo root) |
| `System-Configuration-Schema.json` | JSON Schema used to validate it (repo root) |
| `backend/propeller/settings.py:280-281` | `SYSTEM_CONFIGURATION_FILE` / `SYSTEM_CONFIGURATION_SCHEMA` paths |

---

## 1. Lifecycle — from file to browser

```
System-Configuration.json
  │
  │  Django startup: DashboardConfig.ready()            backend/dashboard/apps.py:23
  ▼
SystemConfigurationHandler.load()                        backend/interface/system_configuration_handler/
  │   1. json.load()
  │   2. SystemConfigurationSerializer(data=..., validators=[JSONSchemaValidator])
  │   3. is_valid(raise_exception=True)   → DRF field parsing, defaults, cross-reference checks
  │   4. serializer.create()              → dataclass tree (SystemConfiguration)
  ▼
SystemConfiguration dataclass                            backend/dashboard/system_configuration.py
  │   __post_init__ also derives:
  │     • dependency_graph
  │     • dependency_parameters
  │
  ├── consumed in-process by SetupManager, SysConfigParameterValidator, view mixins
  │
  ▼  GET /sysconfig/?project=<id>&material=<id>          backend/dashboard/views/gui.py
DependencyResolver(sysconfig, context).resolve()         backend/interface/dependency_resolver/
  │   evaluates conditions against the current project / material values
  │   and rewrites value / fixed / minimum / maximum / optional / active in a *copy*
  ▼
SystemConfigurationSerializer(instance=resolved).data    (JSON response)
  │
  ▼  Angular
SysConfigService → TokenStorageService cache → Configuration wrapper → Settings/SettingGroup/SettingParameter
```

The handler instance lives on the Django app config and is reachable anywhere via
`dashboard.get_system_configuration_handler()`. The file is read **once**; editing it
requires a backend restart.

---

## 2. Anatomy of `System-Configuration.json`

The root object has six keys. `units`, `parameters`, `quantities` and `configuration` are
required; `expressions` and `dependencies` are optional. No other root key is allowed.

```jsonc
{
  "units":         [ ... ],   // required — physical units and their conversions
  "parameters":    [ ... ],   // required — the parameter *dictionary* (type, name, unit, options)
  "quantities":    [ ... ],   // required — named quantities bound to a unit group
  "expressions":   [ ... ],   // optional — reusable named formulas
  "dependencies":  [ ... ],   // optional — condition → effect rules
  "configuration": { ... }    // required — which parameters appear where, with which bounds
}
```

The mental model is a **dictionary + a layout**:

* `parameters` defines *what a parameter is* — global, context-free (`density` is a float in
  `kg/m^3` named "Density").
* `configuration` defines *where it is used and how it behaves there* — a `reference` into the
  dictionary plus per-placement overrides (`minimum`, `value`, `optional`, `dependencies`, …).

The same parameter can therefore be referenced from several settings blocks with different
bounds, but **only once per settings block** (enforced by `SettingsSerializer.validate`).

---

### 2.1 `units`

```jsonc
{"id": "mm",  "symbol": "mm", "name": "millimeter", "group": "distance", "base_unit": true},
{"id": "in",  "symbol": "in", "name": "inch",       "group": "distance", "base_unit": false,
 "conversion_factor": 25.4},
{"id": "kelvin", "symbol": "K", "name": "kelvin",   "group": "temperature", "base_unit": false,
 "conversion_offset": -273.15},
{"id": "fahrenheit", "symbol": "°F", "name": "fahrenheit", "group": "temperature", "base_unit": false,
 "conversion_factor": 0.55556, "conversion_offset": -17.77778}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique key; referenced by `parameter.unit` |
| `symbol` | string | yes | Displayed next to the field label (may be `""`) |
| `name` | string | yes | Human readable name |
| `group` | string | yes | Unit group (`distance`, `stress`, `torque`, …) |
| `base_unit` | boolean | yes | Exactly one `true` per group |
| `conversion_factor` | number | conditional | Multiplier to the base unit |
| `conversion_offset` | number | conditional | Offset to the base unit |

Schema rules (`$defs/unit`):

* `base_unit: false` → **at least one** of `conversion_factor` / `conversion_offset` is required.
* `base_unit: true` → **neither** may be present.
* `additionalProperties: false`.

Extra rule enforced in code, not in the schema
(`SystemConfigurationSerializer.validate_units`): every group must have **exactly one** base
unit — zero base units or two base units in a group is a load error.

> Conversion values are currently *carried* to the client but the backend does no automatic
> conversion; stored values are always in the parameter's declared unit. Only
> `unit.symbol` is actively used server-side (report rendering, `dashboard/views/material.py:351`).

---

### 2.2 `parameters`

The global parameter dictionary. One entry per parameter id.

```jsonc
{"id": "density",        "type": "float",   "unit": "kgm3", "symbol": "rho", "name": "Density"},
{"id": "blade_number",   "type": "integer", "unit": "no_unit", "name": "Blade Number",
                         "description": "Number of blades defined for the propeller"},
{"id": "econ_debug",     "type": "boolean", "name": "Debug switch"},
{"id": "geometry_profile_file", "type": "file", "name": "File", "description": "Geometry profile file"},
{"id": "aero_correction", "type": "selection",
 "options": [{"id": "none", "name": "None"}, {"id": "prandtl", "name": "Prandtl"}],
 "name": "Aero Correction"},
{"id": "structural_method", "type": "multi_selection",
 "options": [{"id": "ply_failure", "name": "Ply failure"}, {"id": "fatigue", "name": "fatigue"}],
 "name": "Structural method"}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique; the target of every `reference` |
| `type` | enum | yes | `integer`, `float`, `boolean`, `string`, `selection`, `multi_selection`, `file` |
| `name` | string | yes | Label text (may be `""`) |
| `description` | string | no | Tooltip text |
| `unit` | string | conditional | Unit id — **required** for `float`/`integer`, **forbidden** otherwise |
| `symbol` | string | no | Formula symbol (`E11`, `nu12`); only allowed on `float`/`integer` |
| `options` | array | conditional | **Required** for `selection`/`multi_selection`, **forbidden** otherwise |

`options` items are `{"id": ..., "name": ...}` — both required, nothing else allowed by the
schema. (The DRF `OptionSerializer` would also accept `parameters` and the frontend would read
`description`, but the JSON Schema rejects both here — options with nested parameters exist
only inside `configuration.*.selection`.)

Cross-reference validation: every `unit` must exist in `units`
(`__validate_unit_references_in_parameters`), and `id` values must be unique.

**Type semantics** (`Parameter.parse_from_str`, `backend/dashboard/system_configuration.py:103`)
— values travel as strings everywhere, and are parsed on demand:

| type | Parsed with | Stored/transported as |
|---|---|---|
| `integer` | `int(value)` | `"12"` |
| `float` | `float(value)` | `"1.5"`, `"1e10"` |
| `boolean` | `strtobool(value)` | `"true"` / `"false"` (frontend also accepts `True`/`1`) |
| `selection` | no conversion | the option `id` |
| `multi_selection` | `value.split(",")`, empties dropped | `"ply_failure,fatigue"` |
| `string`, `file` | no conversion | as-is |

---

### 2.3 `quantities`

```jsonc
{ "id": "dummy_quantity", "name": "Dummy Quantity", "unit_group": "unitless" }
```

`id`, `name`, `unit_group` all required, nothing else allowed. `unit_group` must be a group
that appears in `units` (`__validate_unit_group_references_in_quantities`). Quantities name a
*dimension* rather than a concrete parameter; the frontend can resolve them with
`Configuration.findQuantityById` / `getQuantityName`.

---

### 2.4 Reference syntax: `#` and `$`

Two prefixes appear inside conditions, expressions and effect values
(`backend/dashboard/system_configuration.py:9-11`):

| Prefix | Form | Meaning |
|---|---|---|
| `#` | `#<settings_block>.<parameter_reference>` | The **current value** of that parameter |
| `$` | `$<expression_id>` | Substitute the named entry from `expressions` |

`#mechanical_properties.mech_prop_type` means "the value of `mech_prop_type` as stored on the
material currently being edited". The settings block part must be one of the seven keys of
`configuration`, and the parameter must actually be referenced somewhere in that block —
both are checked at load time.

The reference is matched with the regex `#\w*\.?\w*`, deliberately permissive so that
malformed references (`#`, `#reference_only`, `#parent.`) are *detected* and reported as
`'<value>' is a syntactically invalid parameter value reference` instead of silently ignored.

Value substitution at evaluation time (`DependencyResolver.__substitute_parameter_value_references`):

1. Look up the value in the request context (the project's `settings`, the material's
   `mechanical_properties` / `fatigue_properties`).
2. If not present there, fall back to the `value` declared on the parameter reference in
   `configuration` (the default).
3. If neither exists → `ParameterValueMissingError`, and the dependency is skipped.
4. `string` and `selection` values are quoted (`'ud_ply'`); everything else is parsed to its
   Python type before being spliced into the expression text.

---

### 2.5 `expressions`

Named, reusable formula strings. Optional block.

```jsonc
{"id": "shear_modulus_formula_material",
 "expression": "str(#mechanical_properties.elastic_modulus_11 / (2 * (1 + #mechanical_properties.poissons_ratio_12)))"}
```

Only `id` and `expression` are allowed; ids must be unique. The expression body is evaluated
with **asteval** (`Interpreter(use_numpy=False)`) after `#`-substitution, so it is a restricted
Python expression: arithmetic, comparisons, `and`/`or`/`not`, `in`, and builtins such as
`str()`, `bool()`, `float()`. Wrap numeric results in `str(...)` when the result is used as a
parameter `value`, because values are strings everywhere.

An expression is used by writing `$<id>` in a dependency `condition` or in an effect field.

---

### 2.6 `dependencies`

The conditional logic of the whole system. Optional block; each entry is
`{id, condition, effect}` — all three required.

```jsonc
{"id": "is_mech_prop_type_ud_ply",
 "condition": "#mechanical_properties.mech_prop_type == 'ud_ply'",
 "effect": {"active": true}},

{"id": "is_mech_prop_type_iso_ply_shear_modulus",
 "condition": "#mechanical_properties.mech_prop_type == 'iso_ply'",
 "effect": {"value": "$shear_modulus_formula_material", "fixed": true}},

{"id": "is_NOT_structural_method_fatigue",
 "condition": "not ('fatigue' in #project_settings.structural_method)",
 "effect": {"active": false}}
```

**`condition`** — either an inline expression or `$<expression_id>`. Evaluated to a boolean.
If evaluation raises (bad syntax, missing value, unparsable type), the dependency is **skipped**
and a warning is logged — it never breaks the response.

**`effect`** — at least one of these keys, nothing else:

| Key | Type | Effect when the condition holds |
|---|---|---|
| `active` | boolean or `$expr` | Field is rendered / hidden (`false` = removed from the editor) |
| `fixed` | boolean or `$expr` | Field is read-only; requires a `value` to display |
| `optional` | boolean or `$expr` | Field may be left empty |
| `value` | string | Sets the value (may itself contain `#` refs or `$expr`) |
| `minimum` | string | Lower bound |
| `maximum` | string | Upper bound |

Note the asymmetry enforced by the schema: `active`, `fixed` and `optional` accept a real
boolean **or** a string that starts with `$` (`$defs/boolean_or_expression`, pattern `^\$.*`);
`value`, `minimum`, `maximum` are plain strings.

**A dependency only fires where it is attached.** A dependency definition is inert until some
parameter reference lists its id in `dependencies`. This is why the same condition appears in
several dependency entries with different effects — the id encodes *condition + effect*, and
the parameter picks the pairing it wants. Example: `is_mech_prop_type_woven_ply` (`active: true`)
and `is_mech_prop_type_woven_ply_elastic_modulus` (`value: …, fixed: true`) share one condition.

When a parameter lists several dependencies, they are evaluated **in listed order** and every
matching one applies its effect; later effects overwrite earlier ones on the same key.

---

### 2.7 `configuration`

The layout. Exactly these seven blocks, all required, no others
(`$defs` mapping in the schema, mirrored by `ConfigurationSerializer`):

| Block | Where it appears in the app | Backing storage |
|---|---|---|
| `engine_settings` | Engine/profile page | — |
| `project_settings` | Project → Settings tab | `ProjectModel.settings` |
| `mechanical_properties` | Material editor | `MaterialModel.mechanical_properties` |
| `fatigue_properties` | Material editor | `MaterialModel.fatigue_properties` |
| `geometry_profiles` | Geometry → profile editor | `ProfileModel.parameters` |
| `geometry_settings` | Geometry editor | `GeometryModel.settings` |
| `composition_settings` | Composition editor | `CompositionModel.settings` |

Each block is a `settings` object with at least one of:

```jsonc
"project_settings": {
  "parameters": [ ... ],       // ungrouped, rendered at the top
  "groups":     [ ... ]        // named boxes, each with its own parameter list
}
```

`geometry_profiles` is special (`settings_with_selection`): it **requires** a `selection`
and may additionally have `parameters` / `groups`.

#### Parameter reference objects

The items of `parameters` (`$defs/parameter_references`):

```jsonc
{"reference": "miner_exponent", "minimum": "0.000001", "maximum": "100.0", "value": "1.0",
 "active": false,
 "dependencies": ["is_analysis_method_structural", "is_NOT_structural_method_fatigue"]}
```

| Field | Type | Default (DRF) | Meaning |
|---|---|---|---|
| `reference` | string | **required** | Id of an entry in the root `parameters` list |
| `value` | string | — | Default value; **required** whenever `fixed: true` |
| `minimum` | string | — | Lower bound (string, parsed with the parameter's type) |
| `maximum` | string | — | Upper bound |
| `fixed` | boolean | `false` | Read-only in the UI, enforced server-side too |
| `optional` | boolean | `false` | May be left empty |
| `active` | boolean | `true` | `false` → not rendered at all |
| `dependencies` | string[] | — | Ids from the root `dependencies` list; must be unique |

Everything except `reference` is optional and `additionalProperties: false` applies.
The typical pattern for a conditionally shown field is `"active": false` plus a dependency
whose effect is `{"active": true}` — hidden by default, revealed when the condition matches.

#### Groups

```jsonc
{"id": "stress_limits_group", "name": "Stress Limits",
 "parameters": [ {"reference": "tens_strength_11", "minimum": "0.000001", "optional": true} ]}
```

`id`, `name` and `parameters` are all **required** for a group (`$defs/options_with_parameters`),
and `parameters` must be non-empty. Group `id`s must be unique within the block.

#### Selection (`geometry_profiles`)

A `selection` renders a dropdown whose chosen option determines which parameters appear:

```jsonc
"geometry_profiles": {
  "selection": {
    "id": "type", "name": "Type",
    "options": [
      {"id": "csv", "name": "CSV", "description": "CSV file",
       "parameters": [ {"reference": "geometry_profile_file"} ]},
      {"id": "naca_4_digit", "name": "NACA 4 digit",
       "parameters": [
         {"reference": "max_camber",          "minimum": "0", "maximum": "100", "value": 20},
         {"reference": "max_camber_position", "minimum": "0", "maximum": "100", "value": 100},
         {"reference": "max_thickness",       "minimum": "0", "maximum": "100", "value": 40}
       ]}
    ]
  }
}
```

The selection itself is stored as a parameter value under the selection's `id`
(`{"reference": "type", "value": "naca_4_digit"}`), followed by the chosen option's parameters.
Selections can be nested — an option may itself contain a `selection` in the frontend model
(`SettingSelection`, `SettingOption`), which is how multi-level pickers are built.

---

## 3. Validation — three layers, in this order

`SystemConfigurationHandler.load()` wraps everything; any failure raises `LoadError` and the
backend refuses to start with a logged reason.

**Layer 1 — DRF field parsing (`to_internal_value`).** Types are coerced (`CharField` turns
`20` into `"20"`), unknown keys are dropped, and defaults are injected
(`fixed=False`, `optional=False`, `active=True`).

**Layer 2 — JSON Schema.** `JSONSchemaValidator(SYSTEM_CONFIGURATION_SCHEMA)` is passed as a
serializer-level validator, so DRF runs it on the **normalized** data from layer 1, not on the
raw file text.

> **Consequence worth knowing:** the shipped `System-Configuration.json` does *not* validate
> cleanly if you run the schema against the raw file — there are six findings, e.g. a stray
> space in the key `" value"` (`project_settings.groups[3].parameters[2]`), numeric instead of
> string `value`s in the NACA option, `minimum: 1e-06` as a number in `composition_settings`,
> and a `description` on the `csv` selection option that `options_with_parameters` forbids.
> DRF's coercion and unknown-key dropping erase all six before the schema sees the data, so the
> file loads fine. If you validate the file directly (IDE schema binding, CI lint), expect those
> errors, and be aware the stray-space keys are silently *ignored*, not applied.

**Layer 3 — cross-reference validation** (`SystemConfigurationSerializer.validate`), which the
schema cannot express:

| Check | Error message shape |
|---|---|
| Exactly one base unit per unit group | `Multiple base units in group '<g>'` / `No base units in group(s) [...]` |
| `parameter.unit` exists in `units` | `Unit '<u>' referenced in parameter '<p>' missing from units` |
| `quantity.unit_group` exists | `Unit group '<g>' referenced in quantity '<q>' missing from units` |
| `$expr` in a condition exists | `Expression '<e>' referenced in condition of dependency '<d>' is missing from expressions.` |
| `$expr` in an effect exists | `Expression '<e>' referenced in '<field>' field of the effect of dependency '<d>' …` |
| `#a.b` is well-formed | `'<v>' is a syntactically invalid parameter value reference` |
| `#a.b` — `a` is a real settings block | `Parameter value reference '<b>' referenced in '<id>' from non-existent parent '<a>'` |
| `#a.b` — `b` is used in that block | `Parameter value reference '<b>' referenced in '<id>' not found in 'configuration.<a>'` |
| `reference` exists in `parameters` | `Parameter '<r>' referenced in object '<i>' of configuration.<s>.parameters is missing from parameters.` |
| `dependencies` entry exists | `Dependency '<d>' referenced in … is missing from dependencies.` |
| Unique `id` / `reference` per list | `Non unique values for field '<f>' in '<Serializer>'` |
| No duplicate `reference` across `parameters` + `groups` of one block | `Non unique values for field 'reference' in 'groups' and/or 'parameters'` |

---

## 4. Backend interface

### 4.1 `SystemConfigurationHandler`

`backend/interface/system_configuration_handler/` — the only thing that reads the file.
Interface (`system_configuration_handler_interface.py`):

| Method | Returns / raises |
|---|---|
| `load(filename=None)` | Loads + validates; `LoadError` on any failure. `None` → `settings.SYSTEM_CONFIGURATION_FILE` |
| `get_system_configuration()` | The `SystemConfiguration` dataclass; `UninitializedError` if not loaded |
| `get_unit(unit_id)` | `Unit`; `ObjectNotFoundError` if missing |
| `get_parameter(parameter_id)` | `Parameter`; `ObjectNotFoundError` if missing |

Instantiated once in `DashboardConfig.ready()` and reachable from anywhere with
`from dashboard import get_system_configuration_handler`.

### 4.2 Derived structures: `dependency_graph` and `dependency_parameters`

Built in `SystemConfiguration.__post_init__`.

`dependency_graph` maps **independent → dependents**:

```python
{
  "mechanical_properties.mech_prop_type": {
      "mechanical_properties.elastic_modulus_22",
      "mechanical_properties.shear_strength_13", ...
  },
  "project_settings.analysis_method": { "project_settings.eigen_modes", ... },
}
```

It is assembled by scanning every parameter reference that has `dependencies`, pulling the
`#`-references out of each dependency's `condition` **and** every effect field (expanding
`$expr` first), and inverting the relation.

`dependency_parameters` is the per-block list of graph *keys* — the parameters that other
parameters depend on. It is serialized into the API response (`DependencyParametersSerializer`)
so the frontend knows which inputs must trigger a config refresh. For the current file it is:

```
project_settings:       analysis_method, structural_method
mechanical_properties:  mech_prop_type, elastic_modulus_11, poissons_ratio_12, poissons_ratio_13,
                        shear_modulus_13, shear_strength_12, shear_strength_13, tens_strength_11,
                        tens_strength_33, compr_strength_11, compr_fail_strain_11,
                        tens_fail_strain_11, shear_fail_strain_12, shear_fail_strain_13
```

### 4.3 `DependencyResolver`

`backend/interface/dependency_resolver/dependency_resolver.py`. Deep-copies the configuration,
evaluates each attached dependency against a context, and writes the resulting effects onto the
copy — so the client receives a configuration already tailored to the record being edited.

Context sources, resolved in `__get_context_parameter_values`:

* `project` query param → `ProjectModel.settings` → `#project_settings.*`
* `material` query param → `MaterialModel.mechanical_properties` / `.fatigue_properties`
* Records are looked up in the **Django cache first** (key `"{user_id}_{project|material}_{pk}"`),
  falling back to the database. The cache is what makes unsaved, in-progress edits visible to
  the resolver (see the `Temporary-Edit` flow below).

> **Scope limitation:** `resolve()` currently walks only `mechanical_properties`,
> `fatigue_properties` and `project_settings`. Dependencies attached inside `engine_settings`,
> `geometry_settings`, `geometry_profiles` or `composition_settings` are carried in the response
> but never evaluated.

### 4.4 API endpoint

`GET /api/v1/sysconfig/` — `SysConfigView`, `backend/dashboard/views/gui.py`, authenticated
(`propeller/urls.py:26`).

```
GET api/v1/sysconfig/                 → configuration with defaults only
GET api/v1/sysconfig/?project=<uuid>  → dependencies resolved against that project
GET api/v1/sysconfig/?material=<id>   → dependencies resolved against that material
```

The response is the whole configuration, re-serialized. Because every serializer inherits
`OptionalSerializer`, **keys whose value is `None` are omitted** — so absent optional fields
simply do not appear in the JSON, and the frontend must treat "missing" as "default".

### 4.5 Server-side value validation

`SysConfigParameterValidator` (`backend/dashboard/validators/sysconfig_parameter_validator.py`)
validates submitted values against the *resolved* configuration, so the same rules the UI shows
are the rules the API enforces:

* required (`optional` false and no default) → `Missing required value`
* unparsable for the declared type → `Invalid value type for <type>`
* `fixed: true` and value ≠ the fixed value → `Value differs from fixed setting`
* `selection` / `multi_selection` value not among `options` → `Invalid selection option`
* numeric out of `minimum` / `maximum` → `Value below minimum` / `Value above maximum`

It is used by `material_validator.py` (mechanical + fatigue properties) and
`geometry_validator.py` (geometry settings and each profile's selection option).
Group parameters are only required when the group is listed in
`required_groups`; values supplied for a non-required group are still type/bound checked.

### 4.6 Feeding the calculation

`SetupManager` (`backend/interface/setup_manager/setup_manager.py`) converts the stored
`[{reference, value}]` string lists into typed Python values via
`sysconfig_handler.get_parameter(name).parse_from_str(value)` when it assembles the setup for a
run. An unknown `reference` raises `SysconfigObjectNotFoundException`; a bad value raises
`ParameterConversionFailedException` (empty string is tolerated and becomes `None`).

Reports use `get_parameter(...).name` and `get_unit(...).symbol` to render human-readable
labels (`backend/dashboard/views/material.py:336-355`).

---

## 5. How values are stored

Every settings-bearing model keeps a JSON **array of reference/value pairs**, validated by
`parameters_list_schema` (`backend/dashboard/__init__.py:11`):

```json
[
  {"reference": "analysis_method", "value": "modal_rpm_aero"},
  {"reference": "eigen_modes",     "value": "6"},
  {"reference": "structural_method", "value": "ply_failure,fatigue"}
]
```

Both fields are **strings**, both are required, and no other key is allowed. Models using it:
`ProjectModel.settings`, `MaterialModel.mechanical_properties` / `.fatigue_properties`,
`GeometryModel.settings`, `ProfileModel.parameters`, `CompositionModel.settings`.

There is no foreign key to the configuration — the coupling is by `reference` string only.
Renaming a parameter `id` therefore orphans existing rows.

---

## 6. Frontend interface

### 6.1 Fetch and cache

```
SysConfigService.getSysConfig()          frontend/src/app/shared/services/sys-config.service.ts
  → TokenStorageService.getSysConfig()   localStorage key 'system-config'
  → else GET "sysconfig"                 and cache the result there
```

The cache is only cleared by `TokenStorageService.signOut()` (`window.localStorage.clear()`).

Context-free config is cached; **context-sensitive config is not**. A page bound to a record
bypasses the cache explicitly, e.g.
`sendRawRequest("sysconfig/?project=" + this.projectId, 'GET')`
(`project-base.component.ts:619`).

### 6.2 The `Configuration` wrapper

`frontend/src/app/shared/modules/system-configuration/system-configuration.module.ts` wraps the
raw JSON with lookups used everywhere else:

| Method | Purpose |
|---|---|
| `findInConfiguration(block)` | The `configuration.<block>` object |
| `findParameterById(id)` | Dictionary entry from the root `parameters` |
| `findUnitById(id)` / `findQuantityById(id)` | Unit / quantity entry |
| `getDependencyParameters(block)` | The `dependency_parameters[block]` list (empty when absent) |
| `findOptionName(ref, value)` | Option `id` → display `name` |
| `findNestedObj` / `findAllNestedObj` / … | Generic deep lookups by key/value |

### 6.3 Building the editor

`frontend/src/app/shared/modules/parameter-editor/models/` mirrors the JSON structure:

```
Settings          ← configuration.<block>       (one editor)
 ├ groups[]       ← .groups        → SettingGroup
 ├ parameters[]   ← .parameters    → SettingParameter
 └ selection      ← .selection     → SettingSelection → SettingOption
```

`Settings` is constructed with an `EditorType` (`Grouping`, `Simple`, `Selection`) that decides
which of the three is rendered. Two rules matter:

* **`active !== false` filters the field out entirely** — both for top-level parameters
  (`settings.ts:330`) and inside groups (`settingGroup.ts:18`). Since the backend already
  resolved dependencies, "hidden" is simply "not in the list".
* **`SettingParameter.initializeFromConfiguration` merges the two layers**: anything not given
  on the placement (`name`, `type`, `description`, `options`, `unit`, `value`) is inherited from
  the dictionary entry, and `unit_symbol` is resolved from `units`. Defaults are then applied per
  type — `boolean` → `false`, `selection` → the first option, `multi_selection` → the split
  default value.

Client-side checks in `SettingParameter.checkParameter()` mirror the server rules: `fixed`
snaps the value back to the default, empty + not `optional` → `RequiredError`, `integer`
non-integrality → `IntegerTypeError`, and `minimum`/`maximum` → `MinimumError`/`MaximumError`.
Labels get the unit symbol appended for numeric types and a `*` for required fields
(`getLabelText`).

### 6.4 The dependency round-trip

This is the mechanism that makes conditional fields work while editing an unsaved record:

```
user edits a parameter that is in dependency_parameters
  → SettingParameter.isDependencyParameter === true
  → parameter-input emits dependencyParameterChanged
  → PUT project/<id>/settings/  with header  Temporary-Edit: True
        backend: TemporaryUpdateMixin.perform_update  (dashboard/views/utils.py:330)
          • writes the instance to the cache, NOT the database
          • diffs old vs new values → changed parameters
          • walks dependency_graph → responds {"update_needed": true|false}
  → if update_needed: GET sysconfig/?project=<id>
        backend: DependencyResolver reads the *cached* instance → resolved config
  → Settings.updateConfiguration(newConfig, false)
        rebuilds groups/parameters, then re-applies the user's current values
  → focus is restored on the field the user was editing
  → on error: parameter.restoreDependencyParameterValue() rolls the input back
```

`update_needed` is deliberately narrow (`_has_affected_parameter_in_the_same_place`): it returns
`true` only when a changed parameter affects, directly or transitively, a parameter **in the
same settings block**. Cross-block effects do not trigger a refetch of that editor.

A normal save is the same `PUT` with `Temporary-Edit: False`, which deletes the cache entry and
writes to the database.

---

## 7. Adding or changing a parameter — checklist

1. **Dictionary entry** in root `parameters`: unique `id`, `type`, `name`; `unit` if numeric
   (and the unit must exist in `units`); `options` if it is a selection.
2. **Placement** in the right `configuration.<block>`, in `parameters` or inside a group:
   `{"reference": "<id>", ...}` with the bounds/defaults you want. Do not reference the same
   parameter twice in one block.
3. **Conditional behaviour** (optional): add a `dependencies` entry with the `condition`/`effect`
   pair, list its id on the parameter reference, and start the parameter as `"active": false` if
   it should be hidden until the condition matches. Reusable formulas go in `expressions` and are
   referenced as `$id`.
4. If the condition reads another parameter, make sure that parameter is actually referenced in
   the block named in the `#block.name` reference, otherwise the load fails.
5. **Restart the backend** — the file is read once at startup.
6. **Clear the frontend sysconfig cache** — log out, or drop the `system-config` key from
   localStorage — otherwise the client keeps serving the previous version.
7. Consumers that need the typed value (`SetupManager`, calculation, reports) pick it up
   automatically via `get_parameter(...).parse_from_str(...)`; only genuinely new *behaviour*
   needs code.

Tests to run afterwards, from `backend/`:

```bash
./venv/Scripts/python.exe manage.py test dashboard.test.test_system_configuration
./venv/Scripts/python.exe manage.py test interface.test.test_system_configuration_handler
./venv/Scripts/python.exe manage.py test interface.test.test_dependency_resolver
```

---

## 8. Gotchas

* **Everything is a string.** `value`, `minimum`, `maximum` are strings even for numbers
  (`"1e10"`, `"0.000001"`). Writing `20` instead of `"20"` happens to work because DRF coerces
  it, but it fails a direct schema check.
* **`fixed: true` without `value` is a schema error** (`$defs/parameter_references` if/then).
* **`active: false` is not "disabled", it is "gone."** The frontend never renders it, and no
  value is submitted for it.
* **A dependency id encodes condition *and* effect.** To apply two different effects under the
  same condition, you need two dependency entries.
* **Dependency effects are only resolved for three blocks** (§4.3). Attaching dependencies to
  geometry/composition/engine parameters currently has no runtime effect.
* **Failed conditions fail silently.** A typo in a condition means the dependency never fires;
  look for `Skipping dependency <id> because of invalid condition` in the backend log rather
  than expecting an error response.
* **The config is loaded once.** Editing the JSON while the server runs changes nothing until
  restart — and the browser may still hold a cached copy on top of that.
* **Renaming a parameter `id` orphans stored values**, because records reference parameters by
  string only. Existing `[{reference, value}]` rows keep the old name and silently stop matching.
* **`configuration` may not gain or lose blocks.** The seven keys are required and
  `additionalProperties: false` on both the schema and `ConfigurationSerializer`.
