class AddPositionToTasks < ActiveRecord::Migration[7.1]
  def up
    add_column :tasks, :position, :integer
    # Assign initial positions per status group, ordered by created_at
    Task::STATUSES.each do |status|
      Task.where(status: status).order(:created_at).each_with_index do |task, i|
        task.update_column(:position, i)
      end
    end
    change_column_null :tasks, :position, false
  end

  def down
    remove_column :tasks, :position
  end
end
