"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Download, Lock, LogOut, Mail, ThumbsDown, ThumbsUp, Upload, UserRound } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import JSZip from "jszip"
import { defaultPlaygroundModules, type PlaygroundModule } from "@/lib/playground-default-modules"
import { WalkthroughContent } from "@/lib/walkthrough-content"
import { speakNagaMessage } from "@/lib/sounds"
import {
  collection,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDownloadURL,
  getPlaygroundFirebase,
  increment,
  onAuthStateChanged,
  onSnapshot,
  query,
  ref,
  runTransaction,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  uploadBytes,
  where,
  type User,
} from "@/lib/playground-firebase"

const NAGA_IMAGE =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/telegram-cloud-document-1-4961135720249951764.jpg-IOlkPvCq9ilZnXyQZf9udss7L7xPMv.png"

const CONSOLE_LINES = [
  "Checking mint, freeze, and authority flags...",
  "Mapping holder distribution...",
  "Report enrichment complete...",
  "Monitoring launch-phase activity...",
  "Data feed connected - standing by...",
  "Risk checklist in progress...",
  "Looking for coordinated wallet clusters...",
  "Cross-referencing public scanners...",
  "Reviewing liquidity and pool health...",
  "Tracking early buyer patterns...",
]

type FirebaseBundle = NonNullable<ReturnType<typeof getPlaygroundFirebase>>

interface UserDoc {
  blacklisted?: boolean
  email?: string
  displayName?: string
  provider?: string
}

type AuthDialogMode = "signin" | "signup" | "forgot" | null

function maskEmail(email: string) {
  if (!email || !email.includes("@")) return email
  const [name, domain] = email.split("@")
  if (name.length <= 2) return `***@${domain}`
  return `${name.substring(0, 2)}***@${domain}`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72)
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function byVoteScoreThenName(a: PlaygroundModule, b: PlaygroundModule) {
  const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
  const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
  if (scoreA !== scoreB) return scoreB - scoreA
  return String(a.name).localeCompare(String(b.name))
}

function normalizePlaygroundAssetUrl(value: string) {
  if (!value) return value
  if (value.startsWith("./default-packages/")) {
    return value.replace("./default-packages/", "/playground/default-packages/")
  }
  if (value.startsWith("default-packages/")) {
    return `/playground/${value}`
  }
  if (value.startsWith("./thumbnails/")) {
    return value.replace("./thumbnails/", "/playground/thumbnails/")
  }
  if (value.startsWith("thumbnails/")) {
    return `/playground/${value}`
  }
  if (value.startsWith("../icon-128.png")) return "/images/logo.png"
  return value
}

function normalizePlaygroundModule(moduleItem: PlaygroundModule): PlaygroundModule {
  return {
    ...moduleItem,
    thumbnailUrl: normalizePlaygroundAssetUrl(moduleItem.thumbnailUrl),
    packageUrl: normalizePlaygroundAssetUrl(moduleItem.packageUrl),
  }
}

function formatAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("auth/unauthorized-domain")) {
    const host = typeof window === "undefined" ? "this domain" : window.location.hostname
    return `Google sign-in is blocked because ${host} is not authorized in Firebase. Add ${host} in Firebase Console -> Authentication -> Settings -> Authorized domains.`
  }
  return message || "Authentication failed."
}

interface MessageBurst {
  id: number
  messages: string[]
  timestamp: number
}

