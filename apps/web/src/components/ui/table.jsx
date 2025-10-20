export function Table({ children, className }) {
  return <div className={className}><table className="w-full text-sm">{children}</table></div>
}
export function THead({ children }) {
  return <thead className="bg-gray-100/10"><tr>{children}</tr></thead>
}
export function TH({ children }) {
  return <th className="text-left font-semibold p-2 border-b border-border">{children}</th>
}
export function TBody({ children }) {
  return <tbody>{children}</tbody>
}
export function TR({ children, className }) {
  return <tr className={className}>{children}</tr>
}
export function TD({ children }) {
  return <td className="p-2 border-b border-border align-middle">{children}</td>
}
