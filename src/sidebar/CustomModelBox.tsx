import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
import '@/sidebar/CustomModelBox.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'custom-model-editor/src/index'
import Dispatcher from '@/stores/Dispatcher'
import { SetCustomModel } from '@/actions/Actions'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import { customModel2prettyString, customModelExamples } from '@/sidebar/CustomModelExamples'
import { QueryStoreState } from '@/stores/QueryStore'

function convertEncodedValuesForEditor(encodedValues: object[]): any {
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
    return categories
}

export interface CustomModelBoxProps {
    encodedValues: object[]
    queryOngoing: boolean
    queryStoreState: QueryStoreState
    showSettings: boolean
}

export default function CustomModelBox({
    encodedValues,
    queryOngoing,
    queryStoreState,
    showSettings,
}: CustomModelBoxProps) {
    const { initialCustomModelStr, customModelEnabled, customModel } = queryStoreState
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const [isValid, setIsValid] = useState(false)
    const divElement = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const instance = create(convertEncodedValuesForEditor(encodedValues), (element: Node) =>
            divElement.current?.appendChild(element)
        )
        setEditor(instance)

        instance.cm.setSize('100%', '100%')
        if (customModel != null) {
            // init from settings in case of entire app recreation like window resizing
            instance.value = customModel2prettyString(customModel)
        } else if (initialCustomModelStr != null) {
            try {
                instance.value = customModel2prettyString(JSON.parse(initialCustomModelStr))
            } catch (e) {
                instance.value = initialCustomModelStr
            }
        } else {
            instance.value = customModel2prettyString(customModelExamples['default_example'])
            dispatchCustomModel(instance.value, true, true)
        }

        instance.validListener = (valid: boolean) => {
            // We update the app state's custom model, but we are not requesting a routing query every time the model
            // becomes valid. Updating the model is still important, because the routing request might be triggered by
            // moving markers etc.
            dispatchCustomModel(instance.value, valid, false)
            setIsValid(valid)
        }
    }, [])

    // without this the editor is blank after opening the box and before clicking it or resizing the window?
    // but having the focus in the box after opening it is nice anyway
    useEffect(() => {
        if (customModelEnabled && showSettings) editor?.cm.focus()
    }, [customModelEnabled, showSettings])

    useEffect(() => {
        if (!editor) return
        editor.categories = convertEncodedValuesForEditor(encodedValues)
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
            <div ref={divElement} className={styles.customModelBox} onKeyUp={triggerRouting} />
            <div className={styles.customModelBoxBottomBar}>
                <select
                    className={styles.examples}
                    onChange={(e: any) => {
                        editor.value = customModel2prettyString(customModelExamples[e.target.value])
                        // When selecting an example we request a routing request and act like the model is valid,
                        // even when it is not according to the editor validation.
                        dispatchCustomModel(JSON.stringify(customModelExamples[e.target.value]), true, true)
                    }}
                >
                    <option value="default_example">{tr('examples_custom_model')}</option>
                    <option value="exclude_motorway">{tr('exclude_motorway_example')}</option>
                    <option value="limit_speed">{tr('limit_speed_example')}</option>
                    <option value="cargo_bike">{tr('cargo_bike_example')}</option>
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
