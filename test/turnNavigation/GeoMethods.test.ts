import { getCurrentInstruction } from '../../src/turnNavigation/GeoMethods'
import Dispatcher from '../../src/stores/Dispatcher'
import { ApiImpl } from '../../src/api/Api'

let responseHoyerswerda1 = require('./response-hoyerswerda1.json')

afterEach(() => Dispatcher.clear())

describe('calculate instruction', () => {
    // http://localhost:3000/?point=51.437233%2C14.246489&point=51.435514%2C14.239923&profile=car
    it('second instruction should not be "right turn"', () => {
        let path = ApiImpl.decodeResult(responseHoyerswerda1, true)[0]
        const { instructionIndex, distanceNext } = getCurrentInstruction(path.instructions, {
            lat: 51.435029,
            lng: 14.243259,
        })

        expect(distanceNext).toEqual(236)
        expect(path.instructions[instructionIndex].text).toEqual('Ziel erreicht')
    })
})
