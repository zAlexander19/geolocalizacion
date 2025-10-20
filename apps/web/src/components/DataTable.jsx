import Button from './ui/button'

export default function DataTable({ columns, data, onEdit, onDelete }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Sin datos</p>

  // Prefer the most specific identifier first to avoid duplicate keys (e.g., rooms share id_piso)
  const getRowId = (row) => row.id_sala || row.id_piso || row.id_edificio || row.id || JSON.stringify(row)

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-gray-100/10">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-semibold border-b border-border">
                {col.label}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-semibold border-b border-border">Comportamiento</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowId(row)} className="hover:bg-gray-100/5">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 border-b border-border align-middle">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              <td className="px-3 py-2 border-b border-border space-x-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(row)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(row)}>Borrar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
