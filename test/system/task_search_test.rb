require "application_system_test_case"

Capybara.default_max_wait_time = 5

class TaskSearchTest < ApplicationSystemTestCase
  # Helper: open the search modal and return the modal panel node so assertions
  # can be scoped to it — this avoids ambiguous matches against the board
  # column header buttons that share the same text as the status chips.
  def open_search_modal
    visit root_path
    find("button[aria-label='Search tasks']").click
    # Return the white panel div so callers can scope queries to it.
    find(".fixed.inset-0 > div")
  end

  # Scoped helper: assert text appears inside the search modal panel.
  def assert_result_text(text, panel)
    within(panel) { assert_text text }
  end

  # Scoped helper: assert text does NOT appear inside the search modal panel.
  def assert_no_result_text(text, panel)
    within(panel) { assert_no_text text }
  end

  # Click a status chip by its exact label text, scoped within the chip row.
  # Uses exact_text: true to distinguish chip buttons ("In Progress") from
  # result row buttons whose content includes the status badge text
  # ("Write tests In Progress").
  def click_status_chip(label, panel)
    within(panel) { find("button", text: label, exact_text: true).click }
  end

  # ---------------------------------------------------------------------------
  # 1. Search button is visible on the board
  # ---------------------------------------------------------------------------
  def test_search_button_is_visible_on_the_board
    visit root_path
    assert_selector "button[aria-label='Search tasks']"
    assert_text "Search"
  end

  # ---------------------------------------------------------------------------
  # 2. Clicking the search button opens the SearchModal
  # ---------------------------------------------------------------------------
  def test_clicking_search_button_opens_search_modal
    open_search_modal
    assert_selector "h2", text: "Search tasks"
    assert_selector "input[placeholder='Search by title…']"
  end

  # ---------------------------------------------------------------------------
  # 3. Typing in the search input filters tasks by title (live filtering)
  # ---------------------------------------------------------------------------
  def test_typing_in_search_input_filters_tasks_by_title
    panel = open_search_modal

    # All fixture tasks should be visible in the results initially
    assert_result_text tasks(:todo_task).title, panel
    assert_result_text tasks(:in_progress_task).title, panel
    assert_result_text tasks(:done_task).title, panel

    # Filter by a unique substring of the todo task title
    within(panel) { fill_in "Search by title…", with: "groceries" }

    assert_result_text tasks(:todo_task).title, panel
    assert_no_result_text tasks(:in_progress_task).title, panel
    assert_no_result_text tasks(:done_task).title, panel
  end

  # ---------------------------------------------------------------------------
  # 4. Status chips filter by status
  # ---------------------------------------------------------------------------
  def test_status_chip_filters_by_in_progress
    panel = open_search_modal

    click_status_chip("In Progress", panel)

    assert_result_text tasks(:in_progress_task).title, panel
    assert_no_result_text tasks(:todo_task).title, panel
    assert_no_result_text tasks(:done_task).title, panel
  end

  def test_status_chip_filters_by_todo
    panel = open_search_modal

    click_status_chip("Todo", panel)

    assert_result_text tasks(:todo_task).title, panel
    assert_result_text tasks(:todo_task_2).title, panel
    assert_no_result_text tasks(:in_progress_task).title, panel
    assert_no_result_text tasks(:done_task).title, panel
  end

  def test_status_chip_filters_by_done
    panel = open_search_modal

    click_status_chip("Done", panel)

    assert_result_text tasks(:done_task).title, panel
    assert_no_result_text tasks(:todo_task).title, panel
    assert_no_result_text tasks(:in_progress_task).title, panel
  end

  # ---------------------------------------------------------------------------
  # 5. Text + status filters combine correctly
  # ---------------------------------------------------------------------------
  def test_text_and_status_filters_combine
    panel = open_search_modal

    # Filter by "In Progress" status chip. exact_text: true avoids ambiguity
    # with result-row buttons whose content includes the status badge text.
    click_status_chip("In Progress", panel)
    within(panel) { fill_in "Search by title…", with: "tests" }

    assert_result_text tasks(:in_progress_task).title, panel
    assert_no_result_text tasks(:todo_task).title, panel
    assert_no_result_text tasks(:done_task).title, panel
  end

  def test_text_and_status_filters_combine_to_produce_no_results
    panel = open_search_modal

    click_status_chip("In Progress", panel)
    within(panel) { fill_in "Search by title…", with: "groceries" }

    assert_result_text "No tasks match your search", panel
  end

  # ---------------------------------------------------------------------------
  # 6. Clicking a search result closes SearchModal and opens TaskModal
  # ---------------------------------------------------------------------------
  def test_clicking_search_result_closes_search_modal_and_opens_task_modal
    panel = open_search_modal

    within(panel) { find("button", text: tasks(:todo_task).title).click }

    # SearchModal should be gone
    assert_no_selector "h2", text: "Search tasks"
    assert_no_selector "input[placeholder='Search by title…']"

    # TaskModal (edit mode) should be open with the task's title in an input
    assert_selector "input[value='#{tasks(:todo_task).title}']"
  end

  # ---------------------------------------------------------------------------
  # 7. ESC key closes the SearchModal
  # ---------------------------------------------------------------------------
  def test_esc_key_closes_search_modal
    open_search_modal
    assert_selector "h2", text: "Search tasks"

    find("body").send_keys :escape

    assert_no_selector "h2", text: "Search tasks"
  end

  # ---------------------------------------------------------------------------
  # 8. Clicking the overlay (outside the modal panel) closes the SearchModal
  # ---------------------------------------------------------------------------
  def test_clicking_overlay_closes_search_modal
    open_search_modal
    assert_selector "h2", text: "Search tasks"

    # Click in the top-left corner of the full-screen overlay, which is well
    # outside the centred white panel (max-w-lg).
    find(".fixed.inset-0", match: :first).click(x: 5, y: 5)

    assert_no_selector "h2", text: "Search tasks"
  end

  # ---------------------------------------------------------------------------
  # 9. Empty state message shown when no results match
  # ---------------------------------------------------------------------------
  def test_empty_state_message_when_no_results_match
    panel = open_search_modal

    within(panel) { fill_in "Search by title…", with: "xyzzy_no_such_task_exists" }

    assert_result_text "No tasks match your search", panel
  end
end
