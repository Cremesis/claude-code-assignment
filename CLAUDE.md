# Claude Code - Project Notes

## Stack
- Rails 8.1, Ruby 3.4.2
- PostgreSQL 16 (Docker only)
- React 19 + esbuild (jsbundling-rails), Tailwind via CDN

## Development setup

PostgreSQL runs in Docker; Rails and JS run locally.

### Start the database

```bash
docker compose up -d
```

### Start Rails + JS (two terminals, or use foreman)

```bash
bin/dev          # starts both web and js via Procfile.dev
```

Or manually:

```bash
bundle exec rails server          # terminal 1
yarn build --watch                # terminal 2
```

### One-off commands

```bash
bundle exec rails g model Task title:string
bundle exec rails db:migrate
bundle exec rails console
```

> **Note**: use `bundle exec rails` (not bare `rails`).

## Environment / database

- DB connects to `localhost:5432` (Docker postgres), user/pass: `postgres`/`postgres`
- No `DATABASE_URL` — Rails uses `config/database.yml`:
  - development → `claude_code_assignment_development`
  - test        → `claude_code_assignment_test`
  - production  → `claude_code_assignment_production`

---

## Project skills

Skills live in `.claude/commands/<name>.md` and are invoked with `/<name>` in Claude Code.

Claude manages skills autonomously: create and update them proactively as the project grows, without waiting for the user to ask.

### Conventions
- **Single responsibility**: each skill covers one domain (models, migrations, API, tests, etc.)
- **File**: kebab-case name, e.g. `.claude/commands/db-migrate.md`
- **Structure**: H1 title → description → imperative instructions → notes/examples
- **Use `$ARGUMENTS`** for variable parameters
- **Update this section** every time a skill is created or modified

### Available skills
| Skill | Scope |
|-------|-------|
| `/test` | Runs the full test suite locally |
| `/docker-build` | Restart the PostgreSQL Docker service |
| `/db-migrate` | Run pending migrations locally |
| `/generate-model` | Generate a Rails model + migration and run it |
| `/api-reference` | JSON endpoint reference (Tasks + Comments) and business rules |
| `/seed-db` | Populate or fully reset the database with sample data |
