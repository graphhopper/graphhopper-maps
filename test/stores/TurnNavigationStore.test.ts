import Dispatcher from '@/stores/Dispatcher'
import { SetPoint, SetSelectedPath } from '@/actions/Actions'
import RouteStore from '@/stores/RouteStore'
import QueryStore from '@/stores/QueryStore'
import TurnNavigationStore from '@/stores/TurnNavigationStore'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import DummyApi from '../DummyApi'
import Api from '@/api/Api'
import { Path } from '@/api/graphhopper'

describe('TurnNavigationStore', () => {
    afterEach(() => {
        Dispatcher.clear()
    })

    describe('set path', () => {
        it('should set path', () => {
            const store = createStore()
            const path = { distance: 1000 } as Path
            Dispatcher.dispatch(new SetSelectedPath(path))
            expect(store.state.activePath).toEqual(path)
        })
    })

    function createStore() {
        const store = new TurnNavigationStore(new DummyApi(), new DummySpeech(), true)
        Dispatcher.register(store)
        return store
    }

    class DummySpeech implements SpeechSynthesizer {
        synthesize(text: string, offline = true) {}
    }
})
