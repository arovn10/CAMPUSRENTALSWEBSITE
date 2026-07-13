'use client'

import PipelineTasks from '@/components/PipelineTasks'

export default function PipelineTrackerTasks() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900">Tasks</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-ink-600">
          Manage tasks and track progress across your deals
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft ring-1 ring-ink-900/5 p-4 sm:p-6">
        <PipelineTasks />
      </div>
    </div>
  )
}

