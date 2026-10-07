import { ProfileParameter } from '@/api/graphhopper'

export interface PowerSetting {
    readonly min: number
    readonly max: number
    readonly defaultPower: number
    readonly power: number
    // the flat speed in km/h for a power, if the profile exposes the other parameters of the power balance
    readonly flatSpeed: ((power: number) => number) | null
}

const MIN_POWER = 50
const MAX_POWER = 300

/**
 * The speed in km/h on flat ground from the power balance power = (mass * g * crr + 0.5 * rho * cda * v^2) * v,
 * like BikeSpeed of the GraphHopper routing engine.
 */
export function flatSpeed(power: number, mass: number, cda: number, crr: number): number {
    const aero = 0.5 * 1.226 * cda
    const c = mass * 9.81 * crr
    // Newton iteration from the drag-only speed, which is beyond the root
    let v = Math.cbrt(power / aero)
    for (let i = 0; i < 8; i++) v -= (aero * v * v * v + c * v - power) / (3 * aero * v * v + c)
    return v * 3.6
}

function num(p: ProfileParameter | undefined): number | null {
    return p && typeof p.value === 'number' ? p.value : null
}

/**
 * @return the setting for the power slider if the profile has the parameter power, otherwise null
 */
export function getPowerSetting(
    parameters: Record<string, ProfileParameter> | undefined,
    power: number | null,
): PowerSetting | null {
    if (!parameters) return null
    const defaultPower = num(parameters.power)
    if (defaultPower === null) return null
    const mass = num(parameters.mass)
    const cda = num(parameters.cda)
    const crr = num(parameters.crr)
    const min = Math.max(MIN_POWER, parameters.power.min ?? MIN_POWER)
    const max = Math.min(MAX_POWER, parameters.power.max ?? MAX_POWER)
    return {
        min,
        max,
        defaultPower,
        power: Math.min(max, Math.max(min, power ?? defaultPower)),
        flatSpeed: mass !== null && cda !== null && crr !== null ? p => flatSpeed(p, mass, cda, crr) : null,
    }
}

/**
 * @return the parameters for the custom model of the request or null if the power is the default of the profile.
 * The flat speed of the profile is scaled by the server-side bike_speed_factor, so only the power is sent.
 */
export function bikeParameters(
    parameters: Record<string, ProfileParameter>,
    power: number,
): Record<string, number> | null {
    const s = getPowerSetting(parameters, power)
    return !s || s.power === s.defaultPower ? null : { power: s.power }
}
