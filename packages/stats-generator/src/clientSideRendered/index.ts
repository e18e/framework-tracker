import { startBenchmarkServer } from '../benchmark-server.ts'
import type { BenchmarkServerConfig } from '../serving-frameworks.ts'
import { getHost } from '../serve/common.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { ClientSideRenderedBenchmarkResult } from './types.ts'

const CLIENT_SIDE_RENDERED_HOST = getHost()
const CLIENT_SIDE_RENDERED_PORT = 3001

type ClientSideRenderedFrameworkConfig = BenchmarkServerConfig & {
  name: string
  displayName: string
  fullDocumentNavigation: boolean
}

const CLIENT_SIDE_RENDERED_FRAMEWORKS: ClientSideRenderedFrameworkConfig[] = [
  {
    name: 'webui-client-side-rendered',
    displayName: 'WebUI Client Side Rendered',
    package: 'app-webui',
    serveBinary: 'app-webui',
    fullDocumentNavigation: true,
  },
  {
    name: 'astro-client-side-rendered',
    displayName: 'Astro Client Side Rendered',
    package: 'app-astro',
    serveScript: 'astro.ts',
    fullDocumentNavigation: true,
  },
  {
    name: 'next-client-side-rendered',
    displayName: 'Next.js Client Side Rendered',
    package: 'app-next-js',
    serveScript: 'next.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'nuxt-client-side-rendered',
    displayName: 'Nuxt Client Side Rendered',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'pracht-client-side-rendered',
    displayName: 'Pracht Client Side Rendered',
    package: 'app-pracht',
    serveScript: 'pracht.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'react-router-client-side-rendered',
    displayName: 'React Router Client Side Rendered',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'solid-start-client-side-rendered',
    displayName: 'SolidStart Client Side Rendered',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'solid-client-side-rendered',
    displayName: 'Solid 2.0 Client Side Rendered',
    package: 'app-solid',
    serveScript: 'solid.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'sveltekit-client-side-rendered',
    displayName: 'SvelteKit Client Side Rendered',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
    fullDocumentNavigation: false,
  },
  {
    name: 'tanstack-start-client-side-rendered',
    displayName: 'TanStack Start Client Side Rendered',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
    fullDocumentNavigation: false,
  },
]

export async function runClientSideRenderedBenchmark(
  packageName: string,
  runs = 5,
): Promise<ClientSideRenderedBenchmarkResult> {
  const config = CLIENT_SIDE_RENDERED_FRAMEWORKS.find(
    (f) => f.package === packageName,
  )

  if (!config) {
    throw new Error(
      `Unknown client-side rendered package: ${packageName}. Available: ${CLIENT_SIDE_RENDERED_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await startBenchmarkServer(config, {
    host: CLIENT_SIDE_RENDERED_HOST,
    port: CLIENT_SIDE_RENDERED_PORT,
    readinessPath: '/client-side-rendered',
  })

  try {
    console.info(
      `Running client-side rendered benchmark for ${config.displayName}...`,
    )
    return await runBenchmark(
      `http://${CLIENT_SIDE_RENDERED_HOST}:${CLIENT_SIDE_RENDERED_PORT}`,
      config.name,
      config.displayName,
      runs,
      config.fullDocumentNavigation,
    )
  } finally {
    killServer()
  }
}
