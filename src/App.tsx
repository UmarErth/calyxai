import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource-variable/source-serif-4'
import { ArrowRight, ArrowUp, BrainCircuit, Check, ChevronDown, Chrome, Code2, Cpu, Github, LogOut, Moon, Palette, Search, Settings2, Sparkles, SquarePen, Sun, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Message, ModelId, Plan, Thread } from './types'

const uid = () => crypto.randomUUID()
const FRIENDLY_ERROR = "Oops, that's an error from our side."
const seedThreads: Thread[] = [
  { id: 'welcome', title: 'Welcome to Calyx', messages: [
    { id: uid(), role: 'assistant', content: "Good afternoon. I’m Calyx — a calm, open-source thinking workspace. Ask me to reason through a problem, draft something precise, or help you build.", createdAt: new Date().toISOString() },
  ]},
]

const suggestions = [
  ['Think it through', 'Compare three approaches to a difficult decision', BrainCircuit],
  ['Build something', 'Create a clean implementation plan for my idea', Code2],
  ['Make it clearer', 'Turn rough notes into a polished explanation', Sparkles],
]

const plans: { name: string; id: Plan; price: string; note: string; features: string[] }[] = [
  { name: 'Free', id: 'free', price: '$0', note: 'For thoughtful everyday use', features: ['50 messages each day', 'Calyx Core intelligence', 'Encrypted bring-your-own key', 'Community support'] },
  { name: 'Starter', id: 'starter', price: '$5', note: 'For longer projects', features: ['500 messages each day', 'Calyx Focus reasoning', 'Stronger planning prompt', 'Export conversations'] },
  { name: 'Work', id: 'work', price: '$10', note: 'For doing, not just asking', features: ['5,000 messages each day', 'Calyx Work advanced reasoning', 'Execution-grade system prompt', 'Chrome extension', 'Permission-based browser actions'] },
  { name: 'Unlimited', id: 'unlimited', price: '$20', note: 'For your whole working day', features: ['Unlimited messages', 'Calyx Max intelligence', 'Deepest reasoning profile', 'Every Work feature'] },
]

const models: { id: ModelId; name: string; description: string; plan: Plan }[] = [
  { id: 'core', name: 'Calyx Core', description: 'Fast, capable everyday intelligence', plan: 'free' },
  { id: 'focus', name: 'Calyx Focus', description: 'Deeper planning and longer projects', plan: 'starter' },
  { id: 'work', name: 'Calyx Work', description: 'Advanced reasoning for tools and execution', plan: 'work' },
  { id: 'max', name: 'Calyx Max', description: 'Our highest reasoning profile', plan: 'unlimited' },
]
const planRank: Record<Plan, number> = { free: 0, starter: 1, work: 2, unlimited: 3 }

