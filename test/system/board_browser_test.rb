require "application_system_test_case"

Capybara.default_max_wait_time = 5

class BoardBrowserTest < ApplicationSystemTestCase
  # ---------------------------------------------------------------------------
  # 1. Board shows 3 column headers
  # ---------------------------------------------------------------------------
  test "board shows three column headers" do
    visit root_path
    assert_text ui_t("statuses.todo")
    assert_text ui_t("statuses.in_progress")
    assert_text ui_t("statuses.done")
  end

  # ---------------------------------------------------------------------------
  # 2. Fixture cards appear in the correct columns
  # ---------------------------------------------------------------------------
  test "fixture cards appear in the board" do
    visit root_path
    assert_text tasks(:todo_task).title
    assert_text tasks(:in_progress_task).title
    assert_text tasks(:done_task).title
  end

  # ---------------------------------------------------------------------------
  # 3. "Add Task" opens the create modal
  # ---------------------------------------------------------------------------
  test "add task button opens the create modal" do
    visit root_path
    find(%(button[aria-label="#{ui_t("kanban.add_task_aria")}"])).click
    assert_selector %(input[placeholder="#{ui_t("task_modal.title_placeholder")}"])
  end

  # ---------------------------------------------------------------------------
  # 4. Create task → card appears on the board
  # ---------------------------------------------------------------------------
  test "creating a task adds it to the board" do
    visit root_path
    find(%(button[aria-label="#{ui_t("kanban.add_task_aria")}"])).click
    fill_in ui_t("task_modal.title_placeholder"), with: "Browser test task"
    click_button ui_t("task_modal.create")
    assert_text "Browser test task"
  end

  # ---------------------------------------------------------------------------
  # 5. Clicking a card opens the edit modal with the task title
  # ---------------------------------------------------------------------------
  test "clicking a card opens the edit modal" do
    visit root_path
    find("p", text: tasks(:todo_task).title).click
    assert_selector "input[value='#{tasks(:todo_task).title}']"
    assert_text ui_t("task_modal.created_at_label")
    assert_text ui_t("task_modal.updated_at_label")
  end

  # ---------------------------------------------------------------------------
  # 6. Edit modal shows existing comments
  # ---------------------------------------------------------------------------
  test "edit modal shows existing comments" do
    visit root_path
    find("p", text: tasks(:todo_task).title).click
    assert_text comments(:first_comment).body
    assert_text comments(:second_comment).body
  end

  # ---------------------------------------------------------------------------
  # 7. Adding a comment shows it in the list
  # ---------------------------------------------------------------------------
  test "adding a comment displays it in the modal" do
    visit root_path
    find("p", text: tasks(:todo_task).title).click
    fill_in ui_t("task_modal.add_comment_placeholder"), with: "Un nuovo commento"
    click_button ui_t("task_modal.send_comment")
    assert_text "Un nuovo commento"
  end

  # ---------------------------------------------------------------------------
  # 8. "Annulla" closes the modal
  # ---------------------------------------------------------------------------
  test "cancel button closes the modal" do
    visit root_path
    find("p", text: tasks(:todo_task).title).click
    assert_selector "input[value='#{tasks(:todo_task).title}']"
    click_button ui_t("task_modal.cancel")
    assert_no_selector "input[value='#{tasks(:todo_task).title}']"
  end

  # ---------------------------------------------------------------------------
  # 9. ESC closes the modal
  # ---------------------------------------------------------------------------
  test "pressing ESC closes the modal" do
    visit root_path
    find("p", text: tasks(:todo_task).title).click
    assert_selector "input[value='#{tasks(:todo_task).title}']"
    find("body").send_keys :escape
    assert_no_selector "input[value='#{tasks(:todo_task).title}']"
  end

  # ---------------------------------------------------------------------------
  # 10. Delete task → disappears from the board
  # ---------------------------------------------------------------------------
  test "deleting a task removes it from the board" do
    visit root_path
    find("p", text: tasks(:done_task).title).click
    accept_confirm do
      click_button ui_t("task_modal.delete_task")
    end
    assert_no_text tasks(:done_task).title
  end
end
