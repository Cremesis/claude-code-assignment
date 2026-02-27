# docker-build

Restarts the PostgreSQL Docker service (the only service still running in Docker).

## When to use

Only needed when:
- The `db` container needs to be restarted or recreated
- Upgrading the postgres image version

## Instructions

```bash
docker compose down
docker compose up -d
```

## Notes

- `postgres_data` volume is always preserved (never use `down -v`).
- Rails and JS run locally — no image to rebuild.
