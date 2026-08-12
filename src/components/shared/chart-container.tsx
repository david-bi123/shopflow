'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Measures its own box with a ResizeObserver and passes concrete pixel
 * dimensions to the chart child. This replaces recharts' ResponsiveContainer,
 * whose width/height measurement breaks under the React Compiler (it stays
 * at -1, so the chart never paints).
 *
 * Usage:
 *   <ChartContainer className="h-72">
 *     {({ width, height }) => (
 *       <AreaChart width={width} height={height} data={...}>...</AreaChart>
 *     )}
 *   </ChartContainer>
 */
export function ChartContainer({
  className,
  children,
}: {
  className?: string
  children: (size: { width: number; height: number }) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height })
      }
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0
        ? children({ width: size.width, height: size.height })
        : null}
    </div>
  )
}