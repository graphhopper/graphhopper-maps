import { flatSpeed } from '@/BikePower'

it('calculates the flat speed like BikeSpeed', () => {
    expect(flatSpeed('bike', 100, 90)).toBeCloseTo(18.68, 2)
    expect(flatSpeed('bike_tc', 100, 90)).toBeCloseTo(18.68, 2)
    expect(flatSpeed('racingbike', 160, 90)).toBeCloseTo(28.25, 1)
})
