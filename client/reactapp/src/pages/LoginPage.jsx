export default function LoginPage() {
  function handleSubmit(e) {
    e.preventDefault()
    // POST to Express / MongoDB when auth is wired up
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
            />
          </div>
          <div className="login-actions">
            <button type="submit">Sign in</button>
          </div>
        </form>
        <p className="login-hint">
          Form submit is handled in React — connect your API route when ready.
        </p>
      </div>
    </main>
  )
}
