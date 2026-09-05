// Generic glass-styled table. `columns`: [{ key, label, render? }],
// `rows`: array of data objects. Falls back to `row[key]` when no render fn
// is given.
export default function GlassTable({ columns, rows, getRowKey, emptyMessage = 'Nothing to show yet.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-faint">{emptyMessage}</p>
  }
  return (
    <div className="table-scroll">
      <table className="glass-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getRowKey ? getRowKey(row) : i}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
