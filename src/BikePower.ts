// the aerodynamic drag area cda and rolling resistance crr, literals of the server-side custom models
const BIKES: Record<string, { cda: number; crr: number }> = {
    racingbike: { cda: 0.4, crr: 0.006 },
    mtb: { cda: 0.74, crr: 0.012 },
    bike: { cda: 0.74, crr: 0.008 },
}

/**
 * The speed in km/h on flat ground from the power balance power = (mass * g * crr + 0.5 * rho * cda * v^2) * v,
 * like BikeSpeed of the GraphHopper routing engine.
 */
export function flatSpeed(profile: string, power: number, mass: number): number {
    const { cda, crr } = BIKES[profile] ?? BIKES.bike
    const aero = 0.5 * 1.226 * cda
    const c = mass * 9.81 * crr
    // Newton iteration from the drag-only speed, which is beyond the root
    let v = Math.cbrt(power / aero)
    for (let i = 0; i < 8; i++) v -= (aero * v * v * v + c * v - power) / (3 * aero * v * v + c)
    return v * 3.6
}
