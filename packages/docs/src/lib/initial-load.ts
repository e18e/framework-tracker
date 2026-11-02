import type { InitialLoadStats } from '@framework-tracker/results'

export function prepareInitialLoadResources(
  resources: InitialLoadStats['resources'],
) {
  return {
    html: resources.document.transferSize / 1024,
    css: resources.stylesheet.transferSize / 1024,
    js: resources.script.transferSize / 1024,
    other:
      (resources.image.transferSize +
        resources.media.transferSize +
        resources.font.transferSize +
        resources.other.transferSize) /
      1024,
  }
}
