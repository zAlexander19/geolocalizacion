export default function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>{label}</label>
      {children}
      {error && <p style={{ color: 'red', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>{error}</p>}
    </div>
  )
}
