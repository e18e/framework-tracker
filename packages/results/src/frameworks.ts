import type { MeasurementName } from './measurements.ts'

export interface TestConfig {
  package: string
  buildScript: string
  buildOutputDir: string
  devServerPort?: number
  measurements: MeasurementName[]
}

export interface FrameworkConfig {
  name: string
  displayName: string
  frameworkPackage: string
  starter?: TestConfig
  app?: TestConfig
}

export const frameworks = [
  {
    name: 'baseline-html',
    displayName: 'Baseline HTML',
    frameworkPackage: 'node',
    app: {
      package: 'app-baseline-html',
      buildScript: 'build',
      buildOutputDir: '.',
      measurements: ['ssrRequestThroughput', 'ssrLoad'],
    },
  },
  {
    name: 'astro',
    displayName: 'Astro',
    frameworkPackage: 'astro',
    starter: {
      package: 'starter-astro',
      buildScript: 'build',
      buildOutputDir: 'dist',
      devServerPort: 4321,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-astro',
      buildScript: 'build',
      buildOutputDir: 'dist',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
      ],
    },
  },
  {
    name: 'next',
    displayName: 'Next.js',
    frameworkPackage: 'next',
    starter: {
      package: 'starter-next-js',
      buildScript: 'build',
      buildOutputDir: '.next',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-next-js',
      buildScript: 'build',
      buildOutputDir: '.next',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
        'ssrRouterLinkLoad',
      ],
    },
  },
  {
    name: 'nuxt',
    displayName: 'Nuxt',
    frameworkPackage: 'nuxt',
    starter: {
      package: 'starter-nuxt',
      buildScript: 'build',
      buildOutputDir: '.output',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-nuxt',
      buildScript: 'build',
      buildOutputDir: '.output',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
        'ssrRouterLinkLoad',
      ],
    },
  },
  {
    name: 'pracht',
    displayName: 'Pracht',
    frameworkPackage: '@pracht/core',
    starter: {
      package: 'starter-pracht',
      buildScript: 'build',
      buildOutputDir: 'dist',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-pracht',
      buildScript: 'build',
      buildOutputDir: 'dist',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
        'ssrRouterLinkLoad',
      ],
    },
  },
  {
    name: 'react-router',
    displayName: 'React Router',
    frameworkPackage: '@react-router/dev',
    starter: {
      package: 'starter-react-router',
      buildScript: 'build',
      buildOutputDir: 'build',
      devServerPort: 5173,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-react-router',
      buildScript: 'build',
      buildOutputDir: 'build',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
        'ssrRouterLinkLoad',
      ],
    },
  },
  {
    name: 'solid-start',
    displayName: 'SolidStart',
    frameworkPackage: '@solidjs/start',
    starter: {
      package: 'starter-solid-start',
      buildScript: 'build',
      buildOutputDir: '.output',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-solid-start',
      buildScript: 'build',
      buildOutputDir: '.output',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
      ],
    },
  },
  {
    name: 'solid',
    displayName: 'Solid 2.0',
    frameworkPackage: 'solid-js',
    starter: {
      package: 'starter-solid',
      buildScript: 'build',
      buildOutputDir: 'dist',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-solid',
      buildScript: 'build',
      buildOutputDir: 'dist',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
      ],
    },
  },
  {
    name: 'sveltekit',
    displayName: 'SvelteKit',
    frameworkPackage: '@sveltejs/kit',
    starter: {
      package: 'starter-sveltekit',
      buildScript: 'build',
      buildOutputDir: 'build',
      devServerPort: 5173,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-sveltekit',
      buildScript: 'build',
      buildOutputDir: 'build',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
      ],
    },
  },
  {
    name: 'webui',
    displayName: 'WebUI',
    frameworkPackage: '@microsoft/webui',
    app: {
      package: 'app-webui',
      buildScript: 'build',
      buildOutputDir: 'dist',
      measurements: [
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
      ],
    },
  },
  {
    name: 'tanstack',
    displayName: 'TanStack Start',
    frameworkPackage: '@tanstack/react-start',
    starter: {
      package: 'starter-tanstack-start-react',
      buildScript: 'build',
      buildOutputDir: '.output',
      devServerPort: 3000,
      measurements: [
        'install',
        'build',
        'devServer',
        'dependencies',
        'browserBaseline',
      ],
    },
    app: {
      package: 'app-tanstack-start-react',
      buildScript: 'build',
      buildOutputDir: '.output',
      measurements: [
        'ssrRequestThroughput',
        'clientSideRendered',
        'serverSideRendered',
        'initialLoad',
        'ssrLoad',
        'ssrRouterLinkLoad',
      ],
    },
  },
] satisfies FrameworkConfig[]
