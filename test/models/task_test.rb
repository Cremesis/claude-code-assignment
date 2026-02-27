require "test_helper"

class TaskTest < ActiveSupport::TestCase
  # ---------------------------------------------------------------------------
  # Validity
  # ---------------------------------------------------------------------------

  def test_valid_with_title_and_default_status
    task = Task.new(title: "Do something")
    assert task.valid?, "Expected task with title to be valid, got: #{task.errors.full_messages}"
    assert_equal "todo", task.status
  end

  def test_invalid_without_title
    task = Task.new(title: nil)
    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  def test_invalid_with_blank_title
    task = Task.new(title: "")
    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  # ---------------------------------------------------------------------------
  # Status enum
  # ---------------------------------------------------------------------------

  def test_status_todo_is_valid
    task = Task.new(title: "A task", status: "todo")
    assert task.valid?, "Expected status 'todo' to be valid"
  end

  def test_status_in_progress_is_valid
    task = Task.new(title: "A task", status: "in_progress")
    assert task.valid?, "Expected status 'in_progress' to be valid"
  end

  def test_status_done_is_valid
    task = Task.new(title: "A task", status: "done")
    assert task.valid?, "Expected status 'done' to be valid"
  end

  def test_status_defaults_to_todo_on_new_record
    task = Task.new(title: "A task")
    assert_equal "todo", task.status
  end

  # ---------------------------------------------------------------------------
  # status_can_only_advance — forward transitions allowed
  # ---------------------------------------------------------------------------

  def test_status_advance_from_todo_to_in_progress_is_valid
    task = tasks(:todo_task)
    task.status = "in_progress"
    assert task.valid?, "Expected todo→in_progress to be valid, got: #{task.errors.full_messages}"
  end

  def test_status_advance_from_in_progress_to_done_is_valid
    task = tasks(:in_progress_task)
    task.status = "done"
    assert task.valid?, "Expected in_progress→done to be valid, got: #{task.errors.full_messages}"
  end

  def test_status_advance_from_todo_to_done_is_valid
    task = tasks(:todo_task)
    task.status = "done"
    assert task.valid?, "Expected todo→done to be valid, got: #{task.errors.full_messages}"
  end

  # ---------------------------------------------------------------------------
  # status_can_only_advance — backward transitions rejected
  # ---------------------------------------------------------------------------

  def test_status_cannot_go_backward_from_done_to_in_progress
    task = tasks(:done_task)
    task.status = "in_progress"
    assert_not task.valid?
    assert_includes task.errors[:status], "can only advance forward"
  end

  def test_status_cannot_go_backward_from_in_progress_to_todo
    task = tasks(:in_progress_task)
    task.status = "todo"
    assert_not task.valid?
    assert_includes task.errors[:status], "can only advance forward"
  end

  def test_status_cannot_go_backward_from_done_to_todo
    task = tasks(:done_task)
    task.status = "todo"
    assert_not task.valid?
    assert_includes task.errors[:status], "can only advance forward"
  end

  def test_status_can_only_advance_validation_not_run_on_create
    # A new record with a backward-looking status assignment is not subject
    # to the on: :update guard, so it must not add that error.
    task = Task.new(title: "Brand new task", status: "done")
    task.valid?
    assert_empty task.errors[:status]
  end

  # ---------------------------------------------------------------------------
  # Associations — has_many :comments, dependent: :destroy
  # ---------------------------------------------------------------------------

  def test_destroying_task_destroys_associated_comments
    task = tasks(:todo_task)
    comment_ids = task.comments.pluck(:id)
    assert comment_ids.any?, "Fixture should have at least one comment on todo_task"

    task.destroy
    comment_ids.each do |id|
      assert_nil Comment.find_by(id: id), "Expected comment #{id} to be destroyed with task"
    end
  end

  # ---------------------------------------------------------------------------
  # default_scope ordering
  # ---------------------------------------------------------------------------

  def test_default_scope_orders_by_position_ascending
    tasks(:todo_task).update_column(:position, 20)
    tasks(:in_progress_task).update_column(:position, 10)
    tasks(:done_task).update_column(:position, 30)
    positions = Task.all.map(&:position)
    assert_equal positions.sort, positions,
      "Expected tasks to be ordered by position ascending"
  end

  # ---------------------------------------------------------------------------
  # assign_position callback (before_create)
  # ---------------------------------------------------------------------------

  def test_assign_position_appends_to_end_of_column_on_create
    max_pos = Task.where(status: "todo").maximum(:position)
    new_task = Task.create!(title: "Appended task", status: "todo")
    assert_equal max_pos + 1, new_task.position
  end

  def test_assign_position_starts_at_zero_for_empty_column
    Task.where(status: "todo").destroy_all
    new_task = Task.create!(title: "First todo", status: "todo")
    assert_equal 0, new_task.position
  end

  # ---------------------------------------------------------------------------
  # reassign_position_on_status_change callback (before_validation on update)
  # ---------------------------------------------------------------------------

  def test_status_change_appends_task_to_end_of_target_column
    todo_task        = tasks(:todo_task)        # "todo",        position 0
    in_progress_task = tasks(:in_progress_task) # "in_progress", position 0

    todo_task.update!(status: "in_progress")
    assert_equal in_progress_task.position + 1, todo_task.reload.position
  end

  def test_position_unchanged_when_status_does_not_change
    task = tasks(:todo_task)
    original_position = task.position
    task.update!(title: "Renamed but same status")
    assert_equal original_position, task.reload.position
  end
end
