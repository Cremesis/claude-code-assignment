# generate-model

Generates a new Rails model with migration and migrates the database.

## Instructions

Replace `$ARGUMENTS` with `ModelName field:type ...` (e.g. `Tag name:string color:string`):

```bash
bundle exec rails g model $ARGUMENTS
bundle exec rails db:migrate
```

To generate a migration only (no model):

```bash
bundle exec rails g migration $ARGUMENTS
bundle exec rails db:migrate
```

## Notes

- Generated files go in `app/models/` (model) and `db/migrate/` (migration).
- Always add validations and associations to the model after generation.
- Common types: `string`, `text`, `integer`, `boolean`, `decimal`, `references` (FK), `datetime`.
- `references` automatically generates `belongs_to` in the model and an index in the migration.
- After adding `has_many` / `belongs_to` associations, add `dependent: :destroy` where appropriate.
- Check `db/schema.rb` after the migration to confirm the resulting structure.

## Example: model with FK

```bash
bundle exec rails g model Comment body:text task:references
bundle exec rails db:migrate
```
