import React, { useState } from 'react';

const TaskItem = ({ task, isCreator, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-danger';
      case 'medium':
        return 'bg-warning';
      case 'low':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = () => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    onUpdate({ ...task, status: newStatus });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(editedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTask({ ...task });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="card task-card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor={`title-${task.id}`} className="form-label">Title</label>
              <input
                type="text"
                className="form-control"
                id={`title-${task.id}`}
                name="title"
                value={editedTask.title}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor={`description-${task.id}`} className="form-label">Description</label>
              <textarea
                className="form-control"
                id={`description-${task.id}`}
                name="description"
                value={editedTask.description}
                onChange={handleChange}
                rows="3"
              ></textarea>
            </div>
            
            <div className="mb-3">
              <label htmlFor={`priority-${task.id}`} className="form-label">Priority</label>
              <select
                className="form-select"
                id={`priority-${task.id}`}
                name="priority"
                value={editedTask.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-secondary me-2" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`card task-card ${task.status === 'completed' ? 'bg-light' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            {task.title}
            <span className={`badge ms-2 ${getPriorityBadgeClass(task.priority)}`}>
              {task.priority}
            </span>
          </h5>
          <div>
            {isCreator && (
              <>
                <button 
                  className="btn btn-sm btn-outline-primary me-1" 
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        
        <p className="card-text mt-2">{task.description}</p>
        
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Created: {new Date(task.createdAt).toLocaleString()}
          </small>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id={`status-${task.id}`}
              checked={task.status === 'completed'}
              onChange={handleStatusChange}
            />
            <label className="form-check-label" htmlFor={`status-${task.id}`}>
              {task.status === 'completed' ? 'Completed' : 'Pending'}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem; 