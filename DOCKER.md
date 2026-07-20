# Local Docker development

Start the frontend, API, and a fresh local Postgres database:

```powershell
docker compose up --build
```

- Frontend: http://localhost:3000
- API health check: http://localhost:4000/api/health
- Postgres: localhost:5432 (`ifnbl` / `ifnbl`)

The database initializes all SQL files in `backend/src/db/migrations` only the
first time its Docker volume is created. To completely reset local data:

```powershell
docker compose down -v
docker compose up --build
```

To import the Season 5 JSON data after the stack is running:

```powershell
docker compose exec backend npm run import:json
```

To replace local data with a snapshot of the production Railway database, run
this from PowerShell (it overwrites only local Docker Postgres data):

```powershell
$productionDatabaseUrl = (Get-Content backend/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
$env:PRODUCTION_DATABASE_URL = $productionDatabaseUrl
docker compose --profile tools run --rm db-sync
Remove-Item Env:PRODUCTION_DATABASE_URL
```

This setup is for local development. Continue deploying the frontend with the
existing `npm run deploy` command; Docker does not change GitHub Pages.
