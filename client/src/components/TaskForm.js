import React, { useState } from 'react';

const TaskForm = ({ onSubmit }) => {
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTask(prevTask => ({
      ...prevTask,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!task.title.trim()) {
      alert('Please enter a task title');
      return;
    }
    
    onSubmit(task);
    
    // Reset form
    setTask({
      title: '',
      description: '',
      priority: 'medium'
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="title" className="form-label">Title</label>
        <input
          type="text"
          className="form-control"
          id="title"
          name="title"
          value={task.title}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description</label>
        <textarea
          className="form-control"
          id="description"
          name="description"
          value={task.description}
          onChange={handleChange}
          rows="3"
        ></textarea>
      </div>
      
      <div className="mb-3">
        <label htmlFor="priority" className="form-label">Priority</label>
        <select
          className="form-select"
          id="priority"
          name="priority"
          value={task.priority}
          onChange={handleChange}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      
      <button type="submit" className="btn btn-primary w-100">Create Task</button>
    </form>
  );
};

export default TaskForm; 