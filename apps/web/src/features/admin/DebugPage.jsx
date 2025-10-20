import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

export default function DebugPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['debug-db'],
    queryFn: async () => {
      const res = await api.get('/debug/db')
      return res.data.data
    },
  })

  if (isLoading) return <p>Loading database...</p>
  if (error) return <p>Error loading database: {error.message}</p>

  return (
    <div>
      <h2>Database Debug View</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Esta es una vista en tiempo real de la base de datos en memoria.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h3>Buildings ({data?.buildings?.length || 0})</h3>
        {data?.buildings?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Campus ID</th>
              </tr>
            </thead>
            <tbody>
              {data.buildings.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.id}</td>
                  <td style={tdStyle}>{item.code}</td>
                  <td style={tdStyle}>{item.name}</td>
                  <td style={tdStyle}>{item.campus_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No buildings</p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>Floors ({data?.floors?.length || 0})</h3>
        {data?.floors?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Building ID</th>
                <th style={thStyle}>Number</th>
              </tr>
            </thead>
            <tbody>
              {data.floors.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.id}</td>
                  <td style={tdStyle}>{item.building_id}</td>
                  <td style={tdStyle}>{item.number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No floors</p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>Rooms ({data?.rooms?.length || 0})</h3>
        {data?.rooms?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Building ID</th>
                <th style={thStyle}>Floor ID</th>
                <th style={thStyle}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.id}</td>
                  <td style={tdStyle}>{item.code}</td>
                  <td style={tdStyle}>{item.name || '-'}</td>
                  <td style={tdStyle}>{item.building_id}</td>
                  <td style={tdStyle}>{item.floor_id}</td>
                  <td style={tdStyle}>{item.capacity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No rooms</p>
        )}
      </section>

      <section>
        <h3>Raw JSON</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto', maxHeight: '400px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </div>
  )
}

const thStyle = {
  border: '1px solid #ccc',
  padding: '0.5rem',
  textAlign: 'left',
  background: '#f0f0f0',
  fontWeight: 'bold',
}

const tdStyle = {
  border: '1px solid #ccc',
  padding: '0.5rem',
}
