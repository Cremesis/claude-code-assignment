# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

## Code coverage

The test suite generates a coverage report using SimpleCov.

Run:

```bash
bundle exec rails test
```

Open `coverage/index.html` to inspect line-by-line coverage.

### Why coverage may show `0.0%`

If you run `rails test:all` with parallel workers enabled, tests can run in worker
processes while the final SimpleCov report is written by a process that did not
execute test code. That can produce:

- `Line Coverage: 0.0% (0 / 202)`

For reliable coverage output, run tests in serial mode:

```bash
PARALLEL_WORKERS=1 bundle exec rails test:all
```
