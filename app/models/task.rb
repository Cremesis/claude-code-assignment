class Task < ApplicationRecord
  STATUSES = %w[todo in_progress done].freeze

  has_many :comments, dependent: :destroy

  enum :status, { todo: "todo", in_progress: "in_progress", done: "done" }

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }

  validate :status_can_only_advance, on: :update

  default_scope { order(position: :asc) }

  before_create :assign_position
  before_validation :reassign_position_on_status_change, on: :update

  private

  def assign_position
    self.position = (Task.where(status: status).maximum(:position) || -1) + 1
  end

  def reassign_position_on_status_change
    if status_changed?
      self.position = (Task.where(status: status).maximum(:position) || -1) + 1
    end
  end

  def status_can_only_advance
    old_index = STATUSES.index(status_was)
    new_index = STATUSES.index(status)
    errors.add(:status, "can only advance forward") if new_index < old_index
  end
end
