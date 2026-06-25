import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from '../Task/TaskCard';
import CreateTaskForm from '../Task/CreateTaskForm';

export default function Column({ column, tasks, boardId, members, refetch }) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="kanban-column">
      <div className="column-header">
        <span>{column.name}</span>
        <span className="task-count">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.taskId}
                task={task}
                index={index}
                members={members}
                refetch={refetch}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {showCreateForm ? (
        <CreateTaskForm
          boardId={boardId}
          columnId={column.id}
          position={tasks.length}
          onClose={() => setShowCreateForm(false)}
          refetch={refetch}
        />
      ) : (
        <button
          className="btn-add-task"
          onClick={() => setShowCreateForm(true)}
        >
          + Add task
        </button>
      )}
    </div>
  );
}
