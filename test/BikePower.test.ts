import { bikeParameters, flatSpeed, getPowerSetting } from '@/BikePower'

// the parameters of bike.json as returned from /info
const bike = {
    power: { value: 100, min: 40, max: 500 },
    mass: { value: 90, min: 25, max: 300 },
    cda: { value: 0.74, min: 0.1, max: 2 },
    crr: { value: 0.008, min: 0, max: 0.02 },
}

describe('BikePower', () => {
    it('calculates the flat speed like BikeSpeed', () => {
        expect(flatSpeed(100, 90, 0.74, 0.008)).toBeCloseTo(18.68, 2)
        expect(flatSpeed(160, 90, 0.4, 0.006)).toBeCloseTo(28.25, 1)
    })

    it('offers the slider only for profiles with the power parameter and limits the range', () => {
        expect(getPowerSetting(undefined, null)).toBeNull()
        expect(getPowerSetting({ max_mtb_rating: { value: 2 } }, null)).toBeNull()
        expect(getPowerSetting(bike, null)).toMatchObject({ min: 50, max: 300, defaultPower: 100, power: 100 })
        expect(getPowerSetting(bike, 400)!.power).toEqual(300)
        expect(getPowerSetting(bike, 200)!.flatSpeed!(200)).toBeCloseTo(24.95, 2)
        // the flat speed needs the other parameters of the power balance, cda and crr can be literals of the model
        expect(getPowerSetting({ power: bike.power, mass: bike.mass }, null)!.flatSpeed).toBeNull()
    })

    it('creates the request parameters only if the power differs from the default', () => {
        expect(bikeParameters(bike, 100)).toBeNull()
        expect(bikeParameters(bike, 200)).toEqual({ power: 200 })
    })
})
