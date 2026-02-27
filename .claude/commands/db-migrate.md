# db-migrate

Runs pending migrations against the local database.

## Instructions

```bash
bundle exec rails db:migrate
```

## Notes

- Generate a migration: `bundle exec rails g migration $ARGUMENTS`
- Rollback last step: `bundle exec rails db:rollback`
- Migration status: `bundle exec rails db:migrate:status`