function Logo({ wordmark = true }: { wordmark?: boolean }) {
  return <span className="logo-lockup"><svg className="calyx-logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4c0 9-6 13-15 13 7 4 10 10 7 20 6-5 12-5 16 3 0-9 4-14 12-17-9-2-13-8-12-17-2 7-4 12-8 16C20 15 20 10 24 4Z"/><circle cx="24" cy="24" r="4"/></svg>{wordmark && <span>Calyx</span>}</span>
}

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    const cached = localStorage.getItem('calyx-threads')
    if (cached) try { return JSON.parse(cached) } catch { /* ignore corrupt local state */ }
    return seedThreads
  })
  const [activeId, setActiveId] = useState('welcome')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'landing' | 'chat' | 'pricing' | 'work' | 'privacy' | 'terms'>(() => location.hash === '#chat' ? 'chat' : location.hash === '#pricing' ? 'pricing' : location.hash === '#work' ? 'work' : location.hash === '#privacy' ? 'privacy' : location.hash === '#terms' ? 'terms' : 'landing')
  const [modal, setModal] = useState<'auth' | 'account' | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [model, setModel] = useState<ModelId>(() => (localStorage.getItem('calyx-model') as ModelId) || 'core')
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => localStorage.getItem('calyx-density') === 'compact' ? 'compact' : 'comfortable')
  const [motion, setMotion] = useState(() => localStorage.getItem('calyx-motion') !== 'reduced')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [toast, setToast] = useState('')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('calyx-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const active = useMemo(() => threads.find(t => t.id === activeId) ?? threads[0], [threads, activeId])

  const currentPlan = ((user?.app_metadata?.plan as Plan) || 'free')
  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'

  const navigate = (next: 'landing' | 'chat' | 'pricing' | 'work' | 'privacy' | 'terms') => {
    setView(next)
    history.replaceState(null, '', next === 'landing' ? location.pathname : `#${next}`)
  }

  useEffect(() => localStorage.setItem('calyx-threads', JSON.stringify(threads)), [threads])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('calyx-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { localStorage.setItem('calyx-model', model) }, [model])
  useEffect(() => { localStorage.setItem('calyx-density', density); document.documentElement.dataset.density = density }, [density])
  useEffect(() => { localStorage.setItem('calyx-motion', motion ? 'full' : 'reduced'); document.documentElement.dataset.motion = motion ? 'full' : 'reduced' }, [motion])

  const newThread = () => {
    const thread = { id: uid(), title: 'New conversation', messages: [] }
    setThreads(current => [thread, ...current])
    setActiveId(thread.id); navigate('chat')
  }

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault()
    const text = (preset ?? input).trim()
    if (!text || busy) return
    setInput(''); setBusy(true); navigate('chat')
    const userMessage: Message = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() }
    setThreads(current => current.map(t => t.id === activeId ? { ...t, title: t.messages.length ? t.title : text.slice(0, 38), messages: [...t.messages, userMessage] } : t))
    try {
      if (!supabase) throw new Error('demo')
      const { data, error } = await supabase.functions.invoke('gemini-chat', { body: { model, messages: [...active.messages, userMessage].map(({ role, content }) => ({ role, content })) } })
      if (error) {
        let message = FRIENDLY_ERROR
        if ('context' in error && error.context instanceof Response) {
          const payload = await error.context.clone().json().catch(() => null)
          if (payload?.error?.includes('10 free messages')) message = payload.error
        }
        throw new Error(message)
      }
      const reply: Message = { id: uid(), role: 'assistant', content: data.text, createdAt: new Date().toISOString() }
      setThreads(current => current.map(t => t.id === activeId ? { ...t, messages: [...t.messages, reply] } : t))
    } catch (error) {
      const content = error instanceof Error && error.message.includes('10 free messages') ? error.message : FRIENDLY_ERROR
      const demo: Message = { id: uid(), role: 'assistant', content, createdAt: new Date().toISOString() }
      setThreads(current => current.map(t => t.id === activeId ? { ...t, messages: [...t.messages, demo] } : t))
    } finally { setBusy(false) }
  }

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return setToast(FRIENDLY_ERROR)
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin } })
      : await supabase.auth.signInWithPassword({ email, password })
    setToast(result.error ? FRIENDLY_ERROR : authMode === 'signup' ? 'Account created. Check your email if confirmation is required.' : 'Welcome back.')
    if (!result.error) { setModal(null); setPassword('') }
  }

  const socialSignIn = async (provider: 'google' | 'github') => {
    if (!supabase) return setToast(FRIENDLY_ERROR)
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin } })
    if (error) setToast(FRIENDLY_ERROR)
  }

  const resetPassword = async () => {
    if (!supabase || !email) return setToast(email ? FRIENDLY_ERROR : 'Enter your email first.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    setToast(error ? FRIENDLY_ERROR : 'Password reset instructions sent.')
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setModal(null)
    setToast('Signed out.')
  }

  const chooseModel = (next: ModelId) => {
    const choice = models.find(item => item.id === next)!
    if (planRank[currentPlan] < planRank[choice.plan]) { setToast(`${choice.name} is included with the ${choice.plan} plan.`); navigate('pricing'); return }
    setModel(next)
  }

  return <div className="app-shell" data-view={view}>
    {view === 'landing' ? <Landing dark={dark} setDark={setDark} user={user} displayName={displayName} openChat={() => navigate('chat')} openPricing={() => navigate('pricing')} openAuth={() => setModal(user ? 'account' : 'auth')} openLegal={navigate}/> : <main className="product-shell">
      <header className="product-nav"><button className="logo-button" onClick={() => navigate('landing')}><Logo/></button><nav><button className={view === 'chat' ? 'active' : ''} onClick={() => navigate('chat')}>Chat</button><button className={view === 'work' ? 'active' : ''} onClick={() => navigate('work')}>Work</button><button className={view === 'pricing' ? 'active' : ''} onClick={() => navigate('pricing')}>Plans</button></nav><div className="header-actions"><a className="github-link" href="https://github.com/UmarErth/calyxai" target="_blank" rel="noreferrer"><Github size={16}/></a><button className="icon-button theme-toggle" aria-label={dark ? 'Use light mode' : 'Use dark mode'} onClick={() => setDark(value => !value)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>{user ? <button className="user-chip" onClick={() => setModal('account')}><span>{displayName.slice(0,1).toUpperCase()}</span>{displayName}</button> : <button className="sign-in" onClick={() => setModal('auth')}>Sign in</button>}</div></header>
      {view === 'chat' && <Chat active={active} threads={threads} activeId={activeId} setActiveId={setActiveId} newThread={newThread} busy={busy} input={input} setInput={setInput} send={send} model={model} currentPlan={currentPlan} chooseModel={chooseModel}/>}
      {view === 'pricing' && <Pricing onChoose={async (plan) => {
        if (plan === 'free') return setModal('auth')
        if (!supabase) return setToast(FRIENDLY_ERROR)
        const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan, returnUrl: `${location.origin}/` } })
        if (error || !data?.url) return setToast(FRIENDLY_ERROR)
        location.assign(data.url)
      }} />}
      {view === 'work' && <Work />}
      {view === 'privacy' && <LegalPage kind="privacy" />}
      {view === 'terms' && <LegalPage kind="terms" />}
    </main>}

    {modal === 'auth' && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal auth-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button><form onSubmit={signIn}><span className="brand-mark large">C</span><h2>{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h2><p>{authMode === 'signin' ? 'Continue your work with Calyx.' : 'Choose a username and secure password.'}</p><div className="sso-row"><button type="button" className="sso-button" onClick={() => socialSignIn('google')}><span>G</span> Continue with Google</button><button type="button" className="sso-button" onClick={() => socialSignIn('github')}><Github size={17}/> Continue with GitHub</button></div><div className="auth-divider"><span>or</span></div>{authMode === 'signup' && <label>Username<input required minLength={3} maxLength={32} autoComplete="username" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)}/></label>}<label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}/></label><label>Password<input required type="password" minLength={8} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)}/></label>{authMode === 'signin' && <button type="button" className="text-button forgot" onClick={resetPassword}>Forgot password?</button>}<button className="primary" type="submit">{authMode === 'signin' ? 'Sign in' : 'Create account'}</button><button type="button" className="text-button auth-switch" onClick={() => setAuthMode(mode => mode === 'signin' ? 'signup' : 'signin')}>{authMode === 'signin' ? 'New to Calyx? Create an account' : 'Already have an account? Sign in'}</button></form></div></div>}
    {modal === 'account' && user && <AccountModal user={user} displayName={displayName} plan={currentPlan} model={model} chooseModel={chooseModel} dark={dark} setDark={setDark} density={density} setDensity={setDensity} motion={motion} setMotion={setMotion} close={() => setModal(null)} signOut={signOut} openPricing={() => { setModal(null); navigate('pricing') }} />}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Landing({ dark, setDark, user, displayName, openChat, openPricing, openAuth, openLegal }: { dark: boolean; setDark: (v: boolean) => void; user: User | null; displayName: string; openChat: () => void; openPricing: () => void; openAuth: () => void; openLegal: (v: 'privacy' | 'terms') => void }) {
  return <main className="landing"><header className="landing-nav"><Logo/><nav><button onClick={openChat}>Product</button><button onClick={openPricing}>Pricing</button><a href="https://github.com/UmarErth/calyxai" target="_blank" rel="noreferrer">Open source</a></nav><div><button className="icon-button" aria-label={dark ? 'Use light mode' : 'Use dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button><button className={user ? 'user-chip' : 'nav-account'} onClick={openAuth}>{user && <span>{displayName.slice(0,1).toUpperCase()}</span>}{user ? displayName : 'Sign in'}</button><button className="nav-cta" onClick={openChat}>Open Calyx <ArrowRight size={15}/></button></div></header><section className="landing-hero"><div className="hero-statement"><p className="section-label">CALYX INTELLIGENCE / PUBLIC RELEASE</p><h1>A clearer place<br/>to do difficult work.</h1><p className="hero-lede">Calyx is an independent AI workspace for research, decisions, writing, and execution—designed to keep the work visible and the interface out of your way.</p><div className="hero-actions"><button onClick={openChat}>Start a conversation <ArrowRight size={17}/></button><button onClick={openPricing}>View plans</button></div></div><div className="brand-orbit" aria-label="Calyx brand symbol"><Logo wordmark={false}/><span>REASON</span><span>BUILD</span><span>REFINE</span></div></section><section className="proof-strip"><span>OPEN SOURCE</span><span>SELF-HOSTED TYPOGRAPHY</span><span>USER-CONTROLLED WORKFLOWS</span><span>DARK MODE INCLUDED</span></section><section className="company-grid"><div><p className="section-label">BUILT FOR REAL OUTPUT</p><h2>Not another empty chat window.</h2></div><div className="capability"><span>01</span><h3>Think in systems</h3><p>Break large questions into decisions, assumptions, evidence, and next actions.</p></div><div className="capability"><span>02</span><h3>Keep work legible</h3><p>Conversations, task context, and approved actions stay visibly separated.</p></div><div className="capability"><span>03</span><h3>Move with control</h3><p>Use Work features and the open-source extension without silent browser access.</p></div></section><section className="landing-closing"><Logo wordmark={false}/><h2>Make room for better thinking.</h2><button onClick={openChat}>Enter the workspace <ArrowRight size={17}/></button></section><footer><Logo/><span>Open source software by Calyx.</span><div className="footer-links"><button onClick={() => openLegal('privacy')}>Privacy</button><button onClick={() => openLegal('terms')}>Terms</button><a href="https://github.com/UmarErth/calyxai" target="_blank" rel="noreferrer">GitHub</a></div></footer></main>
}

function Chat({ active, threads, activeId, setActiveId, newThread, busy, input, setInput, send, model, currentPlan, chooseModel }: { active: Thread; threads: Thread[]; activeId: string; setActiveId: (v: string) => void; newThread: () => void; busy: boolean; input: string; setInput: (v: string) => void; send: (e?: FormEvent, preset?: string) => void; model: ModelId; currentPlan: Plan; chooseModel: (v: ModelId) => void }) {
  const empty = active.messages.length === 0
  const messagesRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const transcript = messagesRef.current
    if (!transcript) return
    requestAnimationFrame(() => transcript.scrollTo({ top: transcript.scrollHeight, behavior: active.messages.length > 1 ? 'smooth' : 'auto' }))
  }, [activeId, active.messages.length, busy])
  return <section className={empty ? 'chat cockpit empty' : 'chat cockpit'}><aside className="conversation-rail"><div><p>Conversations</p><button onClick={newThread} aria-label="New conversation"><SquarePen size={16}/></button></div>{threads.map((thread, index) => <button key={thread.id} className={thread.id === activeId ? 'active' : ''} onClick={() => setActiveId(thread.id)}><span>{String(index + 1).padStart(2,'0')}</span><strong>{thread.title}</strong></button>)}</aside><section className="dialogue-stage"><div className="stage-header"><div><span>ACTIVE DIALOGUE</span><strong>{active.title}</strong></div><div className="stage-controls"><ModelSelector value={model} plan={currentPlan} onChange={chooseModel}/><span className="stage-status"><i/> Private</span></div></div>
    <div className="messages" ref={messagesRef}>{empty ? <div className="empty-state"><Logo wordmark={false}/><p className="hero-kicker">NEW DIALOGUE</p><h1>What are we<br/>working on?</h1><p>Bring the rough version. Calyx will help shape the structure, challenge assumptions, and move toward something useful.</p><div className="suggestions">{suggestions.map(([title, prompt, Icon]) => <button key={title as string} onClick={() => send(undefined, prompt as string)}><Icon size={18}/><span><strong>{title as string}</strong><small>{prompt as string}</small></span><ArrowRight size={16}/></button>)}</div></div> : active.messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className="avatar">{message.role === 'assistant' ? <Logo wordmark={false}/> : 'YOU'}</div><div className="message-body"><ReactMarkdown>{message.content}</ReactMarkdown></div></article>)}{busy && <article className="message assistant"><div className="avatar"><Logo wordmark={false}/></div><div className="thinking"><i/><i/><i/></div></article>}</div>
    <form className="composer" onSubmit={send}><textarea aria-label="Message Calyx" placeholder="Message Calyx…" rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}/><button className="send" disabled={!input.trim() || busy} aria-label="Send"><ArrowUp size={19}/></button></form>
    <p className="disclaimer">Calyx can make mistakes. Check important information.</p>
  </section><aside className="context-rail"><p>Session context</p><dl><div><dt>Model</dt><dd>{models.find(item => item.id === model)?.name.replace('Calyx ', '')}</dd></div><div><dt>Plan</dt><dd>{currentPlan}</dd></div><div><dt>Memory</dt><dd>Local</dd></div><div><dt>Sources</dt><dd>None</dd></div></dl><div className="context-note"><Logo wordmark={false}/><p>Your workspace separates dialogue, context, and actions so you always know what Calyx can see.</p></div></aside></section>
}

