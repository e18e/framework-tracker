// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://frameworks.e18e.dev',
  integrations: [
    starlight({
      title: 'Framework Tracker',
      description:
        'Track and compare framework performance metrics across popular meta-frameworks.',
      favicon: '/favicon.svg',
      customCss: ['./src/styles/starlight.css'],
      pagefind: false,
      disable404Route: true,
      sidebar: [
        { label: 'Overview', link: '/' },
        { label: 'Dev Time', link: '/dev-time/' },
        { label: 'Run Time', link: '/run-time/' },
        { label: 'All Frameworks', link: '/all-frameworks/' },
        { label: 'Methodology', link: '/methodology/' },
        { label: 'Glossary', link: '/glossary/' },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/e18e/framework-tracker',
        },
      ],
    }),
    mdx(),
  ],
})
