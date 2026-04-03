import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()

      if (response.ok) {
        navigate("/dashboard")  // ← redirects to dashboard
      } else {
        setMessage(data.error || "Login failed")
      }
    } catch (err) {
      setMessage("Could not connect to server")
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="subtitle">
          Access your investment portfolio builder. Credentials will be verified
          against your database when the backend is connected.
        </p>
        <form method="post" action="#" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && <p>{message}</p>}
          <div className="login-actions">
            <button type="submit">Sign in</button>
          </div>
        </form>
      </div>
    </main>
  )
}