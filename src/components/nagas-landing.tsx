"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Download, Github, Play, FileText } from "lucide-react"
import { SITE_LINKS } from "@/lib/site-links"
import {
  estimateNagaSpeechMs,
  playDecorClickSound,
  playMegaGlitchTradeSound,
  speakNagaMessage,
  stopNagaSpeech,
} from "@/lib/sounds"

const SOCIAL_LINKS = [
  {
    id: "telegram",
    label: "Telegram",
    href: SITE_LINKS.telegram,
    imageSrc: "/images/tele.png",
    ringClass: "border-sky-400/80 shadow-sky-500/40",
    bgClass: "bg-sky-500",
    external: true,
  },
  {
    id: "email",
    label: "Email",
    href: SITE_LINKS.email,
    imageSrc: "/images/email.svg",
    ringClass: "border-slate-400/80 shadow-slate-500/40",
    bgClass: "bg-slate-600",
    external: false,
  },
  {
    id: "twitter",
    label: "Twitter / X",
    href: SITE_LINKS.twitter,
    imageSrc: "/images/twitter.svg",
    ringClass: "border-zinc-400/80 shadow-zinc-800/50",
    bgClass: "bg-zinc-900",
    external: true,
  },
] as const

const HERO_SOCIAL_CLASSES = {
  twitter: {
    button:
      "left-[36%] top-[16%] h-12 w-12 sm:h-14 sm:w-14 lg:left-[34%] lg:top-[8%]",
    image: "h-6 w-6 sm:h-8 sm:w-8",
  },
  telegram: {
    button:
      "left-[60%] top-[39%] h-11 w-11 sm:h-12 sm:w-12 lg:left-[70%] lg:top-[36%]",
    image: "h-6 w-6 sm:h-7 sm:w-7",
  },
  email: {
    button:
      "left-[37%] top-[62%] h-12 w-12 rounded-md sm:h-14 sm:w-14 lg:left-[32%] lg:top-[63%]",
    image: "h-8 w-8 sm:h-10 sm:w-10",
  },
} as const

/** Safe tips for Naga speech bubble — educational, non-specific. */
const NAGA_SAFE_TIPS = [
  "Transparency beats hype. Verify mint, freeze, and liquidity before you trust a chart.",
  "Holder clusters can reveal coordination — look beyond the headline market cap.",
  "Top-10 concentration matters. Heavy bags in few wallets can mean fragile exits.",
  "Early sniper and bundle patterns tell a story — numbers age, habits do not.",
  "DYOR: use multiple sources. No single dashboard is the full picture.",
  "Locked liquidity is a signal, not a guarantee. Read the details every time.",
  "Community tools help you see structure — they do not replace your judgment.",
  "Alpha is often in distribution: who holds, who funded, who sold.",
  "Fast moves are exciting; slow research is what keeps you in the game.",
  "If data looks too clean, dig one layer deeper.",
  "Dragon surfaces bundles, snipes, and clusters so you can decide with context.",
  "Treat every token as guilty until on-chain data proves otherwise.",
] as const

function shuffleStrings<T>(items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  opacity: number
}

interface GlitchChar {
  original: string
  glitched: string
  isGlitching: boolean
}

interface MessageBurst {
  id: number
  messages: string[]
  timestamp: number
}

const THEME_STORAGE_KEY = "naga-landing-theme-v2"
const NAGA_IMAGE =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/telegram-cloud-document-1-4961135720249951764.jpg-IOlkPvCq9ilZnXyQZf9udss7L7xPMv.png"

