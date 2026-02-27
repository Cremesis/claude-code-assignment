require "test_helper"

class CommentsControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # POST /tasks/:task_id/comments (create)
  # ---------------------------------------------------------------------------

  def test_create_with_valid_body_redirects_to_task
    task = tasks(:todo_task)
    assert_difference("Comment.count", 1) do
      post task_comments_path(task), params: { comment: { body: "A helpful comment" } }
    end
    assert_redirected_to task_path(task)
    assert_equal "Comment added.", flash[:notice]
  end

  def test_create_persists_comment_in_the_database
    task = tasks(:todo_task)
    post task_comments_path(task), params: { comment: { body: "Persisted body" } }
    assert task.comments.exists?(body: "Persisted body")
  end

  def test_create_with_blank_body_returns_422
    task = tasks(:todo_task)
    assert_no_difference("Comment.count") do
      post task_comments_path(task), params: { comment: { body: "" } }
    end
    assert_response :unprocessable_entity
  end

  def test_create_with_blank_body_renders_tasks_show
    task = tasks(:todo_task)
    post task_comments_path(task), params: { comment: { body: "" } }
    # The tasks/show template contains a div with the task title
    assert_select "div", text: task.title
  end

  # ---------------------------------------------------------------------------
  # DELETE /tasks/:task_id/comments/:id (destroy)
  # ---------------------------------------------------------------------------

  def test_destroy_redirects_to_task
    task    = tasks(:todo_task)
    comment = comments(:first_comment)
    delete task_comment_path(task, comment)
    assert_redirected_to task_path(task)
    assert_equal "Comment deleted.", flash[:notice]
  end

  def test_destroy_removes_comment_from_the_database
    task    = tasks(:todo_task)
    comment = comments(:first_comment)
    assert_difference("Comment.count", -1) do
      delete task_comment_path(task, comment)
    end
    assert_nil Comment.find_by(id: comment.id)
  end

  def test_destroy_with_comment_belonging_to_different_task_returns_404
    # comment_on_done belongs to done_task, not todo_task — scoped lookup must fail.
    # Rails rescues ActiveRecord::RecordNotFound and returns 404 in the test env.
    wrong_task      = tasks(:todo_task)
    foreign_comment = comments(:comment_on_done)
    delete task_comment_path(wrong_task, foreign_comment)
    assert_response :not_found
  end
end
