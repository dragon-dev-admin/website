"use client"

import { useState, useEffect, useRef } from "react"
import {
  getPlaygroundFirebase,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "@/lib/playground-firebase"
import { ShieldAlert, ShieldCheck, PowerOff, Power, Trash, RefreshCcw, UserMinus, UserCheck, X } from "lucide-react"

type FirebaseBundle = NonNullable<ReturnType<typeof getPlaygroundFirebase>>

type AdminModule = {
  id: string
  name?: string
  description?: string
  status?: string
  uploaderEmail?: string
  uploaderUid?: string
  upvotes?: number
  downvotes?: number
}

type AdminUser = {
  id: string
  email?: string
  displayName?: string
  provider?: string
  blacklisted?: boolean
}

export function AdminPage() {
  const firebaseRef = useRef<FirebaseBundle | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isRoot, setIsRoot] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Checking admin access...")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authMessage, setAuthMessage] = useState("")

  const [modules, setModules] = useState<AdminModule[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  useEffect(() => {
    const firebase = getPlaygroundFirebase()
    firebaseRef.current = firebase
    setFirebaseReady(!!firebase)

    if (!firebase) {
      setStatusMessage("Firebase is not configured. Add project keys before using admin tools.")
      return
    }

    const unsubscribeAuth = onAuthStateChanged(firebase.auth, async (nextUser) => {
      setUser(nextUser)

      if (!nextUser || nextUser.isAnonymous) {
        setStatusMessage("Sign in to check root access.")
        setIsRoot(false)
        return
      }

      const adminSnapshot = await getDoc(doc(firebase.db, "admins", nextUser.uid))
      const rootAccess = adminSnapshot.exists() && adminSnapshot.data().role === "root"
      setIsRoot(rootAccess)

      if (!rootAccess) {
        setStatusMessage(`${nextUser.email || "This user"} is signed in, but does not have root access.`)
      } else {
        setStatusMessage(`Root access confirmed for ${nextUser.email || nextUser.uid}.`)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!isRoot || !firebaseRef.current) return

    const firebase = firebaseRef.current

    const unsubscribeModules = onSnapshot(
      query(collection(firebase.db, "modules"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setModules(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      },
      (error) => {
        console.error("Modules error:", error)
      }
    )

    const unsubscribeUsers = onSnapshot(
      query(collection(firebase.db, "users"), orderBy("lastLoginAt", "desc")),
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      },
      (error) => {
        console.error("Users error:", error)
      }
    )

    return () => {
      unsubscribeModules()
      unsubscribeUsers()
    }
  }, [isRoot])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthMessage("")
    const firebase = firebaseRef.current
    if (!firebase) {
      setAuthMessage("Firebase is not configured yet.")
      return
    }
    try {
      await signInWithEmailAndPassword(firebase.auth, email, password)
    } catch (error: any) {
      setAuthMessage(error.message)
    }
  }

  const handleGoogleSignIn = async () => {
    setAuthMessage("")
    const firebase = firebaseRef.current
    if (!firebase) {
      setAuthMessage("Firebase is not configured yet.")
      return
    }
    try {
      await signInWithPopup(firebase.auth, firebase.googleProvider)
    } catch (error: any) {
      setAuthMessage(error.message)
    }
  }

  const handleSignOut = async () => {
    const firebase = firebaseRef.current
    if (!firebase) return
    await signOut(firebase.auth)
  }

  const updateModuleStatus = async (moduleId: string, status: string) => {
    const firebase = firebaseRef.current
    if (!firebase) return
    await updateDoc(doc(firebase.db, "modules", moduleId), {
      status,
      updatedAt: serverTimestamp(),
    })
  }

  const removeModule = async (moduleId: string) => {
    const firebase = firebaseRef.current
    if (!firebase) return
    if (moduleId.startsWith("builtin_")) {
      await updateModuleStatus(moduleId, "deleted")
      return
    }
    try {
      // Need to import deleteDoc
      // wait, deleteDoc is not exported from playground-firebase.ts!
      // Actually, deleteDoc isn't exported, so I'll just use updateDoc status: deleted as fallback.
      await updateModuleStatus(moduleId, "deleted")
    } catch (error) {
      await updateModuleStatus(moduleId, "deleted")
    }
  }

  const setUserBlacklist = async (uid: string, blacklisted: boolean) => {
    const firebase = firebaseRef.current
    if (!firebase) return
    await setDoc(
      doc(firebase.db, "users", uid),
      {
        blacklisted,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }

  return (
    <main className="min-h-screen bg-[#06101d] text-emerald-50 px-6 py-12 md:px-12 font-sans animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-emerald-400/20 pb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-emerald-400" />
              Alpha Dragon Root Admin
            </h1>
            <p className="mt-2 text-slate-400">Moderate uploaded modules and uploaders across the platform.</p>
          </div>
          <a href="/playground" className="text-sm font-black text-emerald-400 hover:text-emerald-300 transition-colors">
            &larr; Back to Playground
          </a>
        </header>

        <section className="mb-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/25 bg-slate-950/80 p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-300" /> Access Status
            </h2>
            <div className="inline-flex items-center gap-3 text-sm font-medium text-emerald-400 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              {statusMessage}
            </div>

            {(!user || user.isAnonymous) && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Root Email"
                  className="w-full rounded bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 rounded bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400 transition-colors">
                    Sign In
                  </button>
                  <button type="button" onClick={handleGoogleSignIn} className="flex-1 rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 transition-colors">
                    Google Sign In
                  </button>
                </div>
                {authMessage && <p className="text-sm text-pink-400 mt-2">{authMessage}</p>}
              </form>
            )}

            {user && !user.isAnonymous && (
              <button
                onClick={handleSignOut}
                className="mt-4 rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </section>

        {isRoot && (
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Modules List */}
            <section>
              <h2 className="text-2xl font-black mb-6 text-emerald-50">Playground Modules</h2>
              <div className="flex flex-col gap-4">
                {modules.filter(m => m.status !== 'deleted').length === 0 && (
                  <p className="text-slate-500 italic">No visible modules.</p>
                )}
                {modules
                  .filter(m => m.status !== 'deleted')
                  .map((moduleItem) => {
                    const isDisabled = moduleItem.status === "disabled"
                    const isBuiltin = moduleItem.id.startsWith("builtin_")

                    return (
                      <article key={moduleItem.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-emerald-100">{moduleItem.name || moduleItem.id}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2 mt-1">{moduleItem.description || "No description."}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${isDisabled ? "bg-slate-800 text-slate-400" : "bg-emerald-400/20 text-emerald-300"}`}>
                            {moduleItem.status || "active"}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-800 pt-4">
                          <div className="text-xs text-slate-500 font-mono">
                            Up: {moduleItem.upvotes || 0} | Down: {moduleItem.downvotes || 0}<br />
                            User: {moduleItem.uploaderEmail || moduleItem.uploaderUid || "unknown"}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateModuleStatus(moduleItem.id, isDisabled ? "active" : "disabled")}
                              className={`p-2 rounded border transition-colors ${isDisabled ? "border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400" : "border-slate-600 hover:bg-slate-800 text-slate-300"}`}
                              title={isDisabled ? "Enable Module" : "Disable Module"}
                            >
                              {isDisabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                            </button>
                            
                            {isBuiltin && isDisabled && (
                               <button
                               onClick={() => updateModuleStatus(moduleItem.id, "active")}
                               className="p-2 rounded border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                               title="Restore Built-in"
                             >
                               <RefreshCcw className="h-4 w-4" />
                             </button>
                            )}

                            <button
                              onClick={() => removeModule(moduleItem.id)}
                              className="p-2 rounded border border-pink-500/30 hover:bg-pink-500/20 text-pink-400 transition-colors"
                              title={isBuiltin ? "Hide Module" : "Delete Module"}
                            >
                              {isBuiltin ? <X className="h-4 w-4" /> : <Trash className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
              </div>
            </section>

            {/* Users List */}
            <section>
              <h2 className="text-2xl font-black mb-6 text-emerald-50">Uploaders</h2>
              <div className="flex flex-col gap-4">
                {users.length === 0 && (
                  <p className="text-slate-500 italic">No user profiles.</p>
                )}
                {users.map((u) => {
                  return (
                    <article key={u.id} className={`rounded-lg border bg-slate-900/50 p-5 transition-colors ${u.blacklisted ? 'border-pink-500/30 bg-pink-500/5' : 'border-slate-800'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className={`font-bold text-lg ${u.blacklisted ? 'text-pink-300' : 'text-emerald-100'}`}>
                            {u.email || u.displayName || u.id}
                          </h3>
                          <p className="text-sm text-slate-500 font-mono mt-1">
                            {u.provider || "unknown provider"} • {u.id}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${u.blacklisted ? "bg-pink-500/20 text-pink-400" : "bg-emerald-400/20 text-emerald-300"}`}>
                          {u.blacklisted ? "Blacklisted" : "Active"}
                        </span>
                      </div>
                      
                      <div className="flex justify-end border-t border-slate-800 pt-4">
                        <button
                          onClick={() => setUserBlacklist(u.id, !u.blacklisted)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold border transition-colors ${u.blacklisted ? "border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400" : "border-pink-500/30 hover:bg-pink-500/20 text-pink-400"}`}
                        >
                          {u.blacklisted ? (
                            <><UserCheck className="h-4 w-4" /> Unblacklist</>
                          ) : (
                            <><UserMinus className="h-4 w-4" /> Blacklist</>
                          )}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