export function NagasLanding() {
  const router = useRouter()
  const console1Ref = useRef<HTMLDivElement>(null)
  const console2Ref = useRef<HTMLDivElement>(null)
  const console3Ref = useRef<HTMLDivElement>(null)
  const nagaRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const isDark = true

  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  const ctaButtonClass = isDark
    ? "backdrop-blur-md border-2 border-emerald-400/55 bg-slate-950/80 text-emerald-50 shadow-lg shadow-emerald-500/15 hover:border-emerald-300/80 hover:bg-emerald-950/90 hover:shadow-emerald-400/25"
    : "backdrop-blur-sm border-2 border-emerald-500 bg-white/90 text-emerald-700 hover:bg-emerald-50"
  const actionButtonClass = `relative z-10 min-h-12 w-full whitespace-normal px-4 py-3 text-center font-mono text-sm leading-snug transition-all duration-500 sm:min-h-12 sm:px-4 sm:py-3 sm:text-base lg:w-auto lg:px-6 lg:py-3 lg:text-base xl:text-lg ${ctaButtonClass}`

  const horizonLightness = isDark ? "62%" : "50%"
  const decorOpacity = isDark ? "0.45" : "0.3"
  const [console1Bursts, setConsole1Bursts] = useState<MessageBurst[]>([])
  const [console2Bursts, setConsole2Bursts] = useState<MessageBurst[]>([])
  const [console3Bursts, setConsole3Bursts] = useState<MessageBurst[]>([])
  const [expandedButton, setExpandedButton] = useState<string | null>(null)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [tentacleReach, setTentacleReach] = useState(false)
  const [glitchText, setGlitchText] = useState<GlitchChar[]>([])
  const [colorCycle, setColorCycle] = useState(0)
  const [pageTransition, setPageTransition] = useState(false)
  const [logoSpinning, setLogoSpinning] = useState(false)
  const [playgroundTransition, setPlaygroundTransition] = useState(false)
  const [fadeToPlayground, setFadeToPlayground] = useState(false)
  const [cameFromPlayground, setCameFromPlayground] = useState(false)
  const [megaGlitchActive, setMegaGlitchActive] = useState(false)
  const [nagaSpeech, setNagaSpeech] = useState<string | null>(null)
  const [nagaSpeechBubbleKey, setNagaSpeechBubbleKey] = useState(0)
  const [decorHueOffsets, setDecorHueOffsets] = useState({ one: 0, two: 120, three: 240 })
  const nagaClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nagaSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playgroundTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nagaTipsPoolRef = useRef<string[]>([])
  const nagaSpeechGenerationRef = useRef(0)
  const megaGlitchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Generic console lines — no tickers, prices, or time-sensitive claims. */
  const tradingMessages = [
    "🔍 Scanning on-chain activity...",
    "📊 Reviewing liquidity and pool health...",
    "🫂 Mapping holder distribution...",
    "🔗 Checking mint, freeze, and authority flags...",
    "📦 Looking for coordinated wallet clusters...",
    "🎯 Tracking early buyer patterns...",
    "⚠️ Flagging unusual concentration risk...",
    "💧 Verifying liquidity lock signals...",
    "🤖 Aggregating transparency metrics...",
    "📈 Comparing volume vs. holder growth...",
    "🛡️ Risk checklist in progress...",
    "💫 Data feed connected — standing by...",
    "🔎 Cross-referencing public scanners...",
    "📱 Alert: new report ready for review...",
    "🌊 Monitoring launch-phase activity...",
    "⏳ Patience — alpha favors prepared holders...",
    "🎲 Remember: DYOR before sizing any trade...",
    "✅ Report enrichment complete...",
  ]

  const horizonPath =
    "M0,450 L80,420 L160,380 L240,440 L320,360 L400,420 L480,340 L560,400 L640,320 L720,380 L800,300 L880,360 L960,280 L1040,340 L1120,260 L1200,320 L1280,240 L1360,300 L1440,220 L1520,280 L1600,200 L1600,800 L0,800 Z"
  const horizonClipPath =
    "polygon(0 56.25%, 5% 52.5%, 10% 47.5%, 15% 55%, 20% 45%, 25% 52.5%, 30% 42.5%, 35% 50%, 40% 40%, 45% 47.5%, 50% 37.5%, 55% 45%, 60% 35%, 65% 42.5%, 70% 32.5%, 75% 40%, 80% 30%, 85% 37.5%, 90% 27.5%, 95% 35%, 100% 25%, 100% 100%, 0 100%)"

  useEffect(() => {
    const titleText = "$Alpha Dragon"
    const chars = titleText.split("").map((char) => ({
      original: char,
      glitched: char,
      isGlitching: false,
    }))
    setGlitchText(chars)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("fromPlayground") === "true") {
      setCameFromPlayground(true)
      sessionStorage.removeItem("fromPlayground")
      setTimeout(() => {
        setCameFromPlayground(false)
      }, 1500)
    }
  }, [])

  useEffect(() => {
    if (megaGlitchActive) return

    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?~`"
    const interval = setInterval(() => {
      setGlitchText((prev) => {
        const newText = [...prev]
        const randomIndex = Math.floor(Math.random() * newText.length)

        if (newText[randomIndex] && newText[randomIndex].original !== " ") {
          newText[randomIndex] = {
            ...newText[randomIndex],
            glitched: glitchChars[Math.floor(Math.random() * glitchChars.length)],
            isGlitching: true,
          }

          setTimeout(() => {
            setGlitchText((current) => {
              const resetText = [...current]
              resetText[randomIndex] = {
                ...resetText[randomIndex],
                glitched: resetText[randomIndex].original,
                isGlitching: false,
              }
              return resetText
            })
          }, 200)
        }

        return newText
      })
    }, 800)

    return () => clearInterval(interval)
  }, [megaGlitchActive])

  useEffect(() => {
    const interval = setInterval(() => {
      setColorCycle((prev) => (prev + 1) % 360)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const scheduleReach = () => {
      const delay = Math.random() * 15000 + 45000
      setTimeout(() => {
        setTentacleReach(true)
        setTimeout(() => setTentacleReach(false), 2000)
        scheduleReach()
      }, delay)
    }
    scheduleReach()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    return () => {
      if (nagaClickTimerRef.current) clearTimeout(nagaClickTimerRef.current)
      if (nagaSpeechTimerRef.current) clearTimeout(nagaSpeechTimerRef.current)
      if (megaGlitchTimerRef.current) clearInterval(megaGlitchTimerRef.current)
      if (playgroundTransitionTimerRef.current) clearTimeout(playgroundTransitionTimerRef.current)
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (let i = 0; i < 5; i++) {
      const bubble: Bubble = {
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 100,
        size: Math.random() * 20 + 10,
        opacity: 1,
      }

      setBubbles((prev) => [...prev, bubble])

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bubble.id))
      }, 1000)
    }
  }, [])

  const triggerLogoSpin = () => {
    if (logoSpinning) return

    setLogoSpinning(true)
    window.setTimeout(() => setLogoSpinning(false), 900)
  }

  const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?~`"

  const triggerMegaGlitchEffect = () => {
    if (megaGlitchActive) return

    setMegaGlitchActive(true)
    playMegaGlitchTradeSound(2000)
    if (megaGlitchTimerRef.current) clearInterval(megaGlitchTimerRef.current)

    megaGlitchTimerRef.current = setInterval(() => {
      setGlitchText((prev) =>
        prev.map((char) =>
          char.original === " "
            ? char
            : {
                ...char,
                glitched: glitchChars[Math.floor(Math.random() * glitchChars.length)],
                isGlitching: true,
              }
        )
      )
    }, 55)

    window.setTimeout(() => {
      if (megaGlitchTimerRef.current) clearInterval(megaGlitchTimerRef.current)
      megaGlitchTimerRef.current = null
      setMegaGlitchActive(false)
      setGlitchText((prev) =>
        prev.map((char) => ({
          ...char,
          glitched: char.original,
          isGlitching: false,
        }))
      )
    }, 2000)
  }

  const triggerBrandEffects = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (playgroundTransition) return

    triggerLogoSpin()
    try {
      triggerMegaGlitchEffect()
    } catch (error) {
      console.warn("[Alpha Dragon] Playground transition sound unavailable.", error)
    }
    setPlaygroundTransition(true)

    window.setTimeout(() => {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
    }, 520)

    window.setTimeout(() => {
      setFadeToPlayground(true)
    }, 1800)

    playgroundTransitionTimerRef.current = window.setTimeout(() => {
      router.push("/playground")
    }, 2250)
  }

  const hideNagaSpeechBubble = useCallback(() => {
    if (nagaSpeechTimerRef.current) clearTimeout(nagaSpeechTimerRef.current)
    nagaSpeechTimerRef.current = null
    setNagaSpeech(null)
  }, [])

  const showNagaSpeech = () => {
    if (nagaTipsPoolRef.current.length === 0) {
      nagaTipsPoolRef.current = shuffleStrings(NAGA_SAFE_TIPS)
    }
    const tip = nagaTipsPoolRef.current.pop()!
    const generation = ++nagaSpeechGenerationRef.current

    if (nagaSpeechTimerRef.current) clearTimeout(nagaSpeechTimerRef.current)
    nagaSpeechTimerRef.current = null

    setNagaSpeechBubbleKey(generation)
    setNagaSpeech(tip)

    const scheduleHide = (delayMs: number) => {
      if (nagaSpeechTimerRef.current) clearTimeout(nagaSpeechTimerRef.current)
      nagaSpeechTimerRef.current = setTimeout(() => {
        if (nagaSpeechGenerationRef.current !== generation) return
        hideNagaSpeechBubble()
      }, delayMs)
    }

    speakNagaMessage(tip, () => {
      if (nagaSpeechGenerationRef.current !== generation) return
      scheduleHide(450)
    })

    scheduleHide(estimateNagaSpeechMs(tip) + 500)
  }

  useEffect(() => {
    return () => stopNagaSpeech()
  }, [])

  const triggerTentacleReach = () => {
    setTentacleReach(true)
    window.setTimeout(() => setTentacleReach(false), 2000)
  }

  const handleNagaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (nagaClickTimerRef.current) clearTimeout(nagaClickTimerRef.current)
    nagaClickTimerRef.current = setTimeout(() => {
      showNagaSpeech()
      nagaClickTimerRef.current = null
    }, 280)
  }

  const handleNagaDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (nagaClickTimerRef.current) {
      clearTimeout(nagaClickTimerRef.current)
      nagaClickTimerRef.current = null
    }
    triggerTentacleReach()
  }

  const handleDecorClick = (
    e: React.MouseEvent,
    key: "one" | "two" | "three",
    frequencyHz: number
  ) => {
    e.stopPropagation()
    setDecorHueOffsets((prev) => ({
      ...prev,
      [key]: (prev[key] + 60) % 360,
    }))
    playDecorClickSound(frequencyHz)
  }

  const handleButtonClick = (buttonName: string, originalAction?: () => void) => {
    setExpandedButton(buttonName)
    setPageTransition(true)

    setTimeout(() => {
      setExpandedButton(null)
      if (originalAction) originalAction()
    }, 300)

    setTimeout(() => {
      setPageTransition(false)
    }, 800)
  }

  const createMessageBurst = (consoleNumber: number) => {
    const burstSize = Math.floor(Math.random() * 3) + 2 // 2-4 messages per burst
    const messages = []

    for (let i = 0; i < burstSize; i++) {
      const randomMessage = tradingMessages[Math.floor(Math.random() * tradingMessages.length)]
      const timestamp = new Date().toLocaleTimeString()
      messages.push(`[${timestamp}] ${randomMessage}`)
    }

    const burst: MessageBurst = {
      id: Date.now() + Math.random(),
      messages,
      timestamp: Date.now(),
    }

    if (consoleNumber === 1) {
      setConsole1Bursts((prev) => [burst, ...prev].slice(0, 8)) // Keep last 8 bursts
    } else if (consoleNumber === 2) {
      setConsole2Bursts((prev) => [burst, ...prev].slice(0, 8))
    } else {
      setConsole3Bursts((prev) => [burst, ...prev].slice(0, 8))
    }
  }

  useEffect(() => {
    // Initial bursts for each console
    setTimeout(() => createMessageBurst(1), 100)
    setTimeout(() => createMessageBurst(2), 200)
    setTimeout(() => createMessageBurst(3), 300)

    const interval1 = setInterval(() => createMessageBurst(1), Math.random() * 2000 + 3000)
    const interval2 = setInterval(() => createMessageBurst(2), Math.random() * 2000 + 3500)
    const interval3 = setInterval(() => createMessageBurst(3), Math.random() * 2000 + 4000)

    return () => {
      clearInterval(interval1)
      clearInterval(interval2)
      clearInterval(interval3)
    }
  }, [])

  const getNagaTransform = () => {
    if (!nagaRef.current) return ""

    const rect = nagaRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = (mousePosition.x - centerX) * 0.02
    const deltaY = (mousePosition.y - centerY) * 0.02

    return `translate(${deltaX}px, ${deltaY}px) rotateX(${deltaY * 0.5}deg) rotateY(${deltaX * 0.5}deg)`
  }

  const getTentacleReachTransform = () => {
    if (!tentacleReach || !nagaRef.current) return ""

    const rect = nagaRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = (mousePosition.x - centerX) * 0.1
    const deltaY = (mousePosition.y - centerY) * 0.1

    return `translate(${deltaX}px, ${deltaY}px) scale(1.1)`
  }

  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
        isDark ? "naga-landing-dark" : "bg-white"
      } ${nagaSpeech ? "naga-focus-mode" : ""}`}
      onClick={handleClick}
    >
      {pageTransition && (
        <div className="fixed inset-0 z-50 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm animate-pulse" />
      )}
      
      {fadeToPlayground && (
        <div className="fixed inset-0 z-[200] bg-[#06101d] transition-opacity duration-500 animate-fade-in pointer-events-none" />
      )}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 800" preserveAspectRatio="none" style={{ zIndex: 0 }}>
        <defs>
          <clipPath id="horizonClip">
            <path d={horizonPath} />
          </clipPath>
        </defs>
      </svg>

      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute pointer-events-none animate-bubble"
          style={{
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
            background: `hsl(${colorCycle}, 70%, 60%)`,
            borderRadius: "50%",
            animation: "bubble-float 1s ease-out forwards",
            zIndex: 25,
          }}
        />
      ))}



      <div
        className={`absolute inset-0 hidden xl:grid xl:grid-cols-3 xl:gap-4 xl:p-4 xl:text-sm ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
        style={{ clipPath: horizonClipPath, WebkitClipPath: horizonClipPath, zIndex: 1 }}
      >
        <div
          ref={console1Ref}
          className={`overflow-hidden font-mono text-[0.68rem] leading-relaxed transition-colors duration-500 flex flex-col-reverse sm:text-xs lg:text-sm ${
            isDark ? "text-emerald-400/85 opacity-50" : "text-emerald-700 opacity-40"
          }`}
        >
          {console1Bursts.map((burst, burstIndex) => (
            <div
              key={burst.id}
              className="mb-6 animate-slide-up-burst"
              style={{
                animationDelay: `${burstIndex * 0.1}s`,
                animationDuration: "0.8s",
                animationFillMode: "both",
              }}
            >
              {burst.messages.map((message, messageIndex) => (
                <div key={messageIndex} className="mb-1 opacity-90">
                  {message}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          ref={console2Ref}
          className={`overflow-hidden font-mono text-[0.68rem] leading-relaxed transition-colors duration-500 flex flex-col-reverse sm:text-xs lg:text-sm ${
            isDark ? "text-emerald-400/85 opacity-50" : "text-emerald-700 opacity-40"
          }`}
        >
          {console2Bursts.map((burst, burstIndex) => (
            <div
              key={burst.id}
              className="mb-6 animate-slide-up-burst"
              style={{
                animationDelay: `${burstIndex * 0.1}s`,
                animationDuration: "0.8s",
                animationFillMode: "both",
              }}
            >
              {burst.messages.map((message, messageIndex) => (
                <div key={messageIndex} className="mb-1 opacity-90">
                  {message}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          ref={console3Ref}
          className={`overflow-hidden font-mono text-[0.68rem] leading-relaxed transition-colors duration-500 flex flex-col-reverse sm:text-xs lg:text-sm ${
            isDark ? "text-emerald-400/85 opacity-50" : "text-emerald-700 opacity-40"
          }`}
        >
          {console3Bursts.map((burst, burstIndex) => (
            <div
              key={burst.id}
              className="mb-6 animate-slide-up-burst"
              style={{
                animationDelay: `${burstIndex * 0.1}s`,
                animationDuration: "0.8s",
                animationFillMode: "both",
              }}
            >
              {burst.messages.map((message, messageIndex) => (
                <div key={messageIndex} className="mb-1 opacity-90">
                  {message}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <svg
        className={`absolute inset-0 h-full w-full pointer-events-none ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
        viewBox="0 0 1600 800"
        preserveAspectRatio="none"
        style={{ zIndex: 2 }}
      >
        <defs>
          <linearGradient id="horizonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(${colorCycle}, 70%, ${horizonLightness})`} />
            <stop offset="50%" stopColor={`hsl(${(colorCycle + 60) % 360}, 75%, ${isDark ? "68%" : "60%"})`} />
            <stop offset="100%" stopColor={`hsl(${(colorCycle + 120) % 360}, 70%, ${horizonLightness})`} />
          </linearGradient>
        </defs>
        <path
          d={horizonPath}
          fill="none"
          stroke="url(#horizonGradient)"
          strokeWidth="3"
          opacity={isDark ? 0.85 : 0.6}
          filter={isDark ? "drop-shadow(0 0 14px rgba(52, 211, 153, 0.45))" : "drop-shadow(0 0 10px currentColor)"}
        />
      </svg>

      <div className="relative z-10 flex min-h-screen min-h-dvh flex-col items-center justify-start px-4 pt-32 pb-6 sm:px-6 sm:pt-36 sm:pb-8 lg:justify-center lg:p-8">
        <div
          className={`mb-16 flex max-w-full flex-col items-center text-center sm:mb-20 lg:mb-6 ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
        >
          <h1
            role="button"
            tabIndex={0}
            onClick={triggerBrandEffects}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                triggerBrandEffects(e)
              }
            }}
            className={`mb-4 max-w-full cursor-pointer select-none break-words font-mono text-4xl font-bold leading-tight transition-colors duration-500 hover:opacity-90 sm:mb-6 sm:text-5xl md:text-6xl ${
              megaGlitchActive ? "animate-mega-glitch-shake" : ""
            } ${isDark ? "text-emerald-50" : "text-gray-900"}`}
            style={{ color: `hsl(${colorCycle}, 55%, ${isDark ? "78%" : "20%"})` }}
            aria-label="Trigger logo spin and title glitch"
          >
            {glitchText.map((char, index) => (
              <span
                key={index}
                className={char.isGlitching ? "animate-glitch" : ""}
                style={{
                  color: char.isGlitching ? `hsl(${(colorCycle + index * 30) % 360}, 80%, 60%)` : undefined,
                }}
              >
                {char.glitched}
              </span>
            ))}
          </h1>
          <p
            className={`max-w-[22rem] font-mono text-base leading-relaxed transition-colors duration-500 sm:max-w-none sm:text-xl md:text-2xl ${
              isDark ? "text-emerald-200/75" : "text-gray-600"
            }`}
          >
            Decentralizing token data to discover alpha.
          </p>
        </div>

        <div
          className={`relative mx-auto w-full max-w-sm sm:max-w-2xl lg:max-w-[1600px] xl:max-w-[1760px] ${
            nagaSpeech ? "naga-stay-sharp z-[95]" : ""
          }`}
        >
          <div
            ref={nagaRef}
            className={`relative mx-auto mb-16 flex w-full justify-center transition-all duration-500 ease-out lg:absolute lg:left-1/2 lg:top-[46%] lg:mb-0 lg:w-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:transform ${
              playgroundTransition ? "z-[120]" : "z-20"
            } ${
              nagaSpeech ? "naga-spotlight naga-stay-sharp mt-[22vh] sm:mt-[24vh] lg:mt-0" : ""
            }`}
          >
            <div
              className={`relative ${
                playgroundTransition
                  ? "animate-center-naga-descend"
                  : cameFromPlayground
                  ? "animate-center-naga-ascend"
                  : "animate-float transition-transform duration-100 ease-out"
              }`}
              style={{
                transform: playgroundTransition
                  ? undefined
                  : `${getNagaTransform()} ${getTentacleReachTransform()}`,
                transformStyle: "preserve-3d",
              }}
            >
              <button
                type="button"
                aria-label="Click for alpha tip, double-click for tentacle reach"
                onClick={handleNagaClick}
                onDoubleClick={handleNagaDoubleClick}
                className={`cursor-pointer rounded-lg border-0 bg-transparent p-0 transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  nagaSpeech ? "scale-105" : ""
                }`}
                style={{ ["--naga-glow-hue" as string]: colorCycle }}
              >
                <img
                  src={NAGA_IMAGE}
                  alt="Data Naga"
                  className={`pointer-events-none h-auto w-60 drop-shadow-2xl transition-all duration-500 sm:w-72 md:w-80 lg:w-96 ${
                    nagaSpeech || tentacleReach ? "naga-glow-active naga-highlight-sharp" : ""
                  }`}
                />
              </button>

              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-tentacle-wiggle"
                    style={{
                      left: `${20 + i * 10}%`,
                      bottom: `${10 + (i % 2) * 20}%`,
                      width: "8px",
                      height: "40px",
                      background: `linear-gradient(to bottom, transparent, hsl(${(colorCycle + i * 60) % 360}, 60%, 40%))`,
                      borderRadius: "50%",
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: `${2 + i * 0.2}s`,
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Trigger logo spin and title glitch"
            onClick={triggerBrandEffects}
            className="absolute left-[64%] top-[72%] z-30 hidden h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center overflow-visible rounded-full bg-transparent p-0 transition-transform hover:scale-105 active:scale-95 lg:flex"
          >
            <span
              className={`pointer-events-none flex h-full w-full items-center justify-center drop-shadow-[0_0_18px_rgba(52,211,153,0.4)] ${
                logoSpinning ? "animate-logo-spin-once" : "animate-dragon-angry-shake"
              }`}
            >
              <img
                src="/images/logo.png"
                alt="$Alpha Dragon"
                className="h-full w-full object-contain object-center"
              />
            </span>
          </button>

          {SOCIAL_LINKS.map((link, index) => {
            const placement = HERO_SOCIAL_CLASSES[link.id]

            return (
              <button
                key={link.id}
                type="button"
                aria-label={link.label}
                className={`group absolute z-30 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl sm:flex ${placement.button} ${link.ringClass} ${link.bgClass}`}
                style={{ animationDelay: `${index * 0.25}s` }}
                onClick={(e) => {
                  e.stopPropagation()
                  const action = () => {
                    if (link.external) {
                      window.open(link.href, "_blank", "noopener,noreferrer")
                    } else {
                      window.location.href = link.href
                    }
                  }
                  handleButtonClick(link.id, action)
                }}
              >
                <span
                  className={`pointer-events-none absolute inset-0 rounded-[inherit] border-2 animate-social-pulse-ring ${link.ringClass}`}
                  style={{ animationDelay: `${index * 0.35}s` }}
                />
                <img
                  src={link.imageSrc}
                  alt=""
                  width={40}
                  height={40}
                  className={`relative z-10 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 ${placement.image}`}
                />
              </button>
            )
          })}

          <div className={`relative grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:block lg:h-[30rem] ${nagaSpeech ? "naga-stay-sharp" : ""}`}>
            <Button
              variant="outline"
              size="lg"
              className={`${actionButtonClass} animate-float-gentle lg:absolute lg:left-[4%] lg:top-[4%] ${
                expandedButton === "read" ? "animate-expand-down" : ""
              }`}
              style={{
                animationDelay: "0s",
                borderColor: `hsl(${colorCycle}, 60%, 50%)`,
              }}
              onClick={() =>
                handleButtonClick("read", () =>
                  window.open(SITE_LINKS.whitepaper, "_blank", "noopener,noreferrer")
                )
              }
            >
              <FileText className="mr-2 h-5 w-5" />
              Read the whitepaper
            </Button>

            <Button
              variant="outline"
              size="lg"
              className={`${actionButtonClass} animate-float-gentle lg:absolute lg:left-[1%] lg:top-[67%] ${
                expandedButton === "download" ? "animate-expand-down" : ""
              }`}
              style={{
                animationDelay: "1s",
                borderColor: `hsl(${(colorCycle + 72) % 360}, 60%, 50%)`,
              }}
              onClick={() =>
                handleButtonClick("download", () =>
                  window.open(SITE_LINKS.chromeExtension, "_blank", "noopener,noreferrer")
                )
              }
            >
              <Download className="mr-2 h-5 w-5" />
              Download the prototype
            </Button>

            <Button
              variant="outline"
              size="lg"
              className={`${actionButtonClass} animate-float-gentle lg:absolute lg:right-[4%] lg:top-[12%] ${
                expandedButton === "github" ? "animate-expand-down" : ""
              }`}
              style={{
                animationDelay: "2s",
                borderColor: `hsl(${(colorCycle + 144) % 360}, 60%, 50%)`,
              }}
              onClick={() =>
                handleButtonClick("github", () =>
                  window.open(SITE_LINKS.githubOrg, "_blank", "noopener,noreferrer")
                )
              }
            >
              <Github className="mr-2 h-5 w-5" />
              Contribute on GitHub
            </Button>

            <Button
              variant="outline"
              size="lg"
              className={`${actionButtonClass} animate-float-gentle lg:absolute lg:right-[9%] lg:top-[58%] ${
                expandedButton === "watch" ? "animate-expand-down" : ""
              }`}
              style={{
                animationDelay: "4s",
                borderColor: `hsl(${(colorCycle + 288) % 360}, 60%, 50%)`,
              }}
              onClick={() =>
                handleButtonClick("watch", () =>
                  window.open(SITE_LINKS.launchVideo, "_blank", "noopener,noreferrer")
                )
              }
            >
              <Play className="mr-2 h-5 w-5" />
              Watch a launch video
            </Button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Decorative 1 — click to shift color and play tone"
          onClick={(e) => handleDecorClick(e, "one", 440)}
          className={`absolute left-20 top-20 hidden cursor-pointer font-mono text-6xl font-bold opacity-30 transition-all duration-300 animate-pulse hover:scale-110 hover:opacity-60 md:block ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{
            color: `hsl(${(colorCycle + decorHueOffsets.one) % 360}, 70%, ${isDark ? "60%" : "40%"})`,
          }}
        >
          1
        </button>
        <button
          type="button"
          aria-label="Decorative 2 — click to shift color and play tone"
          onClick={(e) => handleDecorClick(e, "two", 554)}
          className={`absolute left-[10%] top-[54%] hidden cursor-pointer font-mono text-6xl font-bold transition-all duration-300 animate-pulse hover:scale-110 hover:opacity-70 sm:left-[12%] sm:top-[53%] md:block lg:left-[4%] lg:top-[60%] xl:left-[12%] xl:top-[56%] ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{
            color: `hsl(${(colorCycle + decorHueOffsets.two) % 360}, 70%, ${isDark ? "65%" : "40%"})`,
            opacity: decorOpacity,
            animationDelay: "1s",
          }}
        >
          2
        </button>
        <button
          type="button"
          aria-label="Decorative 3 — click to shift color and play tone"
          onClick={(e) => handleDecorClick(e, "three", 659)}
          className={`absolute right-20 top-32 hidden cursor-pointer font-mono text-6xl font-bold transition-all duration-300 animate-pulse hover:scale-110 hover:opacity-70 md:block ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{
            color: `hsl(${(colorCycle + decorHueOffsets.three) % 360}, 70%, ${isDark ? "65%" : "40%"})`,
            opacity: decorOpacity,
            animationDelay: "2s",
          }}
        >
          3
        </button>

        <div
          className={`absolute right-40 top-40 hidden h-16 w-16 rounded-full border-2 opacity-20 animate-spin-slow md:block ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{ borderColor: `hsl(${colorCycle}, 60%, 50%)` }}
        />
        <div
          className={`absolute left-[14%] top-[54%] hidden h-14 w-14 rounded-full border-2 opacity-20 animate-pulse sm:left-[16%] sm:top-[52%] md:block ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{ borderColor: `hsl(${(colorCycle + 90) % 360}, 60%, 50%)` }}
        />
        <div
          className={`absolute left-60 top-60 hidden h-8 w-8 rounded-full opacity-20 animate-bounce md:block ${nagaSpeech ? "naga-blur-when-speech" : ""}`}
          style={{ backgroundColor: `hsl(${(colorCycle + 180) % 360}, 60%, 50%)` }}
        />
      </div>

      {playgroundTransition && (
        <div className="pointer-events-none fixed inset-0 z-[8] overflow-hidden bg-slate-950/20 backdrop-blur-[2px]">
          <div className="animate-playground-portal-wash absolute inset-x-0 bottom-0 h-[48vh] bg-gradient-to-t from-emerald-950/75 via-slate-950/45 to-transparent" />
        </div>
      )}

      {nagaSpeech && (
        <>
          <div
            className={`pointer-events-none fixed inset-0 z-[85] ${
              isDark ? "bg-black/40" : "bg-white/25"
            }`}
            aria-hidden
          />
          <div
            className="naga-speech-overlay naga-stay-sharp pointer-events-none fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh] sm:pt-[10vh] lg:pt-[6vh]"
            aria-live="polite"
          >
            <div
              key={nagaSpeechBubbleKey}
              className={`naga-speech-bubble-3d pointer-events-auto relative w-full max-w-sm rounded-lg border-2 px-4 py-4 text-center sm:max-w-xl sm:px-6 sm:py-5 ${
                isDark ? "naga-speech-bubble-3d--dark" : "naga-speech-bubble-3d--light"
              } ${
                isDark
                  ? "border-emerald-400/50 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-emerald-50"
                  : "border-emerald-500/60 bg-gradient-to-br from-white via-emerald-50/90 to-white text-emerald-950"
              }`}
            >
              <span
                className={`mb-3 block font-mono text-xs font-bold uppercase tracking-[0.25em] ${
                  isDark ? "text-emerald-300/90" : "text-emerald-700/80"
                }`}
              >
                Naga says
              </span>
              <p className="font-mono text-sm leading-relaxed sm:text-lg">{nagaSpeech}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
