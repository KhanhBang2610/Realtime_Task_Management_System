import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Project <span className="text-indigo-600">#{id}</span>
      </h1>
      <EmptyState
        title="No tasks yet"
        description="Add tasks to this project to get started."
      />
    </div>
  )
}
