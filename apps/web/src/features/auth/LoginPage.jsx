import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import { setToken } from '../../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const res = await api.post('/auth/login', credentials)
      return res.data
    },
    onSuccess: (data) => {
      if (data.data?.token) {
        setToken(data.data.token)
        navigate('/admin')
      } else {
        alert('Login failed: ' + (data.error || 'Unknown error'))
      }
    },
    onError: (err) => {
      alert('Login error: ' + (err.response?.data?.error || err.message))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate({ email, password })
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <button type="submit" disabled={loginMutation.isPending} style={{ padding: '0.5rem 1rem' }}>
          {loginMutation.isPending ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        Hint: admin@unap.cl / 123456
      </p>
    </div>
  )
}
