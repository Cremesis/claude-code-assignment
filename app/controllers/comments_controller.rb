class CommentsController < ApplicationController
  before_action :set_task

  def create
    @comment = @task.comments.new(comment_params)
    respond_to do |format|
      format.html do
        if @comment.save
          redirect_to @task, notice: "Comment added."
        else
          @task.reload
          render "tasks/show", status: :unprocessable_entity
        end
      end
      format.json do
        if @comment.save
          render json: @comment, status: :created
        else
          render json: { errors: @comment.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end

  def destroy
    @comment = @task.comments.find(params[:id])
    @comment.destroy
    respond_to do |format|
      format.html { redirect_to @task, notice: "Comment deleted." }
      format.json { head :no_content }
    end
  end

  private

  def set_task
    @task = Task.find(params[:task_id])
  end

  def comment_params
    params.require(:comment).permit(:body)
  end
end
