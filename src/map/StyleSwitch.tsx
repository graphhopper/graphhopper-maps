import * as mapboxgl from 'mapbox-gl'
import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import styles from './StyleSwitch.modules.css'

interface StyleOption {
    name: string
    style: mapboxgl.Style | string
}

const sourceOptions: StyleOption[] = [
    { name: 'Default', style: 'mapbox://styles/mapbox/streets-v11' },
    {
        name: 'OpenStreetmap',
        style: {
            version: 8,
            sources: {
                osm: {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution:
                        'Map tiles by <a target="_top" rel="noopener" href="https://tile.openstreetmap.org/">OpenStreetMap tile servers</a>, under the <a target="_top" rel="noopener" href="https://operations.osmfoundation.org/policies/tiles/">tile usage policy</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>',
                },
            },
            layers: [
                {
                    id: 'osm',
                    type: 'raster',
                    source: 'osm',
                },
            ],
        },
    },
    {
        name: 'Watercolors',
        style: {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: ['https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'],
                    tileSize: 256,
                    attribution:
                        'Map tiles by <a target="_top" rel="noopener" href="http://stamen.com">Stamen Design</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
                },
            },
            layers: [
                {
                    id: 'simple-tiles',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
            ],
        },
    },
]

export default class StyleSwitch implements mapboxgl.IControl {
    private map!: mapboxgl.Map
    private container: HTMLDivElement = StyleSwitch.initContainer()

    static initContainer() {
        const container = document.createElement('div')
        container.classList.add('mapboxgl-ctrl')
        container.classList.add('mapboxgl-ctrl-group')
        return container
    }

    onAdd(map: mapboxgl.Map) {
        this.map = map

        ReactDOM.render(<SwitchComponent onSelected={option => this.onSwitchStyle(option)} />, this.container)

        return this.container
    }

    onRemove() {
        if (this.container.parentNode && this.map) {
            this.container.parentNode!.removeChild(this.container)
        }
    }

    private onSwitchStyle(name: string) {
        const option = sourceOptions.find(option => option.name === name)

        if (option) this.map.setStyle(option.style)
    }
}

function SwitchComponent({ onSelected }: { onSelected: { (option: string): void } }) {
    const [isShowOptions, setIsShowOptions] = useState(false)

    if (isShowOptions) {
        return (
            <div className={styles.options} onChange={e => onSelected((e.target as HTMLInputElement).value)}>
                {sourceOptions.map(option => (
                    <>
                        <input type="radio" id={option.name} name="layer" value={option.name} />
                        <label htmlFor={option.name}>{option.name}</label>
                    </>
                ))}
            </div>
        )
    } else {
        return <button onClick={() => setIsShowOptions(!isShowOptions)}>Switch</button>
    }
}
