require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # GET /tasks (index)
  # ---------------------------------------------------------------------------

  def test_index_returns_200
    get tasks_path
    assert_response :success
  end

  def test_index_returns_all_tasks_when_no_status_filter
    get tasks_path
    # The SPA renders tasks via React; check the JSON data attribute instead.
    node = css_select("div#react-root").first
    tasks_json = JSON.parse(node.attributes["data-tasks"].value)
    assert tasks_json.length >= 3
  end

  def test_index_filters_tasks_by_status_todo
    get tasks_path, params: { status: "todo" }
    assert_response :success
    node = css_select("div#react-root").first
    titles = JSON.parse(node.attributes["data-tasks"].value).map { |t| t["title"] }
    assert_includes titles, tasks(:todo_task).title
    assert_not_includes titles, tasks(:in_progress_task).title
    assert_not_includes titles, tasks(:done_task).title
  end

  def test_index_filters_tasks_by_status_in_progress
    get tasks_path, params: { status: "in_progress" }
    assert_response :success
    node = css_select("div#react-root").first
    titles = JSON.parse(node.attributes["data-tasks"].value).map { |t| t["title"] }
    assert_includes titles, tasks(:in_progress_task).title
    assert_not_includes titles, tasks(:todo_task).title
  end

  def test_index_with_invalid_status_returns_empty_without_crashing
    get tasks_path, params: { status: "invalid_status" }
    assert_response :success
    assert_select "div", text: tasks(:todo_task).title, count: 0
    assert_select "div", text: tasks(:in_progress_task).title, count: 0
    assert_select "div", text: tasks(:done_task).title, count: 0
  end

  # ---------------------------------------------------------------------------
  # GET /tasks/:id (show)
  # ---------------------------------------------------------------------------

  def test_show_returns_200
    get task_path(tasks(:todo_task))
    assert_response :success
  end

  def test_show_displays_the_task
    task = tasks(:todo_task)
    get task_path(task)
    assert_select "div", text: task.title
  end

  # ---------------------------------------------------------------------------
  # GET /tasks/new
  # ---------------------------------------------------------------------------

  def test_new_returns_200
    get new_task_path
    assert_response :success
  end

  # ---------------------------------------------------------------------------
  # POST /tasks (create)
  # ---------------------------------------------------------------------------

  def test_create_with_valid_params_redirects_to_task
    assert_difference("Task.count", 1) do
      post tasks_path, params: { task: { title: "New task title", status: "todo" } }
    end
    # The controller redirects to the newly created task; follow to confirm.
    assert_response :redirect
    assert_match %r{/tasks/\d+}, response.location
    assert_equal "Task created.", flash[:notice]
  end

  def test_create_persists_the_task_in_the_database
    post tasks_path, params: { task: { title: "Persisted task", status: "todo" } }
    assert Task.exists?(title: "Persisted task")
  end

  def test_create_with_missing_title_returns_422
    assert_no_difference("Task.count") do
      post tasks_path, params: { task: { title: "", status: "todo" } }
    end
    assert_response :unprocessable_entity
  end

  def test_create_with_missing_title_renders_new
    post tasks_path, params: { task: { title: "", status: "todo" } }
    assert_select "form"
  end

  # ---------------------------------------------------------------------------
  # GET /tasks/:id/edit
  # ---------------------------------------------------------------------------

  def test_edit_returns_200
    get edit_task_path(tasks(:todo_task))
    assert_response :success
  end

  # ---------------------------------------------------------------------------
  # PATCH /tasks/:id (update)
  # ---------------------------------------------------------------------------

  def test_update_with_valid_params_redirects_to_task
    task = tasks(:todo_task)
    patch task_path(task), params: { task: { title: "Updated title" } }
    assert_redirected_to task_path(task)
    assert_equal "Task updated.", flash[:notice]
  end

  def test_update_persists_changed_title_in_the_database
    task = tasks(:todo_task)
    patch task_path(task), params: { task: { title: "Freshly updated" } }
    assert_equal "Freshly updated", task.reload.title
  end

  def test_update_with_blank_title_returns_422
    task = tasks(:todo_task)
    patch task_path(task), params: { task: { title: "" } }
    assert_response :unprocessable_entity
  end

  def test_update_with_blank_title_renders_edit
    task = tasks(:todo_task)
    patch task_path(task), params: { task: { title: "" } }
    assert_select "form"
  end

  def test_update_with_backward_status_returns_422
    # done_task cannot go back to in_progress — regression guard
    task = tasks(:done_task)
    patch task_path(task), params: { task: { status: "in_progress" } }
    assert_response :unprocessable_entity
  end

  def test_update_with_backward_status_renders_edit
    task = tasks(:done_task)
    patch task_path(task), params: { task: { status: "in_progress" } }
    assert_select "form"
  end

  def test_update_does_not_persist_backward_status
    task = tasks(:done_task)
    patch task_path(task), params: { task: { status: "todo" } }
    assert_equal "done", task.reload.status
  end

  # ---------------------------------------------------------------------------
  # DELETE /tasks/:id (destroy)
  # ---------------------------------------------------------------------------

  def test_destroy_redirects_to_tasks_path
    task = tasks(:todo_task)
    delete task_path(task)
    assert_redirected_to tasks_path
    assert_equal "Task deleted.", flash[:notice]
  end

  def test_destroy_removes_task_from_the_database
    task = tasks(:todo_task)
    assert_difference("Task.count", -1) do
      delete task_path(task)
    end
    assert_nil Task.find_by(id: task.id)
  end

  # ---------------------------------------------------------------------------
  # POST /tasks/reorder (reorder)
  # ---------------------------------------------------------------------------

  def test_reorder_returns_200
    t1 = Task.create!(title: "Task A", status: "todo")
    t2 = Task.create!(title: "Task B", status: "todo")
    post reorder_tasks_path, params: { tasks: [ { id: t1.id, position: 1 }, { id: t2.id, position: 0 } ] }
    assert_response :ok
  end

  def test_reorder_persists_new_positions
    t1 = Task.create!(title: "Task A", status: "todo")
    t2 = Task.create!(title: "Task B", status: "todo")
    post reorder_tasks_path, params: { tasks: [ { id: t1.id, position: 5 }, { id: t2.id, position: 3 } ] }
    assert_equal 5, t1.reload.position
    assert_equal 3, t2.reload.position
  end

  def test_reorder_with_missing_tasks_param_returns_400
    post reorder_tasks_path
    assert_response :bad_request
  end
end
