pub mod db;
pub mod models;
pub mod sync;
pub mod vault;

#[cfg(test)]
mod tests {
    use super::db::TaxonDb;
    use super::models::Task;
    use rusqlite::Connection;

    fn setup_in_memory_db() -> TaxonDb {
        let conn = Connection::open_in_memory().unwrap();
        TaxonDb::from_conn(conn)
    }

    #[test]
    fn test_create_and_list_task() {
        let db = setup_in_memory_db();
        let task = Task {
            id: "task-123456".to_string(),
            project_id: Some("proj-1".to_string()),
            sprint_id: None,
            title: "Test Task".to_string(),
            completed: false,
            duration: None,
            priority: "High".to_string(),
            status: "To Do".to_string(),
            due_date: None,
            description: None,
            labels: Some(vec!["test".to_string()]),
            reminders: None,
            deadline: None,
            subtasks: None,
            time_effort: None,
            time_spent: None,
            sort_order: Some(1),
            archived: false,
            archived_at: None,
            workspace_path: None,
            linked_files: None,
            depends_on: None,
            module_group: None,
        };

        db.create_task(&task).unwrap();

        let tasks = db.list_tasks(Some("proj-1")).unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Test Task");
        assert_eq!(tasks[0].priority, "High");
        assert_eq!(tasks[0].labels, Some(vec!["test".to_string()]));
    }

    #[test]
    fn test_complete_task_pattern() {
        let db = setup_in_memory_db();
        let task = Task {
            id: "task-abcdef".to_string(),
            project_id: None,
            sprint_id: None,
            title: "Complete Me".to_string(),
            completed: false,
            duration: None,
            priority: "Medium".to_string(),
            status: "To Do".to_string(),
            due_date: None,
            labels: None,
            reminders: None,
            deadline: None,
            subtasks: None,
            time_effort: None,
            time_spent: None,
            sort_order: Some(0),
            archived: false,
            archived_at: None,
            workspace_path: None,
            linked_files: None,
            depends_on: None,
            module_group: None,
            description: None,
        };

        db.create_task(&task).unwrap();

        let updated = db.complete_task("abcdef").unwrap();
        assert_eq!(updated, 1);

        let tasks = db.list_tasks(None).unwrap();
        assert!(tasks[0].completed);
        assert_eq!(tasks[0].status, "Done");
    }
}
