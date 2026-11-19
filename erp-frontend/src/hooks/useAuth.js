import { useState, useEffect } from 'react'
import api from '../utils/api'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if(storedUser) setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    // 1. Login JWT
    const res = await api.post('/token/', { username, password })
    localStorage.setItem('access_token', res.data.access)
    
    // 2. Récupérer le profil avec role
    const userRes = await api.get('/users/profile/') // <-- ICI
    localStorage.setItem('user', JSON.stringify(userRes.data))
    setUser(userRes.data)
    return userRes.data
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return { user, login, logout, loading }
}