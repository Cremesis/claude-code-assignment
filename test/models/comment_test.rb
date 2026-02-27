require "test_helper"

class CommentTest < ActiveSupport::TestCase
  # ---------------------------------------------------------------------------
  # Validity
  # ---------------------------------------------------------------------------

  def test_valid_with_body_and_task
    comment = Comment.new(body: "Great work!", task: tasks(:todo_task))
    assert comment.valid?, "Expected comment with body and task to be valid, got: #{comment.errors.full_messages}"
  end

  def test_invalid_without_body
    comment = Comment.new(body: nil, task: tasks(:todo_task))
    assert_not comment.valid?
    assert_includes comment.errors[:body], "can't be blank"
  end

  def test_invalid_with_blank_body
    comment = Comment.new(body: "", task: tasks(:todo_task))
    assert_not comment.valid?
    assert_includes comment.errors[:body], "can't be blank"
  end

  def test_invalid_without_task
    comment = Comment.new(body: "Orphaned comment", task: nil)
    assert_not comment.valid?
    assert_includes comment.errors[:task], "must exist"
  end
end
