import { useState } from 'react';
import { boardApi } from '../../api/awsApi';

export default function InviteMemberModal({ boardId, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await boardApi.inviteMember(boardId, email, role);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to invite member');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Member</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>User Email</label>
              <input 
                type="email"
                className="form-control" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="user@example.com"
              />
            </div>
            
            <div className="form-group">
              <label>Role</label>
              <select 
                className="form-control" 
                value={role} 
                onChange={e => setRole(e.target.value)}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
