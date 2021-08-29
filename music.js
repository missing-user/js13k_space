import * as sonantx from 'sonantx'
import mySong from './ambientMusic.json'

const audioCtx = new AudioContext()

sonantx.generateSong(mySong, audioCtx.sampleRate).then((audioBuffer) => {
  const audioBufferSource = audioCtx.createBufferSource()
  audioBufferSource.buffer = audioBuffer
  audioBufferSource.connect(audioCtx.destination)
  audioBufferSource.start()
})