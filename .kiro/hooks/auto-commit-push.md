# Auto Commit and Push Hook

## Description
Automatically commits changes and pushes to origin after each task is completed in the circuit learning game spec.

## Trigger
- **Event**: Task Status Change
- **Condition**: Task status changes to "completed" in circuit-learning-game spec
- **File Pattern**: `.kiro/specs/circuit-learning-game/tasks.md`

## Actions
1. Stage all changes in the workspace
2. Create a commit with a descriptive message including the completed task
3. Push changes to the origin remote

## Configuration
```json
{
  "name": "Auto Commit and Push on Task Completion",
  "description": "Automatically commits and pushes changes when a circuit learning game task is completed",
  "trigger": {
    "type": "file_change",
    "pattern": ".kiro/specs/circuit-learning-game/tasks.md",
    "condition": "task_completed"
  },
  "actions": [
    {
      "type": "git_commit_push",
      "message_template": "Complete task: {task_name}\n\n{task_description}",
      "include_all_changes": true,
      "push_to_origin": true
    }
  ],
  "enabled": true
}
```

## Implementation Notes
- The hook will extract the task name and description from the completed task
- All workspace changes will be included in the commit
- The commit message will follow the format: "Complete task: [task name]"
- Changes will be automatically pushed to the origin remote
- The hook only triggers for the circuit-learning-game spec to avoid interfering with other projects