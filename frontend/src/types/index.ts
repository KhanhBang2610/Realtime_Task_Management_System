// Task types
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  assigneeId?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

// User types
export type UserRole = 'admin' | 'member' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: UserRole
  createdAt: string
}

// Notification types
export type NotificationType = 'task_assigned' | 'task_updated' | 'comment_added' | 'mention'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  userId: string
  relatedEntityId?: string
  createdAt: string
}

// Activity log types
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'commented' | 'assigned'

export interface ActivityLog {
  id: string
  action: ActivityAction
  entityType: 'task' | 'project' | 'user'
  entityId: string
  entityTitle: string
  userId: string
  userName: string
  createdAt: string
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}
