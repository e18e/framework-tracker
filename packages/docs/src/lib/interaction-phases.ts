import { stackGrays } from './chart-styles.ts'
import type { InteractionPhaseKey } from './types'

/** Lighthouse INP phases in the order they occur, which is also the stack order bottom to top. */
export const INTERACTION_PHASES: readonly {
  key: InteractionPhaseKey
  label: string
  description: string
  color: string
}[] = [
  {
    key: 'inputDelayMs',
    label: 'Input delay',
    description:
      'which starts when the user initiates an interaction with the page, and ends when the event callbacks for the interaction begin to run.',
    color: stackGrays[0],
  },
  {
    key: 'processingDurationMs',
    label: 'Processing duration',
    description:
      'which consists of the time it takes for event callbacks to run to completion.',
    color: stackGrays[1],
  },
  {
    key: 'presentationDelayMs',
    label: 'Presentation delay',
    description:
      'which is the time it takes for the browser to present the next frame which contains the visual result of the interaction.',
    color: stackGrays[2],
  },
]
