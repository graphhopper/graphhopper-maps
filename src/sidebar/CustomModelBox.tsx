import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
// todo: this belongs to this app and we should not take it from the demo...
import 'custom-model-editor/demo/style.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'custom-model-editor/src/index'
import Dispatcher from '@/stores/Dispatcher'
import { DismissLastError, SetCustomModel } from '@/actions/Actions'
import { CustomModel } from '@/stores/QueryStore'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'

const examples: { [key: string]: CustomModel } = {
    empty: {
        distance_influence: 15,
        speed: [],
        priority: [],
        areas: {},
    },
    exclude_motorway: {
        priority: [{ if: 'road_class == MOTORWAY', multiply_by: '0.0' }],
    },
    limit_speed: {
        speed: [
            { if: 'true', limit_to: '100' },
            { if: 'road_class == TERTIARY', limit_to: '80' },
        ],
    },
    exclude_area: {
        priority: [{ if: 'in_berlin_bbox', multiply_by: '0' }],
        areas: {
            berlin_bbox: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [13.253, 52.608],
                            [13.228, 52.437],
                            [13.579, 52.447],
                            [13.563, 52.609],
                            [13.253, 52.608],
                        ],
                    ],
                },
            },
        },
    },
    combined: {
        distance_influence: 100,
        speed: [{ if: 'road_class == STEPS || road_environment == FERRY', multiply_by: '0' }],
        priority: [
            { if: 'road_environment == TUNNEL', multiply_by: '0.5' },
            { if: 'max_weight < 3 || max_height < 2.5', multiply_by: '0.0' },
        ],
    },
}

export interface CustomModelBoxProps {
    enabled: boolean
    encodedValues: object[]
    initialCustomModelStr: string | null
    queryOngoing: boolean
}

export default function CustomModelBox({
    enabled,
    encodedValues,
    initialCustomModelStr,
    queryOngoing,
}: CustomModelBoxProps) {
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const [isValid, setIsValid] = useState(false)
    const divElement = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        // we start with empty categories. they will be set later using info
        const instance = create({}, (element: Node) => divElement.current?.appendChild(element))
        setEditor(instance)

        instance.cm.setSize('100%', '100%')
        if (initialCustomModelStr != null) {
            // prettify the custom model if it can be parsed or leave it as is otherwise
            try {
                initialCustomModelStr = customModel2prettyString(JSON.parse(initialCustomModelStr))
            } catch (e) {}
        }
        instance.value =
            initialCustomModelStr == null ? customModel2prettyString(examples['empty']) : initialCustomModelStr

        if (enabled)
            // When we got a custom model from the url parameters we send the request right away
            dispatchCustomModel(instance.value, true, true)

        instance.validListener = (valid: boolean) => {
            // We update the app states' custom model, but we are not requesting a routing query every time the model
            // becomes valid. Updating the model is still important, because the routing request might be triggered by
            // moving markers etc.
            dispatchCustomModel(instance.value, valid, false)
            setIsValid(valid)
        }
    }, [])

    // without this the editor is blank after opening the box and before clicking it or resizing the window?
    // but having the focus in the box after opening it is nice anyway
    useEffect(() => {
        if (enabled) editor?.cm.focus()
    }, [enabled])

    useEffect(() => {
        if (!editor) return

        // todo: maybe do this 'conversion' in Api.ts already and use types from there on
        const categories: any = {}
        Object.keys(encodedValues).forEach((k: any) => {
            const v: any = encodedValues[k]
            if (v.length === 2 && v[0] === 'true' && v[1] === 'false') {
                categories[k] = { type: 'boolean' }
            } else if (v.length === 2 && v[0] === '>number' && v[1] === '<number') {
                categories[k] = { type: 'numeric' }
            } else {
                categories[k] = { type: 'enum', values: v.sort() }
            }
        })
        editor.categories = categories
    }, [encodedValues])

    const triggerRouting = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.ctrlKey && event.key === 'Enter') {
                // Using this keyboard shortcut we can skip the custom model validation and directly request a routing
                // query.
                const isValid = true
                dispatchCustomModel(editor.value, isValid, true)
            }
        },
        [editor, isValid]
    )

    return (
        <>
            {/*we use 'display: none' instead of conditional rendering to preserve the custom model box's state when it is closed*/}
            <div
                ref={divElement}
                className={styles.customModelBox}
                style={{ display: enabled ? 'block' : 'none' }}
                onKeyUp={triggerRouting}
            />
            {enabled && (
                <div className={styles.customModelBoxBottomBar}>
                    <select
                        className={styles.examples}
                        onChange={(e: any) => {
                            editor.value = customModel2prettyString(examples[e.target.value])
                            // When selecting an example we request a routing request and act like the model is valid,
                            // even when it is not according to the editor validation.
                            dispatchCustomModel(JSON.stringify(examples[e.target.value]), true, true)
                        }}
                    >
                        <option value="empty">{tr('examples_custom_model')}</option>
                        <option value="exclude_motorway">{tr('exclude_motorway_example')}</option>
                        <option value="limit_speed">{tr('limit_speed_example')}</option>
                        <option value="exclude_area">{tr('exclude_area_example')}</option>
                        <option value="combined">{tr('combined_example')}</option>
                    </select>

                    <a
                        target="_blank"
                        className={styles.helpLink}
                        href="https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md"
                    >
                        {tr('help_custom_model')}
                    </a>
                    <div
                        className={`${styles.applyButton} ${!isValid ? styles.applyButtonInvalid : ''} ${
                            queryOngoing ? styles.applyButtonProgress : ''
                        }`}
                    >
                        <PlainButton
                            title={tr('Apply custom model of text box to routing request')}
                            disabled={!isValid || queryOngoing}
                            // If the model was invalid the button would be disabled anyway, so it does not really matter
                            // if we set valid to true or false here.
                            onClick={() => dispatchCustomModel(editor.value, true, true)}
                        >
                            {tr('apply_custom_model')}
                        </PlainButton>
                        {queryOngoing && <div className={styles.infiniteProgressBar}></div>}
                    </div>
                </div>
            )}
        </>
    )
}

function dispatchCustomModel(customModelString: string, isValid: boolean, withRouteRequest: boolean) {
    try {
        const parsedValue = JSON.parse(customModelString)
        Dispatcher.dispatch(new SetCustomModel(parsedValue, isValid, withRouteRequest))
    } catch (e) {
        Dispatcher.dispatch(new SetCustomModel(null, false, withRouteRequest))
    }
}

function customModel2prettyString(customModel: CustomModel) {
    return JSON.stringify(customModel, null, 2)
}
