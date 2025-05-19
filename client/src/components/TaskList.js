import React from 'react';
import TaskItem from './TaskItem';

const TaskList = ({ tasks, currentClientId, onUpdateTask, onDeleteTask }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="alert alert-info">
        No tasks available. Create your first task!
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3">Tasks ({tasks.length})</h3>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          isCreator={task.createdBy === currentClientId}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
        />
      ))}
    </div>
  );
};

export default TaskList; 