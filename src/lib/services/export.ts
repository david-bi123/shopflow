export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): Response {
  if (data.length === 0) {
    return new Response('No data', { status: 400 })
  }

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header]
      const escaped = String(val ?? '').replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }

  const csvString = csvRows.join('\r\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })

  return new Response(blob, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

export function exportToJSON<T>(data: T[], filename: string): Response {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  })
}
