import { useState } from 'react';
import { taskApi } from '../../api/awsApi';

export default function CreateTaskForm({ boardId, columnId, position, onClose, refetch }) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await taskApi.createTask({
        boardId,
        columnId,
        title,
        position: position || 0,
        priority: 'MEDIUM',
      });
      if (refetch) await refetch(true); // Silent refetch
      onClose();
    } catch (err) {
      console.error('CreateTask error:', JSON.stringify(err, null, 2));
      alert(err?.errors?.[0]?.message || err?.message || 'Lỗi tạo task');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '0 1rem 1rem' }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'var(--bg-card)', 
        padding: '0.75rem', 
        borderRadius: '0.5rem',
        border: '1px solid var(--primary)'
      }}>
        <input
          autoFocus
          className="form-control"
          style={{ background: 'transparent', border: 'none', padding: '0.25rem 0', marginBottom: '0.5rem' }}
          placeholder="What needs to be done?"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} disabled={isSubmitting}>
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
