import { useState, useEffect, useCallback } from 'react';
import { boardApi, taskApi, subscriptionApi } from '../api/awsApi';

export function useBoard(boardId) {
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBoard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [boardData, tasksData] = await Promise.all([
        boardApi.getBoard(boardId),
        taskApi.listTasksByBoard(boardId)
      ]);
      setBoard(boardData);
      setTasks(tasksData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    fetchBoard();


    const unsubTaskCreated = subscriptionApi.subscribeToTaskCreated(boardId, (newTask) => {
      setTasks(prev => [...prev, newTask]);
    });

    const unsubTaskUpdated = subscriptionApi.subscribeToTaskUpdated(boardId, (updatedTask) => {
      setTasks(prev => prev.map(t => t.taskId === updatedTask.taskId ? updatedTask : t));
    });

    const unsubTaskDeleted = subscriptionApi.subscribeToTaskDeleted(boardId, (deletedTask) => {
      setTasks(prev => prev.filter(t => t.taskId !== deletedTask.taskId));
    });

    const unsubBoardUpdated = subscriptionApi.subscribeToBoardUpdated(boardId, (updatedBoard) => {
      setBoard(updatedBoard);
    });

    return () => {
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskDeleted();
      unsubBoardUpdated();
    };
  }, [boardId, fetchBoard]);

  return { board, tasks, setTasks, loading, error, refetch: fetchBoard };
}
