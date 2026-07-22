# IFNBL

<p align="center">
  <a href="https://ifnbl.com">
    <img src="docs/standings.png" alt="Live IFNBL standings" width="820">
  </a>
</p>

<p align="center">
  <b><a href="https://ifnbl.com">ifnbl.com</a></b> — live standings, schedule, rosters, and box scores
</p>

---

The IFN Basketball League site is the public home for a recreational basketball league: a React front end deployed to `ifnbl.com` backed by an Express + Postgres API. It serves live standings, the weekly schedule, team rosters, player profiles with box-score stat lines, and an auto-resolving playoff bracket. Standings are computed on the fly from finalized game scores; player statistics are aggregated from per-game box scores that span three seasons of hand-kept records. An admin surface lets scorekeepers finalize games and push live score updates over WebSockets.

## Data pipeline

The hard part of this project isn't the UI — it's that three seasons of stats were recorded by hand, in different spreadsheets, by different people, with the schema drifting the whole way. The importer (`backend/src/db/seeds/import-json/importSeasons.js`) is a reconciliation layer that turns that inconsistent history into a clean, queryable Postgres model. It reads the season JSON, normalizes every stat row, and upserts seasons, teams, players, games, and per-game stat lines inside a single transaction.

**Inconsistent stat keys across seasons.** The same statistic shows up under different column names depending on who kept that season's book. A single `STAT_MAP` declares, per canonical database column, every alias a value might have appeared under, and `getStat()` resolves each field by trying those aliases in order:

```js
assists:       ["AST", "Assists", "assists"],
turnovers:     ["TOs", "Turnovers", "turnovers"],
steals_blocks: ["STLS/BLKS", "STL/BLK", "stocks"],
```

New spelling in a future season? Add one alias to the map — every downstream query keeps reading a single canonical column. Every extracted value is coerced through `toNonNegativeInt()`, so blanks, nulls, and garbage collapse to `0` rather than propagating `NaN` into aggregates.

**Recomputing field goals from shot splits.** Total field goals are the least trustworthy hand-tallied number, because a scorekeeper has to remember to add the twos and threes together. So when a row carries a 2PT/3PT breakdown, the importer treats the splits as the source of truth and recomputes the totals rather than trusting the recorded FG line:

```js
if (hasShotBreakdown && stats.fgm !== stats.two_pm + stats.three_pm) {
  stats.fgm = stats.two_pm + stats.three_pm;      // makes  = 2PM + 3PM
}
if (hasShotBreakdown && stats.fga < stats.two_pa + stats.three_pa) {
  stats.fga = stats.two_pa + stats.three_pa;      // attempts >= 2PA + 3PA
}
```

**Clamping makes to attempts.** Box scores contain impossible lines — more makes than attempts — because makes and attempts were entered in separate passes. Rather than reject the row, the importer enforces the invariant that you can't make more than you took, per shot type and for the field-goal total, so no downstream percentage can ever exceed 100%:

```js
if (stats.two_pm   > stats.two_pa)   stats.two_pa = stats.two_pm;
if (stats.three_pm > stats.three_pa) stats.three_pa = stats.three_pm;
if (stats.ftm      > stats.fta)      stats.fta = stats.ftm;
if (stats.fgm      > stats.fga)      stats.fga = stats.fgm;
```

**Audit logging.** Silent correction is dangerous — a fix that's really a data-entry bug should be seen, not swallowed. So `normalizeStats()` snapshots each row *before* and *after* reconciliation and, whenever the two differ, emits a structured warning identifying exactly which line was touched and how:

```
Corrected stat row | season=szn4 | week=3 | game=week3-game2 | team=... | player=... |
  before={"fgm":5,"fga":4,...} | after={"fgm":5,"fga":5,...}
```

Every automated edit is traceable back to a specific season / week / game / team / player, so a run's log is a diff of what the reconciler had to change — a fast way to spot a systemic scoring error rather than hiding it behind a clean import.

> **Note:** the importer is destructive by design. `resetSeasonData()` deletes each season's games and teams before re-importing, so the JSON files are the single source of truth — never run `import:json` to patch a live-scored production database. See `backend/package.json` for the `import:json` and `seed:playoffs` scripts.

## Stack

- **Frontend:** React 19, React Router, MUI, `socket.io-client` for live scores — deployed to `ifnbl.com` via `gh-pages`.
- **Backend:** Express, Postgres (`pg`), JWT-authenticated admin routes, Socket.IO for live score broadcast.
- **Data:** season JSON → `npm run import:json` (reconciliation + upsert) → Postgres → public read APIs (`/standings`, `/schedule`, `/teams`, …).
- **Dev:** Docker Compose for local Postgres + API + frontend — see [DOCKER.md](DOCKER.md).
