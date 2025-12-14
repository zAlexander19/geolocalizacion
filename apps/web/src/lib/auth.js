// Gestión de autenticación y tokens

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const authService = {
  // Guardar token de forma segura
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    }
  },

  // Obtener token
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  // Eliminar token
  removeToken() {
    localStorage.removeItem(TOKEN_KEY)
  },

  // Guardar datos del usuario
  setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  },

  // Obtener datos del usuario
  getUser() {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  // Eliminar datos del usuario
  removeUser() {
    localStorage.removeItem(USER_KEY)
  },

  // Verificar si está autenticado
  isAuthenticated() {
    const token = this.getToken()
    if (!token) return false

    // Verificar si el token ha expirado (JWT)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiry = payload.exp * 1000 // Convertir a milisegundos
      
      if (Date.now() >= expiry) {
        // Token expirado
        this.logout()
        return false
      }
      
      return true
    } catch (e) {
      // Token inválido
      this.logout()
      return false
    }
  },

  // Logout completo
  logout() {
    this.removeToken()
    this.removeUser()
  },

  // Login con API real
  async login(email, password) {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { default: api } = await import('./api.js')
      
      const response = await api.post('/auth/login', { email, password })
      const { token, usuario } = response.data.data
      
      // Mapear rol del backend al formato del frontend
      const user = {
        id: usuario.id.toString(),
        email: usuario.email,
        name: usuario.nombre,
        role: usuario.rol === 'admin_primario' ? 'super-admin' : 'admin'
      }
      
      this.setToken(token)
      this.setUser(user)

      return { token, user }
    } catch (error) {
      console.error('Error en login:', error)
      throw new Error(error.response?.data?.message || 'Credenciales inválidas')
    }
  },

  // Generar token mock (solo para desarrollo)
  generateMockToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // Expira en 24 horas
    }))
    const signature = 'mock-signature'
    
    return `${header}.${payload}.${signature}`
  },

  // Obtener rol del usuario actual
  getUserRole() {
    const user = this.getUser()
    return user?.role || null
  },

  // Verificar si es super admin
  isSuperAdmin() {
    return this.getUserRole() === 'super-admin'
  },

  // Verificar si es admin (cualquier tipo)
  isAdmin() {
    const role = this.getUserRole()
    return role === 'admin' || role === 'super-admin'
  }
}
