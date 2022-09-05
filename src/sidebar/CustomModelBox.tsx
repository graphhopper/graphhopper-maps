import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
// todonow: this belongs to this app and we should not take it from the demo...
import 'custom-model-editor/demo/style.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import {create} from 'custom-model-editor/src/index'
import Dispatcher from '@/stores/Dispatcher'
import {DismissLastError, ErrorAction, SetCustomModel, SetCustomModelBoxEnabled} from '@/actions/Actions'
import {CustomModel, RequestState} from '@/stores/QueryStore'
import {tr} from '@/translation/Translation'
import SettingsSVG from './settings.svg'
import SettingsClickedSVG from './settings-clicked.svg'
import HelpSVG from './support.svg'
import ApplySVG from './adjust.svg'
import PlainButton from '@/PlainButton'
import {getQueryStore} from "@/stores/Stores";

const examples: { [key: string]: CustomModel } = {
    empty: {
        distance_influence: 70,
        speed: [],
        priority: [],
        areas: {},
    },
    exclude_motorway: {
        priority: [{if: 'road_class == MOTORWAY', multiply_by: '0.0'}],
    },
    limit_speed: {
        speed: [
            {if: 'true', limit_to: '100'},
            {if: 'road_class == TERTIARY', limit_to: '80'},
        ],
    },
    exclude_area: {
        priority: [{if: 'in_berlin_bbox', multiply_by: '0'}],
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
        speed: [{if: 'road_class == STEPS || road_environment == FERRY', multiply_by: '0'}],
        priority: [
            {if: 'road_environment == TUNNEL', multiply_by: '0.5'},
            {if: 'max_weight < 3 || max_height < 2.5', multiply_by: '0.0'},
        ],
    },
}

export interface CustomModelBoxProps {
    enabled: boolean
    encodedValues: object[]
}

export default function CustomModelBox({enabled, encodedValues}: CustomModelBoxProps) {
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const [isValid, setIsValid] = useState(false)
    const divElement = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        // we start with empty categories. they will be set later using info
        const instance = create({}, (element: Node) => divElement.current?.appendChild(element))
        setEditor(instance)
        setCustomModelExample(instance, examples['empty'])
        // todo: minor glitch: if the initial model is invalid we see an 'Invalid custom model' error notification, even
        //       though the custom model box is closed initially
        instance.validListener = (valid: boolean) => {
            setIsValid(valid)
        }
    }, [])

    useEffect(() => {
        editor?.cm.setSize('100%', '100%')
    }, [enabled])

    useEffect(() => {
        if (!editor) return

        // todo: maybe do this 'conversion' in Api.ts already and use types from there on
        const categories: any = {}
        Object.keys(encodedValues).forEach((k: any) => {
            const v: any = encodedValues[k]
            if (v.length === 2 && v[0] === 'true' && v[1] === 'false') {
                categories[k] = {type: 'boolean'}
            } else if (v.length === 2 && v[0] === '>number' && v[1] === '<number') {
                categories[k] = {type: 'numeric'}
            } else {
                categories[k] = {type: 'enum', values: v.sort()}
            }
        })
        editor.categories = categories
    }, [encodedValues])

    const triggerRouting = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.ctrlKey && event.key === 'Enter') {
                // using this shortcut we can skip the custom model validation and force sending the request
                const isValid = true
                dispatchCustomModel(editor.value, isValid, true)
            }
        },
        [editor, isValid]
    )

    const setCustomModelExample = (editor: any, customModelExample: CustomModel) => {
        editor.value = JSON.stringify(customModelExample, null, 2)
    }

    const isQueryOngoing = () => {
        if (!getQueryStore().state.currentRequest.subRequests[0]) return false
        return getQueryStore().state.currentRequest.subRequests[0].state == RequestState.SENT
    }

    return (
        <>
            <PlainButton
                title={tr('open custom model box')}
                className={enabled ? styles.enabledSettings : styles.settings}
                onClick={() => {
                    if (enabled) Dispatcher.dispatch(new DismissLastError())
                    Dispatcher.dispatch(new SetCustomModelBoxEnabled(!enabled))
                }}
            >
                {enabled ? <SettingsClickedSVG/> : <SettingsSVG/>}
            </PlainButton>
            <div className={styles.spacer}></div>
            {/*we use 'display: none' instead of conditional rendering to preserve the custom model box's state when it is closed*/}
            <div
                ref={divElement}
                className={styles.customModelBox}
                style={{display: enabled ? 'block' : 'none'}}
                onKeyUp={triggerRouting}
            />
            {enabled && (
                <div className={styles.customModelBoxBottomBar}>
                    <select
                        className={styles.examples}
                        onChange={(e: any) => {
                            setCustomModelExample(editor, examples[e.target.value])
                            dispatchCustomModel(JSON.stringify(examples[e.target.value]), true, true)
                        }}
                    >
                        <option value="empty">{tr('Examples')}</option>
                        <option value="exclude_motorway">{tr('Exclude Motorway')}</option>
                        <option value="limit_speed">{tr('Limit Speed')}</option>
                        <option value="exclude_area">{tr('Exclude Area')}</option>
                        <option value="combined">{tr('Combined')}</option>
                    </select>

                    <a target="_blank"
                       className={styles.helpLink}
                       href="https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md"
                    >
                        <HelpSVG/>
                        <div>{tr('help')}</div>
                    </a>
                    <div
                        className={`${styles.applyButton} ${!isValid ? styles.applyButtonInvalid : ''} ${isQueryOngoing() ? styles.applyButtonProgress : ''}`}>
                        <PlainButton
                            disabled={!isValid || isQueryOngoing()}
                            onClick={() => dispatchCustomModel(editor.value, true, true)}>
                            <ApplySVG/>
                            <div>{tr("Apply")}</div>
                        </PlainButton>
                        {isQueryOngoing() && <div className={styles.infiniteProgressBar}></div>}
                    </div>
                </div>
            )}
        </>
    )
}

function dispatchCustomModel(customModelValue: any, isValid: boolean, withRouteRequest = false) {
    try {
        const parsedValue = JSON.parse(customModelValue)
        if (isValid) {
            Dispatcher.dispatch(new DismissLastError())
            Dispatcher.dispatch(new SetCustomModel(parsedValue, true, withRouteRequest))
        } else {
            Dispatcher.dispatch(new SetCustomModel(parsedValue, false, withRouteRequest))
            Dispatcher.dispatch(new ErrorAction('Invalid custom model'))
        }
    } catch (e) {
        Dispatcher.dispatch(new SetCustomModel(null, false, withRouteRequest))
    }
}
