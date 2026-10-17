import { starterStats } from './collections'
import { frameworkLogos } from './framework-logos'
import { getFrameworkSlug } from './utils'

function getFrameworkTitle(name: string, packageName: string) {
  const logo = frameworkLogos[packageName]
  let visual: string
  if (logo == null) {
    visual = `<span class="framework-card-symbol" aria-hidden="true">◼</span>`
  } else {
    const dark = `<img class="framework-card-logo${logo.light != null ? ' framework-logo--dark' : ''}" src="${logo.dark}" alt="" />`
    const light =
      logo.light != null
        ? `<img class="framework-card-logo framework-logo--light" src="${logo.light}" alt="" />`
        : ''
    visual = dark + light
  }
  return `<span class="framework-card-title">${visual}<span>${name}</span></span>`
}

export const frameworkRows = starterStats.map((framework) => ({
  name: framework.name,
  slug: getFrameworkSlug(framework.package),
  title: getFrameworkTitle(framework.name, framework.package),
  version:
    framework.frameworkVersion != null &&
    framework.frameworkVersion.trim() !== '' &&
    framework.frameworkVersion.toLowerCase() !== 'unknown'
      ? framework.frameworkVersion
      : 'Unknown',
  isFocused: framework.isFocused,
}))

