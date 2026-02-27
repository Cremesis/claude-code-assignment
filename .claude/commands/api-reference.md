# api-reference

Quick reference for the JSON endpoints used by the React frontend (Kanban board).

## Tasks

| Method  | Path | Description |
|---------|------|-------------|
| `GET`   | `/tasks.json` | List all tasks (comments included) |
| `GET`   | `/tasks.json?status=todo` | Filter by status (`todo`, `in_progress`, `done`) |
| `GET`   | `/tasks/:id.json` | Single task with comments |
| `POST`  | `/tasks.json` | Create a new task |
| `PATCH` | `/tasks/:id.json` | Update a task (title, description, status) |
| `DELETE`| `/tasks/:id.json` | Delete a task |

### Task payload

```json
{ "task": { "title": "...", "description": "...", "status": "todo" } }
```

### Valid statuses

`todo` → `in_progress` → `done`

**Business rule**: status can only advance (never go back). Attempting a downgrade returns `422` with `{ "errors": ["Status can only advance forward"] }`.

## Comments

| Method   | Path | Description |
|----------|------|-------------|
| `POST`   | `/tasks/:task_id/comments.json` | Add a comment to a task |
| `DELETE` | `/tasks/:task_id/comments/:id.json` | Delete a comment |

### Comment payload

```json
{ "comment": { "body": "..." } }
```

## Notes

- The frontend (React) uses `api.js` in `app/javascript/components/` for all requests.
- `ApplicationController` uses `protect_from_forgery with: :null_session` — no CSRF token required for JSON requests.
- Success responses: `200` (GET/PATCH), `201` (POST), `204` (DELETE).
- Error responses: `422` with `{ "errors": [...] }`.
