import ApiInfoStore from '../../src/stores/ApiInfoStore'
import { InfoReceived } from '../../src/actions/Actions'
import { ApiInfo } from '../../src/api/graphhopper'

describe('ApiInfoStore', () => {
    it('should accept an InfoReceived action and store its result', () => {
        const state: ApiInfo = {
            profiles: [],
            version: '',
            elevation: true,
            bbox: [0, 0, 0, 0],
            encoded_values: [],
        }
        const receivedInfo: ApiInfo = {
            bbox: [1, 1, 1, 1],
            version: 'some-version',
            elevation: true,
            profiles: [{ name: 'some-profile' }],
            encoded_values: [],
        }
        const store = new ApiInfoStore()

        const newState = store.reduce(state, new InfoReceived(receivedInfo))

        expect(newState).toEqual(receivedInfo)
    })
    it('should not alter the state if unknown actions are passed', () => {
        const state: ApiInfo = {
            profiles: [],
            elevation: false,
            version: '',
            bbox: [0, 0, 0, 0],
            encoded_values: [],
        }
        const store = new ApiInfoStore()

        const newState = store.reduce(state, {})

        expect(newState).toEqual(state)
    })
})
