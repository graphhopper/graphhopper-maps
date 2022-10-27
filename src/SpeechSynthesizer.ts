export class SpeechSynthesizer {
    private locale: string
    private readonly speechSynthesisAPIAvailable: boolean
    private audioCtx: AudioContext
    private source?: AudioBufferSourceNode

    constructor(locale: string) {
        this.locale = locale
        // this is a bit funny the comma is required and prettier moves it to the next line!?
        this.speechSynthesisAPIAvailable = 'speechSynthesis' in window
        ;(window as any).AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
        this.audioCtx = new AudioContext()
    }

    synthesize(text: string, offline = true) {
        if (!this.speechSynthesisAPIAvailable) offline = false
        if (offline) {
            let utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = this.locale
            if (speechSynthesis.pending) speechSynthesis.cancel()
            speechSynthesis.speak(utterance)
        } else {
            this.synthesizeOnline(text)
        }
    }

    synthesizeOnline(text: string) {
        // we need a better caching here that does not leak over time and also avoids errors like:
        // "Error decoding file DOMException: The buffer passed to decodeAudioData contains an unknown content type."
        // because otherwise the audio for this instruction would be broken forever
        const url = 'https://navi.graphhopper.org:5002/api/tts?text=' + encodeURIComponent(text)
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url, true)
        xhr.responseType = 'blob'
        xhr.onload = () => {
            this.initSound(xhr.response)
        }
        xhr.send()
    }

    private async initSound(blob: any) {
        const arrayBuffer = await blob.arrayBuffer()
        this.audioCtx.decodeAudioData(
            arrayBuffer,
            (audioData: any) => {
                this.playSound(audioData)
            },
            function (e: any) {
                console.log('Error decoding file', e)
            }
        )
    }

    private playSound(audioBuffer: any) {
        if (this.source) this.source.stop()

        // this would skip too many stuff
        // this.source.onended = (event) => { console.log("sound ENDED"); this.playSoundInProgress = false; }

        // the source needs to be freshly created otherwise we get: Cannot set the buffer attribute of an AudioBufferSourceNode with an AudioBuffer more than once
        this.source = this.audioCtx.createBufferSource()
        this.source.buffer = audioBuffer
        this.source.loop = false
        this.source.connect(this.audioCtx.destination)
        this.source.start()
    }
}
