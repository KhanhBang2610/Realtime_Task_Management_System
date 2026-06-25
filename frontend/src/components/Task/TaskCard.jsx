import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import TaskDetail from './TaskDetail';

export default function TaskCard({ task, index, members, refetch }) {
  const [showDetail, setShowDetail] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'var(--urgent)';
      case 'HIGH': return 'var(--high)';
      case 'MEDIUM': return 'var(--medium)';
      case 'LOW': return 'var(--low)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <>
      <Draggable draggableId={task.taskId} index={index}>
        {(provided, snapshot) => (
          <div
            className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShowDetail(true)}
          >
            {task.labels && task.labels.length > 0 && (
              <div className="task-labels">
                {task.labels.map(label => (
                  <span key={label} className="label-badge">{label}</span>
                ))}
              </div>
            )}

            <h4 className="task-title">{task.title}</h4>

            <div className="task-footer">
              <div className="priority-indicator">
                <span
                  className="priority-dot"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                  title={`Priority: ${task.priority}`}
                />
                {task.dueDate && (
                  <span style={{ fontSize: '0.75rem' }}>
                    📅 {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {task.assigneeName && (
                <div 
                  className="avatar" 
                  style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}
                  title={task.assigneeName}
                >
                  {task.assigneeName.charAt(0)}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {showDetail && (
        <TaskDetail
          task={task}
          members={members}
          onClose={() => setShowDetail(false)}
          refetch={refetch}
        />
      )}
    </>
  );
}
