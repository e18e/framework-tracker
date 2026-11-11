export type BenchmarkServerConfig = { package: string } & (
  { serveScript: string } | { serveBinary: string }
)

export type ServingFrameworkConfig = BenchmarkServerConfig & {
  displayName: string
  fullDocumentNavigation: boolean
}

export const servingFrameworks: ServingFrameworkConfig[] = [
  {
    displayName: 'WebUI Server Side Rendered',
    package: 'app-webui',
    serveBinary: 'app-webui',
    fullDocumentNavigation: true,
  },
  {
    displayName: 'Astro Server Side Rendered',
    package: 'app-astro',
    serveScript: 'astro.ts',
    fullDocumentNavigation: true,
  },
  {
    displayName: 'Next.js Server Side Rendered',
    package: 'app-next-js',
    serveScript: 'next.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'Nuxt Server Side Rendered',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'Pracht Server Side Rendered',
    package: 'app-pracht',
    serveScript: 'pracht.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'React Router Server Side Rendered',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'SolidStart Server Side Rendered',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'Solid 2.0 Server Side Rendered',
    package: 'app-solid',
    serveScript: 'solid.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'SvelteKit Server Side Rendered',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
    fullDocumentNavigation: false,
  },
  {
    displayName: 'TanStack Start Server Side Rendered',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
    fullDocumentNavigation: false,
  },
]
