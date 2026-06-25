import { useState } from 'react';
import { taskApi } from '../../api/awsApi';

export default function TaskDetail({ task, onClose, members = [], refetch }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await taskApi.updateTask({
        boardId: task.boardId,
        taskId: task.taskId,
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
      });
      if (refetch) await refetch(true); // Silent refetch
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      setIsSaving(true);
      try {
        await taskApi.deleteTask(task.boardId, task.taskId);
        if (refetch) await refetch(true); // Silent refetch
        onClose();
      } catch (err) {
        console.error(err);
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task Details</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Title</label>
            <input 
              className="form-control" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="form-control" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Add a more detailed description..."
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Priority</label>
              <select 
                className="form-control" 
                value={priority} 
                onChange={e => setPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Assignee</label>
              <select 
                className="form-control" 
                value={assigneeId} 
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>{m.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}
            onClick={handleDelete}
            disabled={isSaving}
          >
            Delete Task
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
