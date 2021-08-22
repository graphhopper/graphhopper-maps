import { getCurrentInstruction } from '../../src/turnNavigation/GeoMethods'
import Dispatcher from '../../src/stores/Dispatcher'
import { ApiImpl } from '../../src/api/Api'

let responseHoyerswerda1 = require('./response-hoyerswerda1.json')

afterEach(() => Dispatcher.clear())

describe('calculate instruction', () => {
    // http://localhost:3000/?point=51.437233%2C14.246489&point=51.435514%2C14.239923&profile=car
    it('second instruction should not be "right turn"', () => {
        let path = ApiImpl.decodeResult(responseHoyerswerda1, true)[0]
        const { instructionIndex, distanceToNext, remainingTime, remainingDistance } = getCurrentInstruction(
            path.instructions,
            {
                lat: 51.435029,
                lng: 14.243259,
            }
        )

        expect(distanceToNext).toEqual(236)
        expect(remainingDistance).toEqual(236)
        expect(Math.round(remainingTime / 1000)).toEqual(30)

        expect(path.instructions[instructionIndex].text).toEqual('Ziel erreicht')
    })

    it('remaining time should be correct', () => {
        let path = ApiImpl.decodeResult(responseHoyerswerda1, true)[0]
        const { remainingTime, remainingDistance } = getCurrentInstruction(path.instructions, {
            lat: 51.439291,
            lng: 14.245254,
        })

        expect(Math.round(remainingTime / 1000)).toEqual(101)
        expect(Math.round(remainingDistance)).toEqual(578)
    })
})
