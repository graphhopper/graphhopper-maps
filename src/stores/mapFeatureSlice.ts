import { Coordinate } from '@/stores/QueryStore'
import { StateCreator } from 'zustand'

export interface MapFeatureSlice {
    point: Coordinate | null
    properties: object
    setMapFeature: (c: Coordinate | null, properties: object) => void
}

export const createMapFeatureSlice: StateCreator<MapFeatureSlice> = set => {
    return {
        point: null,
        properties: {},
        setMapFeature: (point: Coordinate | null, properties: object) =>
            set(() => ({ point: point, properties: properties })),
    }
}