function ModelSelector({ value, plan, onChange }: { value: ModelId; plan: Plan; onChange: (v: ModelId) => void }) {
  return <label className="model-select"><span className="sr-only">Choose model</span><select value={value} onChange={e => onChange(e.target.value as ModelId)}>{models.map(item => <option key={item.id} value={item.id}>{item.name}{planRank[plan] < planRank[item.plan] ? ` — ${item.plan} plan` : ''}</option>)}</select><ChevronDown size={13}/></label>
}

function AccountModal({ user, displayName, plan, model, chooseModel, dark, setDark, density, setDensity, motion, setMotion, close, signOut, openPricing }: { user: User; displayName: string; plan: Plan; model: ModelId; chooseModel: (v: ModelId) => void; dark: boolean; setDark: (v: boolean) => void; density: 'comfortable' | 'compact'; setDensity: (v: 'comfortable' | 'compact') => void; motion: boolean; setMotion: (v: boolean) => void; close: () => void; signOut: () => void; openPricing: () => void }) {
  const next = plan === 'free' ? 'Starter' : plan === 'starter' ? 'Work' : plan === 'work' ? 'Unlimited' : null
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal account-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={close}><X size={18}/></button><div className="account-heading"><span className="account-avatar">{displayName.slice(0,1).toUpperCase()}</span><div><p>Signed in as</p><h2>{displayName}</h2><small>{user.email}</small></div></div><div className="account-plan"><div><span>{plan.toUpperCase()} PLAN</span><strong>{plan === 'unlimited' ? 'Everything is unlocked' : `${plans.find(item => item.id === plan)?.features[0]}`}</strong></div>{next && <button onClick={openPricing}>See {next}</button>}</div><section className="settings-section"><h3><Settings2 size={15}/> Intelligence</h3><ModelSelector value={model} plan={plan} onChange={chooseModel}/><div className="model-catalog">{models.map(item => { const unlocked = planRank[plan] >= planRank[item.plan]; return <button key={item.id} className={item.id === model ? 'selected' : ''} onClick={() => chooseModel(item.id)}><span><strong>{item.name}</strong><small>{item.description}</small></span><em>{unlocked ? item.id === model ? 'Active' : 'Included' : `${item.plan}+`}</em></button> })}</div></section><section className="settings-section"><h3><Palette size={15}/> Appearance</h3><div className="setting-row"><span>Theme</span><div className="segmented"><button className={!dark ? 'active' : ''} onClick={() => setDark(false)}>Light</button><button className={dark ? 'active' : ''} onClick={() => setDark(true)}>Dark</button></div></div><div className="setting-row"><span>Density</span><div className="segmented"><button className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')}>Comfortable</button><button className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')}>Compact</button></div></div><label className="setting-row"><span>Interface motion</span><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)}/></label></section>{next && <section className="missing-out"><p>WHAT YOU'RE MISSING</p><h3>Move up to {next}</h3><ul>{plans.find(item => item.name === next)?.features.slice(1).map(feature => <li key={feature}><Check size={14}/>{feature}</li>)}</ul><button onClick={openPricing}>Compare all plans <ArrowRight size={14}/></button></section>}<button className="sign-out" onClick={signOut}><LogOut size={15}/> Sign out</button></div></div>
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy'
  return <article className="page legal"><p className="eyebrow accent">Calyx legal</p><h1>{privacy ? 'Privacy Policy' : 'Terms of Service'}</h1><p className="legal-date">Effective October 10, 2026</p>{privacy ? <><section><h2>The short version</h2><p>We collect only what is needed to operate Calyx, protect accounts, process subscriptions, and improve reliability. We do not sell personal information.</p></section><section><h2>Information we process</h2><p>Account details such as your email address, username, authentication provider, subscription status, and essential security records may be processed when you use Calyx. Conversation content is sent to our AI infrastructure only to provide the response you request.</p></section><section><h2>How information is used</h2><p>We use information to authenticate you, deliver the service, enforce message limits, prevent abuse, provide support, and maintain security. Service providers may process limited information on our behalf under their own security and privacy commitments.</p></section><section><h2>Your choices</h2><p>You may sign out, manage interface preferences locally, or request account access or deletion. Contact details for privacy requests will be published here when Calyx support email is finalized.</p></section><section><h2>Security and retention</h2><p>We use reasonable technical and organizational safeguards. No internet service can promise absolute security. Information is retained only as long as reasonably needed for service, legal, and security purposes.</p></section></> : <><section><h2>Using Calyx</h2><p>You must use Calyx lawfully and keep your account secure. You are responsible for reviewing outputs before relying on them, especially for important decisions.</p></section><section><h2>AI output</h2><p>AI responses can be incomplete or wrong and are not professional advice. Calyx does not guarantee accuracy, availability, or fitness for a particular purpose.</p></section><section><h2>Plans and billing</h2><p>Paid plans renew monthly until cancelled. Published message allowances and feature access apply to each plan. Unlimited use remains subject to reasonable abuse prevention and upstream availability.</p></section><section><h2>Acceptable use</h2><p>Do not use Calyx to break laws, harm others, interfere with the service, bypass access controls, or distribute malicious material. Access may be restricted to protect users and the service.</p></section><section><h2>Open-source components</h2><p>The Calyx frontend and browser extension are offered under the license included in their public repository. Hosted service access and third-party services remain subject to these terms.</p></section></>}<p className="legal-note">These terms are a practical public-release policy and should be reviewed by qualified counsel before commercial launch.</p></article>
}

