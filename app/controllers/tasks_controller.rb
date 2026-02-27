class TasksController < ApplicationController
  before_action :set_task, only: [ :show, :edit, :update, :destroy ]

  def reorder
    ActiveRecord::Base.transaction do
      params.require(:tasks).each do |item|
        Task.find(item[:id]).update_column(:position, item[:position])
      end
    end
    head :ok
  end

  def index
    @tasks = Task.all
    @tasks = @tasks.where(status: params[:status]) if params[:status].present?
    respond_to do |format|
      format.html
      format.json { render json: @tasks.includes(:comments).as_json(include: :comments) }
    end
  end

  def show
    @comment = Comment.new
    respond_to do |format|
      format.html
      format.json { render json: @task.as_json(include: :comments) }
    end
  end

  def new
    @task = Task.new
  end

  def create
    @task = Task.new(task_params)
    respond_to do |format|
      format.html do
        if @task.save
          redirect_to @task, notice: t(".success")
        else
          render :new, status: :unprocessable_entity
        end
      end
      format.json do
        if @task.save
          render json: @task.as_json(include: :comments), status: :created
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end

  def edit
  end

  def update
    respond_to do |format|
      format.html do
        if @task.update(task_params)
          redirect_to @task, notice: t(".success")
        else
          render :edit, status: :unprocessable_entity
        end
      end
      format.json do
        if @task.update(task_params)
          render json: @task.as_json(include: :comments)
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end

  def destroy
    @task.destroy
    respond_to do |format|
      format.html { redirect_to tasks_path, notice: t(".success") }
      format.json { head :no_content }
    end
  end

  private

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :description, :status, :position)
  end
end
