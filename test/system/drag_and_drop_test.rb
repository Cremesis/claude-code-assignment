require "application_system_test_case"

Capybara.default_max_wait_time = 5

class DragAndDropTest < ApplicationSystemTestCase
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  # Find the card div (draggable element) by task title.
  def card_for(task)
    find(".cursor-grab", text: task.title)
  end

  # Drag source card onto target using the W3C Pointer Actions API.
  # Selenium sends pointer-level events that Chrome translates to both
  # pointerdown/pointermove/pointerup and mousedown/mousemove/mouseup,
  # which is what dnd-kit's PointerSensor requires.
  def drag_to(source, target)
    page.driver.browser.action
      .click_and_hold(source.native)
      .move_by(0, 10)           # >8px to satisfy PointerSensor activationConstraint
      .move_to(target.native)
      .release
      .perform
    sleep 0.6                   # allow React state update + API call
  end

  # ---------------------------------------------------------------------------
  # Within-column reorder
  # ---------------------------------------------------------------------------

  test "dragging a card below another reorders them within the column" do
    visit root_path

    first_card  = card_for(tasks(:todo_task))
    second_card = card_for(tasks(:todo_task_2))

    # Initial order: todo_task (position 0) is visually above todo_task_2 (position 1)
    assert first_card.native.location.y < second_card.native.location.y,
      "Expected 'Buy groceries' to start above 'Water the plants'"

    drag_to(first_card, second_card)

    # After drag: todo_task_2 should now be above todo_task
    assert card_for(tasks(:todo_task_2)).native.location.y < card_for(tasks(:todo_task)).native.location.y,
      "Expected 'Water the plants' to be above 'Buy groceries' after drag"
  end

  test "within-column reorder persists after page reload" do
    visit root_path

    drag_to(card_for(tasks(:todo_task)), card_for(tasks(:todo_task_2)))

    # Wait until all API calls complete (data-saving flips back to false).
    assert_selector "[data-saving='false']", wait: 5

    visit root_path

    assert card_for(tasks(:todo_task_2)).native.location.y < card_for(tasks(:todo_task)).native.location.y,
      "Expected reordering to persist after reload"
  end

  # ---------------------------------------------------------------------------
  # Backward move (status regression)
  # ---------------------------------------------------------------------------

  test "dragging a card backward shows an error and leaves it in the original column" do
    visit root_path

    # in_progress_task is the only (first) card in the in_progress column
    drag_to(card_for(tasks(:in_progress_task)), card_for(tasks(:todo_task)))

    # An alert must appear
    alert_text = accept_alert
    assert_includes alert_text, "forward", "Expected alert about forward-only status"

    # Card must still be in the in_progress column
    within(find(".border-blue-200")) do
      assert_text tasks(:in_progress_task).title
    end
  end

  test "dragging a done card back to in_progress shows an error" do
    visit root_path

    drag_to(card_for(tasks(:done_task)), card_for(tasks(:in_progress_task)))

    alert_text = accept_alert
    assert_includes alert_text, "forward", "Expected alert about forward-only status"

    within(find(".border-green-200")) do
      assert_text tasks(:done_task).title
    end
  end

  # ---------------------------------------------------------------------------
  # Cross-column move
  # ---------------------------------------------------------------------------

  test "dragging a card to another column moves it there" do
    visit root_path

    # Drag todo_task onto in_progress_task — should land before it
    drag_to(card_for(tasks(:todo_task)), card_for(tasks(:in_progress_task)))

    within(find(".border-blue-200")) do
      assert_text tasks(:todo_task).title
    end

    # todo_task should now appear above in_progress_task (inserted before it)
    assert card_for(tasks(:todo_task)).native.location.y <
           card_for(tasks(:in_progress_task)).native.location.y,
      "Expected dragged card to land before the target card"
  end

  # ---------------------------------------------------------------------------
  # Cancel drag by returning to original position
  # ---------------------------------------------------------------------------

  test "dragging first card over second then back to first position leaves order unchanged" do
    visit root_path

    first_card  = card_for(tasks(:todo_task))
    second_card = card_for(tasks(:todo_task_2))
    third_card  = card_for(tasks(:todo_task_3))

    # Record initial vertical order
    initial_y1 = first_card.native.location.y
    initial_y2 = second_card.native.location.y
    initial_y3 = third_card.native.location.y

    assert initial_y1 < initial_y2, "todo_task must start above todo_task_2"
    assert initial_y2 < initial_y3, "todo_task_2 must start above todo_task_3"

    # Pre-compute delta from pre-drag viewport coordinates (no CSS transforms yet).
    # Using move_by avoids the problem where dnd-kit's CSS transforms shift the DOM
    # elements' reported locations during the drag, causing move_to(element) to land
    # at the wrong position.
    delta = second_card.native.location.y - first_card.native.location.y

    # Drag first card over the second, then slide back and release.
    page.driver.browser.action
      .click_and_hold(first_card.native)   # cursor at first_card center (no transforms yet)
      .move_by(0, 10)                       # >8 px to activate PointerSensor
      .move_by(0, delta - 10)              # reach second_card center
      .move_by(0, -(delta + 20))           # return to 20 px above first_card original center
      .release
      .perform

    sleep 0.6  # let React settle + any API call complete

    # Visual order must be unchanged
    assert card_for(tasks(:todo_task)).native.location.y <
           card_for(tasks(:todo_task_2)).native.location.y,
      "todo_task must still be above todo_task_2"

    assert card_for(tasks(:todo_task_2)).native.location.y <
           card_for(tasks(:todo_task_3)).native.location.y,
      "todo_task_2 must still be above todo_task_3"

    # Database positions must be unchanged
    assert_equal 0, tasks(:todo_task).reload.position,   "todo_task position must remain 0"
    assert_equal 1, tasks(:todo_task_2).reload.position, "todo_task_2 position must remain 1"
    assert_equal 2, tasks(:todo_task_3).reload.position, "todo_task_3 position must remain 2"
  end

  test "cross-column move persists after page reload with correct position" do
    visit root_path

    drag_to(card_for(tasks(:todo_task)), card_for(tasks(:in_progress_task)))

    # Wait until all API calls complete (data-saving flips back to false).
    assert_selector "[data-saving='false']", wait: 5

    visit root_path

    within(find(".border-blue-200")) do
      assert_text tasks(:todo_task).title
    end

    assert card_for(tasks(:todo_task)).native.location.y <
           card_for(tasks(:in_progress_task)).native.location.y,
      "Expected position to persist after reload"
  end
end
