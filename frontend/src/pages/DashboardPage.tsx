import HealthCheck from '@/components/HealthCheck'
import { Badge } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back{user?.name ? `, ${user.name}` : ''}!
          </p>
        </div>
        <HealthCheck />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: '0', variant: 'info' as const },
          { label: 'In Progress', value: '0', variant: 'warning' as const },
          { label: 'Completed', value: '0', variant: 'success' as const },
          { label: 'Overdue', value: '0', variant: 'danger' as const },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
              <Badge variant={stat.variant}>{stat.value}</Badge>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <p className="text-sm text-gray-400 text-center py-8">No recent activity yet.</p>
      </div>
    </div>
  )
}
