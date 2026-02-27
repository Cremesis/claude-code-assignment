tasks = [
  { title: "Set up project repository", status: "done" },
  { title: "Design database schema", status: "done" },
  { title: "Implement authentication", status: "in_progress" },
  { title: "Build kanban board UI", status: "in_progress" },
  { title: "Write API endpoints for tasks", status: "done" },
  { title: "Add drag and drop support", status: "in_progress" },
  { title: "Implement comments feature", status: "todo" },
  { title: "Write unit tests", status: "todo" },
  { title: "Set up CI/CD pipeline", status: "todo" },
  { title: "Deploy to staging environment", status: "todo" },
]

tasks.each do |attrs|
  Task.find_or_create_by!(title: attrs[:title]) do |t|
    t.status = attrs[:status]
  end
end

puts "Seeded #{Task.count} tasks."
