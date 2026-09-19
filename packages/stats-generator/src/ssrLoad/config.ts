export type SSRLoadKind = 'ssrLoad' | 'ssrRouterLinkLoad'
export const routerLinkPackages = new Set([
  'app-next-js',
  'app-nuxt',
  'app-react-router',
  'app-tanstack-start-react',
])
export function getSSRLoadKind(): SSRLoadKind {
  const kind = process.env.SSR_LOAD_KIND ?? 'ssrLoad'
  if (kind !== 'ssrLoad' && kind !== 'ssrRouterLinkLoad')
    throw new Error(`Unknown SSR load kind: ${kind}`)
  return kind
}
export function getSSRLoadPath(packageName: string, kind: SSRLoadKind): string {
  if (kind === 'ssrRouterLinkLoad' && !routerLinkPackages.has(packageName))
    throw new Error(`Router link load is not supported for ${packageName}`)
  return kind === 'ssrLoad' && routerLinkPackages.has(packageName)
    ? '/server-side-rendered-plain-links'
    : '/server-side-rendered'
}
export function getSSRLoadStatsKey(kind: SSRLoadKind) {
  return kind === 'ssrLoad' ? 'ssrLoadTests' : 'ssrRouterLinkLoadTests'
}
