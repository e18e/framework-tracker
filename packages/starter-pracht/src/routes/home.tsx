import type { LoaderArgs, RouteComponentProps } from '@pracht/core'

export async function loader(_args: LoaderArgs) {
  return {
    adapter: 'Node.js',
    steps: [
      'Edit src/routes/home.tsx to change this page.',
      'Add more routes in src/routes.ts.',
      'Add API handlers in src/api/*.ts.',
    ],
  }
}

export function Component({ data }: RouteComponentProps<typeof loader>) {
  return (
    <section>
      <p style={{ color: '#555', marginBottom: '8px' }}>Starter ready.</p>
      <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, margin: '0 0 16px' }}>
        Your pracht app is up and running.
      </h1>
      <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '24px' }}>
        This starter is configured for <strong>{data.adapter}</strong>.
      </p>
      <ul style={{ lineHeight: 1.8, paddingLeft: '20px' }}>
        {data.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <p style={{ marginTop: '24px' }}>
        Check <code>/api/health</code> for a simple API route.
      </p>
    </section>
  )
}
