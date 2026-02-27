require "test_helper"

# System tests for basic page availability.
# Implemented as integration tests so they run in the same process as the rest
# of the test suite (no browser or yarn required in the Docker image).
class PagesTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Board (root / tasks#index)
  # ---------------------------------------------------------------------------

  test "board page loads successfully" do
    get root_path
    assert_response :success
  end

  test "board page contains the React mount point" do
    get root_path
    assert_select "div#react-root"
  end

  test "board mount point targets the KanbanBoard component" do
    get root_path
    assert_select "div#react-root[data-component='KanbanBoard']"
  end

  test "board mount point embeds task JSON in data-tasks attribute" do
    get root_path
    node = css_select("div#react-root").first
    tasks = JSON.parse(node.attributes["data-tasks"].value)
    assert tasks.is_a?(Array), "data-tasks should be a JSON array"
    assert tasks.length >= 3, "expected at least 3 fixture tasks"
  end

  test "board data-tasks JSON includes all three fixture tasks" do
    get root_path
    node = css_select("div#react-root").first
    tasks_json = JSON.parse(node.attributes["data-tasks"].value)
    titles = tasks_json.map { |t| t["title"] }
    assert_includes titles, tasks(:todo_task).title
    assert_includes titles, tasks(:in_progress_task).title
    assert_includes titles, tasks(:done_task).title
  end

  test "board data-tasks JSON embeds comments for each task" do
    get root_path
    node = css_select("div#react-root").first
    tasks_json = JSON.parse(node.attributes["data-tasks"].value)
    todo = tasks_json.find { |t| t["id"] == tasks(:todo_task).id }
    assert todo.key?("comments"), "task JSON should include a 'comments' key"
    assert todo["comments"].is_a?(Array)
  end

  test "board locale can be switched to italian" do
    get root_path(locale: :it)

    assert_response :success
    assert_select "html[lang='it']"

    node = css_select("div#react-root").first
    assert_equal "it", node.attributes["data-current-locale"].value

    locale_options = JSON.parse(node.attributes["data-locale-options"].value)
    options_by_value = locale_options.index_by { |option| option["value"] }
    assert_includes options_by_value.keys, "it"
    assert_includes options_by_value.keys, "en"
    assert_equal "Italiano", options_by_value["it"]["label"]
    assert_equal "Inglese", options_by_value["en"]["label"]

    i18n_json = JSON.parse(node.attributes["data-i18n"].value)
    assert_equal "Bacheca Kanban", i18n_json.dig("kanban", "board_title")
  end

  # ---------------------------------------------------------------------------
  # Task show
  # ---------------------------------------------------------------------------

  test "task show page loads successfully" do
    get task_path(tasks(:todo_task))
    assert_response :success
  end

  test "task show page displays the task title" do
    task = tasks(:todo_task)
    get task_path(task)
    assert_select "div", text: task.title
  end

  test "task show page displays comments" do
    get task_path(tasks(:todo_task))
    assert_select "div", text: comments(:first_comment).body
    assert_select "div", text: comments(:second_comment).body
  end

  test "task show page for a task without comments loads without error" do
    get task_path(tasks(:in_progress_task))
    assert_response :success
  end

  # ---------------------------------------------------------------------------
  # New task form
  # ---------------------------------------------------------------------------

  test "new task page loads successfully" do
    get new_task_path
    assert_response :success
  end

  test "new task page renders a form" do
    get new_task_path
    assert_select "form"
  end

  test "new task form contains a title input" do
    get new_task_path
    assert_select "input[name='task[title]']"
  end

  # ---------------------------------------------------------------------------
  # Edit task form
  # ---------------------------------------------------------------------------

  test "edit task page loads successfully" do
    get edit_task_path(tasks(:todo_task))
    assert_response :success
  end

  test "edit task page renders a form" do
    get edit_task_path(tasks(:todo_task))
    assert_select "form"
  end

  test "edit task form is pre-filled with existing title" do
    task = tasks(:todo_task)
    get edit_task_path(task)
    assert_select "input[value='#{task.title}']"
  end
end
