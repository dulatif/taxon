pub mod db;
pub mod models;

#[cfg(test)]
mod tests {
    use super::db::TaxonDb;
    use super::models::Task;
    use rusqlite::Connection;

    fn setup_in_memory_db() -> TaxonDb {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                projectId TEXT,
                sprintId TEXT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                priority TEXT NOT NULL DEFAULT 'Medium',
                status TEXT NOT NULL DEFAULT 'To Do',
                description TEXT,
                dueDate TEXT,
                labels TEXT,
                timeEffort INTEGER,
                timeSpent INTEGER,
                sortOrder INTEGER NOT NULL DEFAULT 0,
                archived INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE sprints (
                id TEXT PRIMARY KEY,
                projectId TEXT,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Planned',
                startDate TEXT NOT NULL,
                endDate TEXT NOT NULL,
                goal TEXT
            );
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                progress INTEGER,
                dueDate TEXT,
                vaultPath TEXT
            );",
        )
        .unwrap();

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
            priority: "High".to_string(),
            status: "To Do".to_string(),
            description: None,
            due_date: None,
            labels: Some(vec!["test".to_string()]),
            time_effort: None,
            time_spent: None,
            sort_order: Some(1),
            archived: false,
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
            priority: "Medium".to_string(),
            status: "To Do".to_string(),
            description: None,
            due_date: None,
            labels: None,
            time_effort: None,
            time_spent: None,
            sort_order: Some(0),
            archived: false,
        };

        db.create_task(&task).unwrap();

        let updated = db.complete_task("abcdef").unwrap();
        assert_eq!(updated, 1);

        let tasks = db.list_tasks(None).unwrap();
        assert!(tasks[0].completed);
        assert_eq!(tasks[0].status, "Done");
    }
}
