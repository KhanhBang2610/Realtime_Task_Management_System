import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { boardApi } from '../api/awsApi';

function CreateBoardModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await boardApi.createBoard({ name, description });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Board</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Board Name</label>
              <input 
                className="form-control" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="e.g. Sprint 1"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="form-control" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const data = await boardApi.listMyBoards();
      setBoards(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  if (loading) return <div className="loading-screen">Loading boards...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Boards</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Board
        </button>
      </div>

      <div className="boards-grid">
        {boards.map(board => (
          <Link key={board.boardId} to={`/board/${board.boardId}`} className="board-card">
            <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: board.backgroundColor || 'var(--primary)' }}></div>
            <h3>{board.name}</h3>
            <p>{board.description || 'No description'}</p>
            <div className="board-meta">
              <span>{new Date(board.updatedAt).toLocaleDateString()}</span>
              <div className="members-stack">
                {board.members.slice(0, 3).map(m => (
                  <div key={m.userId} className="avatar" title={m.displayName}>
                    {m.displayName.charAt(0)}
                  </div>
                ))}
                {board.members.length > 3 && (
                  <div className="avatar">+{board.members.length - 3}</div>
                )}
              </div>
            </div>
          </Link>
        ))}
        {boards.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            You don't have any boards yet. Create one to get started!
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateBoardModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            loadBoards();
          }} 
        />
      )}
    </div>
  );
}
