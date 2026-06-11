import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  rows?: number
  columns?: number
}

export function LoadingSkeleton({ rows = 5, columns = 6 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-52 rounded-2xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-2xl" />
          <Skeleton className="h-9 w-28 rounded-2xl" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-72 rounded-2xl" />
        <Skeleton className="h-10 w-36 rounded-2xl" />
        <Skeleton className="h-10 w-28 rounded-2xl" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card/40">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4">
                  <Skeleton className="h-4 w-24 rounded-xl" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row} className="border-b last:border-0">
                {Array.from({ length: columns }).map((_, col) => (
                  <td key={col} className="p-4">
                    <Skeleton
                      className={cn(
                        "h-4 rounded-xl",
                        col === columns - 1 ? "w-16" : "w-full"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
