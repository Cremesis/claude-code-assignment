# seed-db

Populates the database with sample data or resets it completely.

## Seed sample data

```bash
bundle exec rails db:seed
```

## Full reset (drop → create → migrate → seed)

```bash
bundle exec rails db:reset
```

## Drop + create + migrate only (no seed)

```bash
bundle exec rails db:drop db:create db:migrate
```

## Notes

- The seed file is `db/seeds.rb`.
- `db:reset` is equivalent to `db:drop` + `db:setup` (create + migrate + seed).
- In case of environment check errors add `DISABLE_DATABASE_ENVIRONMENT_CHECK=1`:
  ```bash
  DISABLE_DATABASE_ENVIRONMENT_CHECK=1 bundle exec rails db:reset
  ```
- Valid task statuses in seeds: `todo`, `in_progress`, `done`.
- Status can only advance (model constraint): set the final status directly in seeds rather than updating it progressively.
