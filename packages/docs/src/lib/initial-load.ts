import type { InitialLoadStats } from '@framework-performance/results'

export function prepareInitialLoadResources(
  resources: InitialLoadStats['resources'],
) {
  return {
    html: resources.document.transferSize.value / 1024,
    css: resources.stylesheet.transferSize.value / 1024,
    js: resources.script.transferSize.value / 1024,
    other:
      (resources.image.transferSize.value +
        resources.media.transferSize.value +
        resources.font.transferSize.value +
        resources.other.transferSize.value) /
      1024,
  }
}
