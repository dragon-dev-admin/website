let audioCtx: AudioContext | null = null

const DEEP_VOICE_PATTERNS = [
  /Google UK English Male/i,
  /Microsoft (David|Mark|George)/i,
  /Daniel/i,
  /Fred/i,
  /Arthur/i,
  /James/i,
  /Tom\b/i,
  /Brian/i,
  /Aaron/i,
  /Rishi/i,
  /English \(United Kingdom\).*Male/i,
  /English \(US\).*Male/i,
  /Male/i,
]

let cachedDeepVoice: SpeechSynthesisVoice | null = null

function pickDeepEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.replace("_", "-").startsWith("en"))
  for (const pattern of DEEP_VOICE_PATTERNS) {
    const match = english.find((v) => pattern.test(v.name))
    if (match) return match
  }
  const localMale = english.find(
    (v) => v.localService && /male|david|mark|daniel|fred/i.test(v.name)
  )
  if (localMale) return localMale
  return english[0] ?? null
}

function refreshDeepVoiceCache() {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) cachedDeepVoice = pickDeepEnglishVoice(voices)
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshDeepVoiceCache()
  window.speechSynthesis.addEventListener("voiceschanged", refreshDeepVoiceCache)
}

const NAGA_SPEECH_RATE = 0.8

/** Rough duration for bubble fallback when `onend` does not fire. */
export function estimateNagaSpeechMs(text: string, rate = NAGA_SPEECH_RATE): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const wordsPerSecond = 2.35 * rate
  return Math.ceil((words / wordsPerSecond) * 1000) + 900
}

let nagaSpeechSession = 0

/** Speak Naga tip in a heavy, deep voice (Web Speech API). */
export function speakNagaMessage(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.()
    return
  }

  const session = ++nagaSpeechSession
  window.speechSynthesis.cancel()
  refreshDeepVoiceCache()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.pitch = 0.42
  utterance.rate = NAGA_SPEECH_RATE
  utterance.volume = 1
  if (cachedDeepVoice) utterance.voice = cachedDeepVoice

  const finish = () => {
    if (session !== nagaSpeechSession) return
    onEnd?.()
  }
  utterance.onend = finish
  utterance.onerror = finish

  window.speechSynthesis.speak(utterance)
}

export function stopNagaSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  nagaSpeechSession++
  window.speechSynthesis.cancel()
}

function getAudioContext() {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume()
  }
  return audioCtx
}

/** Short click tone for decorative 1 / 2 / 3 (enabled by default). */
export function playDecorClickSound(frequencyHz: number) {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.value = frequencyHz
  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.14)
}

function scheduleTradeTick(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  intensity = 1
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = Math.random() > 0.45 ? "square" : "sine"
  osc.frequency.value = 620 + Math.random() * 2800

  filter.type = "bandpass"
  filter.frequency.value = 900 + Math.random() * 2200
  filter.Q.value = 2.5

  const peak = (0.07 + Math.random() * 0.14) * intensity
  const length = 0.018 + Math.random() * 0.045

  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.linearRampToValueAtTime(peak, time + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  osc.start(time)
  osc.stop(time + length + 0.02)
}

function scheduleTradeBurst(ctx: AudioContext, destination: AudioNode, time: number) {
  const burstCount = 3 + Math.floor(Math.random() * 5)
  for (let i = 0; i < burstCount; i++) {
    scheduleTradeTick(ctx, destination, time + i * 0.012, 0.85)
  }

  if (Math.random() > 0.55) {
    const noise = ctx.createBufferSource()
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25))
    }
    noise.buffer = buffer

    const noiseGain = ctx.createGain()
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "highpass"
    noiseFilter.frequency.value = 1200

    noiseGain.gain.setValueAtTime(0.0001, time)
    noiseGain.gain.linearRampToValueAtTime(0.06, time + 0.004)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(destination)
    noise.start(time)
    noise.stop(time + 0.06)
  }
}

/** Rapid trade ticks for mega-glitch title click (~2s). */
export function playMegaGlitchTradeSound(durationMs = 2000) {
  const ctx = getAudioContext()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.setValueAtTime(0.95, ctx.currentTime)
  master.connect(ctx.destination)

  const start = ctx.currentTime
  const end = start + durationMs / 1000
  let t = start

  while (t < end) {
    scheduleTradeBurst(ctx, master, t)
    const progress = (t - start) / (end - start)
    const speedup = 1 - progress * 0.35
    t += (0.028 + Math.random() * 0.065) * speedup
  }
}