function defaultModuleDocument(moduleItem: PlaygroundModule) {
  return {
    name: moduleItem.name,
    slug: moduleItem.slug,
    sequence: moduleItem.sequence,
    description: moduleItem.description,
    setupInstructions: moduleItem.setupInstructions,
    dataInputs: moduleItem.dataInputs || [],
    dataApis: moduleItem.dataApis || [],
    thumbnailUrl: moduleItem.thumbnailUrl,
    packageUrl: moduleItem.packageUrl,
    uploaderUid: "core",
    uploaderEmail: moduleItem.uploaderEmail || "Alpha Dragon core",
    status: "active",
    upvotes: moduleItem.upvotes || 0,
    downvotes: moduleItem.downvotes || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function PlaygroundPage() {
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const firebaseRef = useRef<FirebaseBundle | null>(null)
  const [modules, setModules] = useState<PlaygroundModule[]>(defaultPlaygroundModules)
  const [votes, setVotes] = useState<Map<string, number>>(new Map())
  const [user, setUser] = useState<User | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [authDialog, setAuthDialog] = useState<AuthDialogMode>(null)
  const [firebaseStatus, setFirebaseStatus] = useState("Connecting to Firebase...")
  const [authMessage, setAuthMessage] = useState("")
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploading, setUploading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const [console1Bursts, setConsole1Bursts] = useState<MessageBurst[]>([])
  const [console2Bursts, setConsole2Bursts] = useState<MessageBurst[]>([])
  const [console3Bursts, setConsole3Bursts] = useState<MessageBurst[]>([])

  const createMessageBurst = useCallback((consoleNumber: number) => {
    const burstSize = Math.floor(Math.random() * 3) + 2
    const messages = []

    for (let i = 0; i < burstSize; i++) {
      const randomMessage = CONSOLE_LINES[Math.floor(Math.random() * CONSOLE_LINES.length)]
      const timestamp = new Date().toLocaleTimeString()
      messages.push(`[${timestamp}] ${randomMessage}`)
    }

    const burst: MessageBurst = {
      id: Date.now() + Math.random(),
      messages,
      timestamp: Date.now(),
    }

    if (consoleNumber === 1) {
      setConsole1Bursts((prev) => [burst, ...prev].slice(0, 8))
    } else if (consoleNumber === 2) {
      setConsole2Bursts((prev) => [burst, ...prev].slice(0, 8))
    } else {
      setConsole3Bursts((prev) => [burst, ...prev].slice(0, 8))
    }
  }, [])

  useEffect(() => {
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
  }, [createMessageBurst])

  const realUser = Boolean(user && !user.isAnonymous)
  const blacklisted = Boolean(userDoc?.blacklisted)
  const uploadLocked = !realUser || blacklisted || uploading

  const sortedModules = useMemo(() => [...modules].sort(byVoteScoreThenName), [modules])

  const mergeModules = useCallback((remoteModules: PlaygroundModule[]) => {
    const byId = new Map(defaultPlaygroundModules.map((moduleItem) => [moduleItem.id, { ...moduleItem }]))
    for (const moduleItem of remoteModules) {
      const fallbackId = moduleItem.id || moduleItem.slug
      byId.set(fallbackId, {
        ...byId.get(fallbackId),
        ...moduleItem,
        id: fallbackId,
      })
    }
    setModules(
      [...byId.values()]
        .map(normalizePlaygroundModule)
        .filter((moduleItem) => moduleItem.status === "active")
        .sort(byVoteScoreThenName)
    )
  }, [])

  const loadVotesForUser = useCallback(
    async (nextUser: User | null, moduleList: PlaygroundModule[]) => {
      const firebase = firebaseRef.current
      if (!firebase || !nextUser) {
        setVotes(new Map())
        return
      }

      const nextVotes = new Map<string, number>()
      await Promise.allSettled(
        moduleList.map(async (moduleItem) => {
          const voteRef = doc(firebase.db, "votes", `${moduleItem.id}_${nextUser.uid}`)
          const snapshot = await getDoc(voteRef)
          if (snapshot.exists()) {
            nextVotes.set(moduleItem.id, Number(snapshot.data().value) || 0)
          }
        })
      )
      setVotes(nextVotes)
    },
    []
  )

  const ensureAnonymousUser = useCallback(async () => {
    const firebase = firebaseRef.current
    if (!firebase) return null
    if (!firebase.auth.currentUser) {
      await signInAnonymously(firebase.auth)
    }
    return firebase.auth.currentUser
  }, [])

  const upsertUserProfile = useCallback(async (nextUser: User | null) => {
    const firebase = firebaseRef.current
    if (!firebase || !nextUser || nextUser.isAnonymous) return null

    const profileRef = doc(firebase.db, "users", nextUser.uid)
    const existing = await getDoc(profileRef)
    const provider = nextUser.providerData?.[0]?.providerId || "password"
    const base = {
      email: nextUser.email || "",
      displayName: nextUser.displayName || "",
      provider,
      lastLoginAt: serverTimestamp(),
    }

    if (existing.exists()) {
      await updateDoc(profileRef, base)
      return { ...existing.data(), ...base } as UserDoc
    }

    const newProfile = {
      ...base,
      blacklisted: false,
      createdAt: serverTimestamp(),
    }
    await setDoc(profileRef, newProfile)
    return newProfile as UserDoc
  }, [])

  useEffect(() => {
    const firebase = getPlaygroundFirebase()
    firebaseRef.current = firebase

    if (!firebase) {
      setFirebaseStatus("Firebase config is missing. Showing static defaults only.")
      return
    }

    setFirebaseStatus("Connected. Browse, or sign in to vote or publish modules.")

    const modulesQuery = query(collection(firebase.db, "modules"), where("status", "==", "active"))
    const unsubscribeModules = onSnapshot(
      modulesQuery,
      (snapshot) => {
        const remoteModules = snapshot.docs.map((moduleDoc) => ({
          id: moduleDoc.id,
          ...(moduleDoc.data() as Omit<PlaygroundModule, "id">),
        }))
        mergeModules(remoteModules)
      },
      (error) => {
        console.error(error)
        setFirebaseStatus("Firestore query failed. Showing static defaults while rules/config are checked.")
      }
    )

    const unsubscribeAuth = onAuthStateChanged(firebase.auth, async (nextUser) => {
      if (!nextUser) {
        ensureAnonymousUser().catch((error) => setAuthMessage(error.message))
        return
      }
      setUser(nextUser)
      const nextUserDoc = await upsertUserProfile(nextUser)
      setUserDoc(nextUserDoc)
      await loadVotesForUser(nextUser, defaultPlaygroundModules)
    })

    // Play the voice when playground page is mounted
    try {
      setIsSpeaking(true)
      speakNagaMessage("The developer modules are boring, lets create our own Dragon")
      setTimeout(() => setIsSpeaking(false), 4500)
    } catch (error) {
      console.warn("[Alpha Dragon] Could not play playground voice", error)
    }

    return () => {
      unsubscribeModules()
      unsubscribeAuth()
    }
  }, [ensureAnonymousUser, loadVotesForUser, mergeModules, upsertUserProfile])

  useEffect(() => {
    void loadVotesForUser(user, modules)
  }, [loadVotesForUser, modules, user])

  async function handleVote(moduleId: string, value: 1 | -1) {
    const firebase = firebaseRef.current
    const moduleItem = sortedModules.find((item) => item.id === moduleId)
    if (!moduleItem) return

    if (!firebase) {
      const previous = votes.get(moduleId) || 0
      const next = previous === value ? 0 : value
      setVotes((current) => {
        const copy = new Map(current)
        if (next === 0) copy.delete(moduleId)
        else copy.set(moduleId, next)
        return copy
      })
      setModules((current) =>
        current.map((item) => {
          if (item.id !== moduleId) return item
          return {
            ...item,
            upvotes: Math.max(0, (item.upvotes || 0) + (previous === 1 ? -1 : 0) + (next === 1 ? 1 : 0)),
            downvotes: Math.max(0, (item.downvotes || 0) + (previous === -1 ? -1 : 0) + (next === -1 ? 1 : 0)),
          }
        })
      )
      return
    }

    const activeUser = firebase.auth.currentUser
    if (!activeUser || activeUser.isAnonymous) {
      setAuthDialog("signin")
      return
    }

    const voteRef = doc(firebase.db, "votes", `${moduleId}_${activeUser.uid}`)
    const moduleRef = doc(firebase.db, "modules", moduleId)
    const previous = votes.get(moduleId) || 0
    const next = previous === value ? 0 : value

    await runTransaction(firebase.db, async (transaction) => {
      const moduleSnapshot = await transaction.get(moduleRef)
      const changes: Record<string, ReturnType<typeof increment>> = {}

      if (previous === 1 && next !== 1) changes.upvotes = increment(-1)
      if (previous === -1 && next !== -1) changes.downvotes = increment(-1)
      if (next === 1 && previous !== 1) changes.upvotes = increment(1)
      if (next === -1 && previous !== -1) changes.downvotes = increment(1)

      if (!moduleSnapshot.exists()) {
        transaction.set(moduleRef, {
          ...defaultModuleDocument(moduleItem),
          upvotes: next === 1 ? 1 : 0,
          downvotes: next === -1 ? 1 : 0,
          updatedAt: serverTimestamp(),
        })
      } else if (Object.keys(changes).length) {
        transaction.set(moduleRef, { ...changes, updatedAt: serverTimestamp() }, { merge: true })
      }

      transaction.set(voteRef, {
        moduleId,
        uid: activeUser.uid,
        value: next,
        updatedAt: serverTimestamp(),
      })
    })

    setVotes((current) => {
      const copy = new Map(current)
      if (next === 0) copy.delete(moduleId)
      else copy.set(moduleId, next)
      return copy
    })
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firebase = firebaseRef.current
    if (!firebase) {
      setAuthMessage("Firebase is not configured yet.")
      return
    }

    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") || "").trim()
    const password = String(form.get("password") || "")
    if (!email || !password) {
      setAuthMessage("Enter email and password.")
      return
    }

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(firebase.auth, email, password)
        setAuthMessage("Account created. You can upload modules now.")
      } else {
        await signInWithEmailAndPassword(firebase.auth, email, password)
        setAuthMessage("Signed in.")
      }
      event.currentTarget.reset()
      setAuthDialog(null)
    } catch (error) {
      setAuthMessage(formatAuthError(error))
    }
  }

  async function handleGoogleSignIn() {
    const firebase = firebaseRef.current
    if (!firebase) {
      setAuthMessage("Firebase is not configured yet.")
      return
    }
    try {
      await signInWithPopup(firebase.auth, firebase.googleProvider)
      setAuthMessage("Signed in with Google.")
      setAuthDialog(null)
    } catch (error) {
      setAuthMessage(formatAuthError(error))
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firebase = firebaseRef.current
    const form = new FormData(event.currentTarget)
    const email = String(form.get("resetEmail") || "").trim()
    if (!firebase) {
      setAuthMessage("Firebase is not configured yet.")
      return
    }
    if (!email) {
      setAuthMessage("Enter your email for password reset.")
      return
    }
    try {
      await sendPasswordResetEmail(firebase.auth, email)
      setAuthMessage("Password reset email sent.")
    } catch (error) {
      setAuthMessage(formatAuthError(error))
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firebase = firebaseRef.current
    if (!firebase || !user || user.isAnonymous) {
      setUploadMessage("Sign in before uploading.")
      return
    }
    if (blacklisted) {
      setUploadMessage("This account is blacklisted from uploading.")
      return
    }

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") || "").trim()
    const description = String(form.get("description") || "").trim()
    const setupInstructions = String(form.get("setupInstructions") || "").trim()
    const dataInputs = parseTags(form.get("dataInputs"))
    const dataApis = parseTags(form.get("dataApis"))
    const thumbnailFile = form.get("thumbnail") as File | null
    const packageFile = form.get("package") as File | null
    const rightsConfirmed = form.get("rightsConfirmed") === "on"

    if (!name || !description || !setupInstructions || !thumbnailFile?.size || !packageFile?.size) {
      setUploadMessage("Complete the module fields, thumbnail, and zip package.")
      return
    }

    if (!rightsConfirmed) {
      setUploadMessage("Confirm that you have rights to share this module and disclosed required services or data terms.")
      return
    }

    const slug = slugify(name)
    const moduleId = `${slug}-${Date.now()}`

    try {
      setUploading(true)
      setUploadMessage("Validating zip package...")

      const zip = await JSZip.loadAsync(packageFile)
      const filePaths = Object.keys(zip.files)
      const fileBaseNames = filePaths.map(p => p.split('/').pop() || '')

      const requiredFiles = ['module.css', 'module.js', 'module.json', 'README.md', 'thumbnail.png']
      const missingFiles = requiredFiles.filter(req => !fileBaseNames.includes(req))

      if (missingFiles.length > 0) {
        setUploadMessage(`Validation failed. Missing mandatory files: ${missingFiles.join(', ')}`)
        setUploading(false)
        return
      }

      setUploadMessage("Uploading module files...")

      const thumbRef = ref(firebase.storage, `module-thumbnails/${user.uid}/${moduleId}-${thumbnailFile.name}`)
      const packageRef = ref(firebase.storage, `module-packages/${user.uid}/${moduleId}-${packageFile.name}`)

      await uploadBytes(thumbRef, thumbnailFile)
      await uploadBytes(packageRef, packageFile)
      const thumbnailUrl = await getDownloadURL(thumbRef)
      const packageUrl = await getDownloadURL(packageRef)

      await setDoc(doc(firebase.db, "modules", moduleId), {
        name,
        slug,
        sequence: 1000,
        description,
        setupInstructions,
        dataInputs,
        dataApis,
        thumbnailUrl,
        packageUrl,
        uploaderUid: user.uid,
        uploaderEmail: user.email || "",
        moduleAuthorRightsConfirmed: true,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      event.currentTarget.reset()
      setUploadMessage("Module published to the Playground.")
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const handleDragonClick = () => {
    if (isExiting) return
    setIsExiting(true)
    sessionStorage.setItem("fromPlayground", "true")
    setTimeout(() => {
      router.push("/")
    }, 1200)
  }

  const authSummary = !firebaseRef.current
    ? "Firebase is not configured."
    : realUser
      ? blacklisted
        ? `${user?.email || "This account"} is blacklisted from uploads.`
        : `Signed in as ${user?.email || user?.displayName || "user"}.`
      : "Browse and vote freely. Sign in or sign up when you want to upload a module."

  return (
    <>
      <main className={`min-h-screen overflow-hidden bg-[#06101d] text-emerald-50 ${isExiting ? "animate-fade-out" : "animate-fade-in"}`}>
        <section className="relative min-h-[36rem] overflow-hidden border-b border-emerald-400/20 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.15)_0%,rgba(6,16,29,1)_35%,rgba(4,8,20,1)_100%)]">
          <div className="absolute inset-0 font-mono text-sm leading-relaxed text-emerald-400/15">
            {/* Left background (Full height) */}
            <div className="absolute inset-y-8 left-6 w-[calc(100%-3rem)] md:w-[22%] overflow-hidden md:left-10">
              <div className="flex w-full flex-col-reverse">
                {console1Bursts.map((burst, burstIndex) => (
                  <div key={burst.id} className="mb-6 animate-slide-up-burst" style={{ animationDelay: `${burstIndex * 0.1}s`, animationDuration: "0.8s", animationFillMode: "both" }}>
                    {burst.messages.map((message, messageIndex) => (
                      <div key={messageIndex} className="mb-1 opacity-90">{message}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Right background (Above text) */}
            <div className="absolute right-6 top-8 hidden h-[20%] w-[20%] overflow-hidden md:flex md:right-10">
              <div className="flex w-full flex-col-reverse">
                {console3Bursts.map((burst, burstIndex) => (
                  <div key={burst.id} className="mb-6 animate-slide-up-burst" style={{ animationDelay: `${burstIndex * 0.1}s`, animationDuration: "0.8s", animationFillMode: "both" }}>
                    {burst.messages.map((message, messageIndex) => (
                      <div key={messageIndex} className="mb-1 opacity-90">{message}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Right background (Below text) */}
            <div className="absolute bottom-8 right-6 hidden h-[20%] w-[20%] overflow-hidden md:flex md:right-10">
              <div className="flex w-full flex-col-reverse">
                {console3Bursts.map((burst, burstIndex) => (
                  <div key={burst.id} className="mb-6 animate-slide-up-burst" style={{ animationDelay: `${burstIndex * 0.1}s`, animationDuration: "0.8s", animationFillMode: "both" }}>
                    {burst.messages.map((message, messageIndex) => (
                      <div key={messageIndex} className="mb-1 opacity-90">{message}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>


          <div className="relative z-20 mx-auto flex min-h-[40rem] w-full max-w-[90rem] flex-col items-center justify-between gap-12 px-6 pb-12 pt-28 md:flex-row md:pt-16">
            <div className={`flex w-full flex-1 items-center justify-center md:pl-16 lg:pl-24 ${isExiting ? "animate-naga-fly-up" : "animate-naga-drop-in"}`}>
              <img
                src={NAGA_IMAGE}
                alt="Alpha Dragon module guardian"
                onClick={handleDragonClick}
                className={`playground-naga-drop relative z-10 h-[20rem] w-auto cursor-pointer drop-shadow-[0_30px_70px_rgba(0,0,0,0.55)] md:h-[26rem] lg:h-[32rem] animate-float hover:scale-105 ${isSpeaking ? "naga-glow-active naga-highlight-sharp scale-105" : ""
                  } transition-all duration-500`}
                style={{ ["--naga-glow-hue" as string]: "150" }}
              />
            </div>

            <div className="flex w-full flex-1 items-center justify-center md:pr-12 lg:pr-24">
              <div className="z-20 max-w-[42rem]">
                <h1 className="mb-6 font-sans text-4xl font-black leading-[1.15] tracking-tight text-white md:text-5xl lg:text-5xl">
                  Download, test, and share <br /> Alpha Dragon modules.
                </h1>
                <p className="mb-8 max-w-md text-base leading-relaxed text-slate-300 md:text-lg">
                  Browse community module packages, vote on useful ideas, and publish your own zip package.
                </p>
                <div className="inline-flex items-center gap-3 text-sm font-medium text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  {firebaseStatus}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 border-t border-emerald-400/20 bg-[#07111f]">
          <div className="mx-auto grid w-full max-w-[90rem] gap-5 px-5 py-6 sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8">
            <section className="rounded-lg border border-emerald-400/25 bg-slate-950/70 p-4 sm:p-5 shadow-2xl shadow-black/30 overflow-hidden">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                    Playground
                  </p>
                  <h2 className="m-0 text-3xl font-black text-white">Available Modules</h2>
                </div>
                <span className="font-mono text-sm font-bold text-slate-300">
                  {sortedModules.length} module{sortedModules.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {sortedModules.map((moduleItem) => {
                  const voteValue = votes.get(moduleItem.id) || 0
                  return (
                    <article
                      key={moduleItem.id}
                      className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 rounded-lg border border-emerald-400/20 bg-slate-900/80 p-3 sm:p-4"
                    >
                      <img
                        src={moduleItem.thumbnailUrl || "/images/logo.png"}
                        alt={`${moduleItem.name} thumbnail`}
                        className="h-16 w-16 sm:h-28 sm:w-28 flex-shrink-0 rounded-lg border border-emerald-400/35 bg-slate-950 object-cover"
                      />
                      <div className="min-w-0 w-full">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="m-0 text-xl font-black text-white">{moduleItem.name}</h3>
                          <span className="rounded-full border border-emerald-400/20 bg-slate-950/80 px-2 py-1 font-mono text-xs font-black text-slate-300">
                            #{moduleItem.sequence || "-"}
                          </span>
                        </div>
                        <p className="mb-4 text-sm leading-6 text-slate-300">{moduleItem.description}</p>
                        <TagGroup label="Inputs" tags={moduleItem.dataInputs} />
                        <TagGroup label="APIs" tags={moduleItem.dataApis} />
                        <p className="mt-3 text-xs text-slate-400">
                          Published by {moduleItem.uploaderEmail ? maskEmail(moduleItem.uploaderEmail) : "community"}
                          {moduleItem.isDefault ? " - core module" : ""}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={moduleItem.packageUrl || "#"}
                            className="inline-flex items-center gap-2 rounded bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950 no-underline hover:bg-emerald-300"
                          >
                            <Download className="h-4 w-4" />
                            Download zip
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleVote(moduleItem.id, 1)}
                            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-black ${voteValue === 1
                              ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                              : "border-slate-600 bg-slate-800 text-white"
                              }`}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Upvote {moduleItem.upvotes || 0}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleVote(moduleItem.id, -1)}
                            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-black ${voteValue === -1
                              ? "border-pink-300 bg-pink-500/20 text-pink-100"
                              : "border-slate-600 bg-slate-800 text-white"
                              }`}
                          >
                            <ThumbsDown className="h-4 w-4" />
                            Downvote {moduleItem.downvotes || 0}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <aside className="grid gap-3 sm:gap-4 lg:sticky lg:top-4">
              <section className="rounded-lg border border-emerald-400/25 bg-slate-950/80 p-4 sm:p-5 shadow-2xl shadow-black/30">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-emerald-400/40 bg-slate-900">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-8 w-8 text-emerald-300" />
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-mono text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                      Account
                    </p>
                    <h2 className="m-0 text-2xl font-black text-white">
                      {realUser ? "Signed In" : "Upload Access"}
                    </h2>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-6 text-slate-300">{authSummary}</p>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin")
                      setAuthDialog("signin")
                      setAuthMessage("")
                    }}
                    className="rounded bg-emerald-400 px-4 py-2 sm:py-3 text-sm font-black text-slate-950"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup")
                      setAuthDialog("signup")
                      setAuthMessage("")
                    }}
                    className="rounded border border-emerald-400/45 px-4 py-2 sm:py-3 text-sm font-black text-emerald-100 hover:bg-emerald-400/10"
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthDialog("forgot")
                      setAuthMessage("")
                    }}
                    className="rounded border border-slate-600 px-4 py-2 sm:py-3 text-sm font-black text-white hover:bg-slate-800"
                  >
                    Forgot password
                  </button>
                  {realUser && (
                    <button
                      type="button"
                      onClick={() => {
                        const firebase = firebaseRef.current
                        if (firebase) void signOut(firebase.auth)
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded border border-slate-600 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </div>

                {authMessage && <p className="mt-4 text-sm text-emerald-200">{authMessage}</p>}
              </section>

              <section className="rounded-lg border border-emerald-400/25 bg-slate-950/80 p-4 sm:p-5 shadow-2xl shadow-black/30">
                <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                  Publish
                </p>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">Upload Module Zip</h2>
                  <button
                    type="button"
                    onClick={() => setWalkthroughOpen(true)}
                    className="group relative flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300 transition-all hover:border-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-100 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                    title="View Module Development Walkthrough"
                  >
                    <BookOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Walkthrough
                  </button>
                </div>
                <form className="grid gap-2 sm:gap-3" onSubmit={handleUpload}>
                  <FormInput name="name" label="Module name" placeholder="Wallet Risk Radar" required maxLength={50} />
                  <FormTextarea name="description" label="Brief description" placeholder="What it shows and why it matters." maxLength={200} />
                  <FormTextarea
                    name="setupInstructions"
                    label="Setup instructions"
                    placeholder="How to install, configure APIs, and test locally."
                    maxLength={1000}
                  />
                  <FormInput name="dataInputs" label="Data inputs" placeholder="contractAddress, backendReport" maxLength={100} />
                  <FormInput name="dataApis" label="Data APIs" placeholder="fetchData, custom-rpc" maxLength={100} />
                  <label className="grid gap-1 text-sm font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      Thumbnail image
                      <span className="text-[0.65rem] font-medium tracking-wide text-slate-400">(Recommended: 16:9 ratio, max 2MB)</span>
                    </div>
                    <input
                      name="thumbnail"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-slate-300">
                    Module zip package
                    <input
                      name="package"
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="flex items-start gap-3 rounded border border-emerald-400/20 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300">
                    <input
                      name="rightsConfirmed"
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 rounded border-emerald-400/40 bg-slate-950 accent-emerald-400"
                    />
                    <span>
                      I confirm I have rights to share this module package and have disclosed any third-party libraries, APIs, backend services, data collection, permissions, or reuse terms that affect installation or use.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={uploadLocked}
                    className="inline-flex items-center justify-center gap-2 rounded bg-emerald-400 px-4 py-2 sm:py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {uploadLocked ? <Lock className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Upload to Playground"}
                  </button>
                </form>
                {uploadMessage && <p className="mt-4 text-sm text-emerald-200">{uploadMessage}</p>}
              </section>
            </aside>
          </div>
        </section>
      </main>

      {authDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={authDialog === "forgot" ? "Forgot password" : authDialog === "signup" ? "Sign up" : "Sign in"}
          onClick={() => setAuthDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-emerald-400/30 bg-slate-950 p-6 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                  Account
                </p>
                <h2 className="m-0 text-3xl font-black text-white">
                  {authDialog === "forgot" ? "Forgot password" : authDialog === "signup" ? "Sign up" : "Sign in"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAuthDialog(null)}
                className="rounded border border-slate-700 px-3 py-1 text-sm font-black text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {authDialog === "forgot" ? (
              <form className="grid gap-3" onSubmit={handleForgotPassword}>
                <label className="grid gap-1 text-sm font-bold text-slate-300">
                  Email
                  <input
                    name="resetEmail"
                    type="email"
                    className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-300"
                    placeholder="you@example.com"
                  />
                </label>
                <button type="submit" className="rounded bg-emerald-400 px-4 py-3 font-black text-slate-950">
                  Send reset email
                </button>
              </form>
            ) : (
              <div className="grid gap-4">
                <form className="grid gap-3" onSubmit={handleAuthSubmit}>
                  <label className="grid gap-1 text-sm font-bold text-slate-300">
                    Email
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-300"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-slate-300">
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                      className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-300"
                      placeholder="Minimum 6 characters"
                    />
                  </label>
                  <button type="submit" className="rounded bg-emerald-400 px-4 py-3 font-black text-slate-950">
                    {authMode === "signup" ? "Create account" : "Sign in"}
                  </button>
                </form>

                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <span className="h-px flex-1 bg-slate-800" />
                  or
                  <span className="h-px flex-1 bg-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-600 px-4 py-3 font-black text-white hover:bg-slate-800"
                >
                  <Mail className="h-4 w-4" />
                  Sign in with Google
                </button>
              </div>
            )}

            {authMessage && <p className="mt-4 text-sm leading-6 text-emerald-200">{authMessage}</p>}
          </div>
        </div>
      )}

      {walkthroughOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Module Development Walkthrough"
          onClick={() => setWalkthroughOpen(false)}
        >
          <div
            className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-emerald-400/30 bg-slate-950 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-emerald-400/20 px-6 py-4">
              <h2 className="flex items-center gap-3 m-0 text-xl font-black text-white sm:text-2xl">
                <BookOpen className="h-6 w-6 text-emerald-400" />
                Module Development Walkthrough
              </h2>
              <button
                type="button"
                onClick={() => setWalkthroughOpen(false)}
                className="rounded border border-slate-700 px-3 py-1.5 text-sm font-black text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-300">
              <div className="prose prose-invert prose-emerald max-w-none">
                <WalkthroughContent />
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-emerald-400/20 bg-slate-900/50 px-6 py-4 text-center">
              <button
                type="button"
                onClick={() => setWalkthroughOpen(false)}
                className="rounded bg-emerald-400 px-6 py-2.5 font-black text-slate-950 transition-transform hover:scale-105"
              >
                Got it, let's build!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TagGroup({ label, tags }: { label: string; tags?: string[] }) {
  return (
    <div className="mb-2">
      <p className="mb-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(tags?.length ? tags : ["none listed"]).map((tag) => (
          <span key={tag} className="rounded bg-slate-800 px-2 py-1 text-[0.72rem] font-bold text-slate-300">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function FormInput({
  name,
  label,
  placeholder,
  required,
  maxLength,
}: {
  name: string
  label: string
  placeholder: string
  required?: boolean
  maxLength?: number
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-300">
      {label}
      <input
        name={name}
        required={required}
        maxLength={maxLength}
        className="rounded border border-emerald-400/25 bg-slate-950 px-3 py-1.5 sm:py-2 text-white outline-none focus:border-emerald-300"
        placeholder={placeholder}
      />
    </label>
  )
}

function FormTextarea({
  name,
  label,
  placeholder,
  maxLength,
}: {
  name: string
  label: string
  placeholder: string
  maxLength?: number
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-300">
      {label}
      <textarea
        name={name}
        required
        rows={3}
        maxLength={maxLength}
        className="resize-y rounded border border-emerald-400/25 bg-slate-950 px-3 py-1.5 sm:py-2 text-white outline-none focus:border-emerald-300"
        placeholder={placeholder}
      />
    </label>
  )
}
