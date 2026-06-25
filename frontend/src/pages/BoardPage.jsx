import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useBoard } from '../hooks/useBoard';
import { taskApi, boardApi } from '../api/awsApi';
import Column from '../components/Board/Column';
import InviteMemberModal from '../components/Board/InviteMemberModal';

export function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { board, tasks, setTasks, loading, error, refetch } = useBoard(boardId);
  const [showInviteModal, setShowInviteModal] = useState(false);

  if (loading) return <div className="loading-screen">Loading board...</div>;
  if (error || !board) return <div className="loading-screen" style={{ color: 'var(--danger)' }}>Error loading board</div>;

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic UI update
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.taskId === draggableId);
    if (taskIndex === -1) return;
    
    const taskToMove = updatedTasks[taskIndex];
    updatedTasks.splice(taskIndex, 1); // remove from old position

    // Change column and position
    taskToMove.columnId = destination.droppableId;
    taskToMove.position = destination.index;

    // Insert at new position
    const tasksInNewColumn = updatedTasks.filter(t => t.columnId === destination.droppableId)
                                          .sort((a, b) => a.position - b.position);
    
    // Adjust positions for other tasks in the column
    tasksInNewColumn.splice(destination.index, 0, taskToMove);
    
    const finalTasks = updatedTasks.filter(t => t.columnId !== destination.droppableId).concat(
      tasksInNewColumn.map((t, idx) => ({ ...t, position: idx }))
    );
    
    setTasks(finalTasks);

    // Call API
    try {
      await taskApi.moveTask({
        boardId,
        taskId: draggableId,
        newColumnId: destination.droppableId,
        newPosition: destination.index
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      refetch(); // Rollback on failure
    }
  };

  const getTasksByColumn = (columnId) => {
    return tasks
      .filter(t => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  };

  const handleDeleteBoard = async () => {
    if (confirm('Are you sure you want to delete this board? All tasks will be lost.')) {
      try {
        await boardApi.deleteBoard(boardId);
        navigate('/dashboard');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="board-view" style={{ backgroundColor: board.backgroundColor }}>
      <div className="board-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.2rem' }}>
            ←
          </Link>
          <h1 style={{ color: 'white' }}>{board.name}</h1>
        </div>
        
        <div className="board-actions">
          <div className="members-stack" style={{ marginRight: '1rem' }}>
            {board.members.map(m => (
              <div key={m.userId} className="avatar" title={`${m.displayName} (${m.role})`}>
                {m.displayName.charAt(0)}
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => setShowInviteModal(true)}>
            + Invite
          </button>
          <button className="btn-secondary" style={{ color: '#fca5a5' }} onClick={handleDeleteBoard}>
            Delete Board
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {board.columns
            .sort((a, b) => a.position - b.position)
            .map(column => (
              <Column
                key={column.id}
                column={column}
                tasks={getTasksByColumn(column.id)}
                boardId={board.boardId}
                members={board.members}
                refetch={refetch}
              />
            ))
          }
        </div>
      </DragDropContext>

      {showInviteModal && (
        <InviteMemberModal 
          boardId={boardId} 
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            refetch(true);
          }}
        />
      )}
    </div>
  );
}
