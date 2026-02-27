# test

Runs the full test suite (models, controllers, system) locally.

## Instructions

```bash
RAILS_ENV=test bundle exec rails db:test:prepare && \
bundle exec ruby -Itest -e \
  'require "test_helper"; Dir["test/**/*_test.rb"].sort.each { |f| require File.expand_path(f) }'
```

## Notes

- Do NOT use `rails test` directly — it may fail due to `test:prepare` running javascript:build.
- Passing files explicitly to `ruby -Itest` does not aggregate all tests correctly; always use the Dir glob.
- To run a subset: replace the pattern, e.g. `test/models/**/*_test.rb`.
- `db:test:prepare` maps `RAILS_ENV=test` to `claude_code_assignment_test` (isolated from development).
