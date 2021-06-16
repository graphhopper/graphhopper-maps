import { ReactElement } from 'react'

export interface MapLayer {
    layer: ReactElement
    interactiveLayerIds: string[]
    onClick: (feature: any) => void
}
