import { useEffect, useState } from 'react'
import api from '@/lib/api'

type Status = 'checking' | 'connected' | 'error'

export default function HealthCheck() {
  const [status, setStatus] = useState<Status>('checking')
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    const check = async () => {
      const start = Date.now()
      try {
        await api.get('/health')
        setLatency(Date.now() - start)
        setStatus('connected')
      } catch {
        setStatus('error')
      }
    }

    void check()
  }, [])

  const statusConfig = {
    checking: {
      dot: 'bg-amber-400 animate-pulse',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Checking...',
    },
    connected: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: `Backend: Connected ✓${latency !== null ? ` (${latency}ms)` : ''}`,
    },
    error: {
      dot: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: 'Backend: Disconnected ✗',
    },
  }[status]

  return (
    <div
      id="health-check"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dot}`} />
      <span className={`text-xs font-medium ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
    </div>
  )
}
