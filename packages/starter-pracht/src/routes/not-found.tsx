export function head() {
  return {
    title: 'Page not found',
    meta: [{ content: 'noindex', name: 'robots' }],
  }
}

export function Component() {
  return (
    <section>
      <p style={{ color: '#555', marginBottom: '8px' }}>404</p>
      <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, margin: '0 0 16px' }}>
        Page not found.
      </h1>
      <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '24px' }}>
        The page you asked for does not exist. It may have moved, or the link
        may be wrong.
      </p>
      {/* A plain anchor keeps this page independent of the route table.
          Use a typed <Link> once you want client-side navigation. */}
      <a href="/">Back to home</a>
    </section>
  )
}