function Pricing({ onChoose }: { onChoose: (p: Plan) => void }) { return <section className="page pricing"><p className="eyebrow accent">Simple, honest pricing</p><h1>Choose the space you need.</h1><p className="lede">Start quietly. Upgrade when your work asks for more.</p><div className="plans">{plans.map(plan => <article className={plan.id === 'starter' ? 'plan featured' : 'plan'} key={plan.id}>{plan.id === 'starter' && <span className="popular">MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.note}</p><div className="price">{plan.price}<small>/ month</small></div><button onClick={() => onChoose(plan.id)}>{plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`}</button><ul>{plan.features.map(f => <li key={f}><Check size={17}/>{f}</li>)}</ul></article>)}</div><p className="billing-note">Visitors without an account can send 10 messages per day. Plans renew monthly and can be cancelled at any time. Unlimited is subject to reasonable abuse prevention and upstream provider availability.</p></section> }
function Work() { return <section className="page work"><div className="work-copy"><p className="eyebrow accent">Calyx Work</p><h1>Turn a conversation into action.</h1><p className="lede">A focused task canvas and open-source Chrome extension for browser work you approve step by step.</p><div className="work-list"><div><Search/><span><strong>Research with context</strong><small>Collect and organize useful pages from the active tab.</small></span></div><div><Chrome/><span><strong>Browser actions, with consent</strong><small>Preview every proposed action before it runs.</small></span></div><div><Cpu/><span><strong>Local-first control bridge</strong><small>No silent background control and no broad host permissions.</small></span></div></div><a className="primary inline" href="https://github.com/UmarErth/calyxai/tree/main/extension" target="_blank" rel="noreferrer"><Github size={17}/> View extension source</a></div><div className="task-card"><div className="task-top"><span>Task preview</span><span className="live"><i/> Ready</span></div><h3>Compare project management tools</h3><div className="task-step done"><Check/> Read the current page</div><div className="task-step current"><Sparkles/> Extract requirements</div><div className="task-step"><Chrome/> Open approved comparison tabs</div><button>Review next action</button></div></section> }

export default App
