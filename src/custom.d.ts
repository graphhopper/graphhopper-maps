declare module '*.css'
declare module '*.svg'
declare module '*.png'
declare module 'heightgraph/src/heightgraph'
declare module 'custom-model-editor/src/index'

declare module 'config' {
    interface ProfileGroup {
        readonly options: { profile: string }[]
    }

    interface BasemapConfig {
        name: string
        type: 'raster' | 'vector'
        url: string[] | string
        attribution: string
        maxZoom?: number
        tilePixelRatio?: number
    }

    const routingApi: string
    const geocodingApi: string
    const defaultTiles: string
    const keys: {
        graphhopper: string
        omniscale: string
        maptiler: string
        thunderforest: string
        kurviger: string
    }
    const request: {
        details: string[]
        snapPreventions: string[]
    }
    const routingGraphLayerAllowed: boolean
    const externalMVTLayer: {
        url: string
        styles: {
            // Maps mvt layer names to style properties. Only the layers listed here will be visible.
            [key: string]: {
                color: string
                width: number
            }
        }
        maxZoom?: number
    }
    const profile_group_mapping: Record<string, ProfileGroup>
    const profiles: object
    const basemaps: {
        // Replace all default basemaps with custom ones
        basemaps?: BasemapConfig[]
        // Add custom basemaps to the default ones
        customBasemaps?: BasemapConfig[]
        // Disable specific default basemaps by name
        disabledBasemaps?: string[]
    } | undefined
}

declare module 'react-responsive' {
    function useMediaQuery(props: { query: string }): boolean
}

// defined by webpack
declare const GIT_SHA: string
