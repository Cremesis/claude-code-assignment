require "test_helper"

# Tests for the JSON API consumed by the React frontend.
class ApiTest < ActionDispatch::IntegrationTest
  JSON_HEADERS = { "Accept" => "application/json", "Content-Type" => "application/json" }

  # ---------------------------------------------------------------------------
  # GET /tasks.json
  # ---------------------------------------------------------------------------

  test "GET /tasks.json returns 200" do
    get tasks_path, headers: { "Accept" => "application/json" }
    assert_response :success
  end

  test "GET /tasks.json returns a JSON array" do
    get tasks_path, headers: { "Accept" => "application/json" }
    assert_equal "application/json", response.media_type
    body = JSON.parse(response.body)
    assert body.is_a?(Array)
  end

  test "GET /tasks.json includes all fixture tasks" do
    get tasks_path, headers: { "Accept" => "application/json" }
    ids = JSON.parse(response.body).map { |t| t["id"] }
    assert_includes ids, tasks(:todo_task).id
    assert_includes ids, tasks(:in_progress_task).id
    assert_includes ids, tasks(:done_task).id
  end

  test "GET /tasks.json embeds comments for each task" do
    get tasks_path, headers: { "Accept" => "application/json" }
    todo = JSON.parse(response.body).find { |t| t["id"] == tasks(:todo_task).id }
    assert todo.key?("comments")
    assert todo["comments"].is_a?(Array)
    assert todo["comments"].length >= 2
  end

  test "GET /tasks.json?status=todo returns only todo tasks" do
    get tasks_path, params: { status: "todo" }, headers: { "Accept" => "application/json" }
    assert_response :success
    statuses = JSON.parse(response.body).map { |t| t["status"] }
    assert statuses.all? { |s| s == "todo" }
    assert statuses.any?
  end

  test "GET /tasks.json?status=invalid returns empty array" do
    get tasks_path, params: { status: "invalid" }, headers: { "Accept" => "application/json" }
    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  # ---------------------------------------------------------------------------
  # GET /tasks/:id.json
  # ---------------------------------------------------------------------------

  test "GET /tasks/:id.json returns 200" do
    get task_path(tasks(:todo_task)), headers: { "Accept" => "application/json" }
    assert_response :success
  end

  test "GET /tasks/:id.json returns the task as JSON" do
    task = tasks(:todo_task)
    get task_path(task), headers: { "Accept" => "application/json" }
    body = JSON.parse(response.body)
    assert_equal task.id, body["id"]
    assert_equal task.title, body["title"]
    assert_equal task.status, body["status"]
  end

  test "GET /tasks/:id.json embeds comments" do
    get task_path(tasks(:todo_task)), headers: { "Accept" => "application/json" }
    body = JSON.parse(response.body)
    assert body.key?("comments")
    comment_bodies = body["comments"].map { |c| c["body"] }
    assert_includes comment_bodies, comments(:first_comment).body
    assert_includes comment_bodies, comments(:second_comment).body
  end

  # ---------------------------------------------------------------------------
  # POST /tasks.json
  # ---------------------------------------------------------------------------

  test "POST /tasks.json with valid params returns 201" do
    post tasks_path,
      params: { task: { title: "New task", status: "todo" } }.to_json,
      headers: JSON_HEADERS
    assert_response :created
  end

  test "POST /tasks.json creates the task in the database" do
    assert_difference("Task.count", 1) do
      post tasks_path,
        params: { task: { title: "Created via API", status: "todo" } }.to_json,
        headers: JSON_HEADERS
    end
  end

  test "POST /tasks.json returns the created task with comments key" do
    post tasks_path,
      params: { task: { title: "API task", status: "todo" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert_equal "API task", body["title"]
    assert body.key?("comments")
  end

  test "POST /tasks.json with missing title returns 422" do
    post tasks_path,
      params: { task: { title: "", status: "todo" } }.to_json,
      headers: JSON_HEADERS
    assert_response :unprocessable_entity
  end

  test "POST /tasks.json with missing title returns errors array" do
    post tasks_path,
      params: { task: { title: "" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert body.key?("errors")
    assert body["errors"].any?
  end

  # ---------------------------------------------------------------------------
  # PATCH /tasks/:id.json
  # ---------------------------------------------------------------------------

  test "PATCH /tasks/:id.json with valid params returns 200" do
    patch task_path(tasks(:todo_task)),
      params: { task: { title: "Updated" } }.to_json,
      headers: JSON_HEADERS
    assert_response :success
  end

  test "PATCH /tasks/:id.json updates the task in the database" do
    task = tasks(:todo_task)
    patch task_path(task),
      params: { task: { title: "Patched title" } }.to_json,
      headers: JSON_HEADERS
    assert_equal "Patched title", task.reload.title
  end

  test "PATCH /tasks/:id.json returns updated task JSON with comments" do
    task = tasks(:todo_task)
    patch task_path(task),
      params: { task: { title: "New title" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert_equal "New title", body["title"]
    assert body.key?("comments")
  end

  test "PATCH /tasks/:id.json advances status forward" do
    task = tasks(:todo_task)
    patch task_path(task),
      params: { task: { status: "in_progress" } }.to_json,
      headers: JSON_HEADERS
    assert_response :success
    assert_equal "in_progress", task.reload.status
  end

  test "PATCH /tasks/:id.json with backward status returns 422" do
    patch task_path(tasks(:done_task)),
      params: { task: { status: "todo" } }.to_json,
      headers: JSON_HEADERS
    assert_response :unprocessable_entity
  end

  test "PATCH /tasks/:id.json with backward status returns errors array" do
    patch task_path(tasks(:done_task)),
      params: { task: { status: "todo" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert body.key?("errors")
    assert body["errors"].any?
  end

  # ---------------------------------------------------------------------------
  # DELETE /tasks/:id.json
  # ---------------------------------------------------------------------------

  test "DELETE /tasks/:id.json returns 204" do
    delete task_path(tasks(:todo_task)), headers: { "Accept" => "application/json" }
    assert_response :no_content
  end

  test "DELETE /tasks/:id.json removes the task from the database" do
    task = tasks(:todo_task)
    assert_difference("Task.count", -1) do
      delete task_path(task), headers: { "Accept" => "application/json" }
    end
    assert_nil Task.find_by(id: task.id)
  end

  # ---------------------------------------------------------------------------
  # POST /tasks/:id/comments.json
  # ---------------------------------------------------------------------------

  test "POST /tasks/:id/comments.json with valid body returns 201" do
    post task_comments_path(tasks(:todo_task)),
      params: { comment: { body: "Great job!" } }.to_json,
      headers: JSON_HEADERS
    assert_response :created
  end

  test "POST /tasks/:id/comments.json creates the comment in the database" do
    assert_difference("Comment.count", 1) do
      post task_comments_path(tasks(:todo_task)),
        params: { comment: { body: "New comment" } }.to_json,
        headers: JSON_HEADERS
    end
  end

  test "POST /tasks/:id/comments.json returns the comment as JSON" do
    post task_comments_path(tasks(:todo_task)),
      params: { comment: { body: "Returned comment" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert_equal "Returned comment", body["body"]
    assert body.key?("id")
  end

  test "POST /tasks/:id/comments.json with blank body returns 422" do
    post task_comments_path(tasks(:todo_task)),
      params: { comment: { body: "" } }.to_json,
      headers: JSON_HEADERS
    assert_response :unprocessable_entity
  end

  test "POST /tasks/:id/comments.json with blank body returns errors array" do
    post task_comments_path(tasks(:todo_task)),
      params: { comment: { body: "" } }.to_json,
      headers: JSON_HEADERS
    body = JSON.parse(response.body)
    assert body.key?("errors")
    assert body["errors"].any?
  end

  # ---------------------------------------------------------------------------
  # DELETE /tasks/:id/comments/:id.json
  # ---------------------------------------------------------------------------

  test "DELETE /tasks/:id/comments/:id.json returns 204" do
    delete task_comment_path(tasks(:todo_task), comments(:first_comment)),
      headers: { "Accept" => "application/json" }
    assert_response :no_content
  end

  test "DELETE /tasks/:id/comments/:id.json removes the comment from the database" do
    task    = tasks(:todo_task)
    comment = comments(:first_comment)
    assert_difference("Comment.count", -1) do
      delete task_comment_path(task, comment),
        headers: { "Accept" => "application/json" }
    end
    assert_nil Comment.find_by(id: comment.id)
  end

  # ---------------------------------------------------------------------------
  # POST /tasks/reorder.json
  # ---------------------------------------------------------------------------

  test "POST /tasks/reorder.json returns 200" do
    t1 = Task.create!(title: "Task A", status: "todo")
    t2 = Task.create!(title: "Task B", status: "todo")
    post reorder_tasks_path,
      params: { tasks: [ { id: t1.id, position: 1 }, { id: t2.id, position: 0 } ] }.to_json,
      headers: JSON_HEADERS
    assert_response :ok
  end

  test "POST /tasks/reorder.json persists new positions" do
    t1 = Task.create!(title: "Task A", status: "todo")
    t2 = Task.create!(title: "Task B", status: "todo")
    post reorder_tasks_path,
      params: { tasks: [ { id: t1.id, position: 5 }, { id: t2.id, position: 3 } ] }.to_json,
      headers: JSON_HEADERS
    assert_equal 5, t1.reload.position
    assert_equal 3, t2.reload.position
  end

  test "POST /tasks/reorder.json returns empty body" do
    t1 = Task.create!(title: "Task A", status: "todo")
    post reorder_tasks_path,
      params: { tasks: [ { id: t1.id, position: 0 } ] }.to_json,
      headers: JSON_HEADERS
    assert_response :ok
    assert_empty response.body
  end
end
