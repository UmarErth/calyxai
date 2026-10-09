import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowUp, BrainCircuit, Check, ChevronDown, Chrome, Code2, Command, Cpu, Github, KeyRound, Menu, PanelLeftClose, Paperclip, Search, ShieldCheck, Sparkles, SquarePen, X, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Message, Plan, Thread } from './types'

const uid = () => crypto.randomUUID()
const seedThreads: Thread[] = [
  { id: 'welcome', title: 'Welcome to Calyx', messages: [
    { id: uid(), role: 'assistant', content: "Good afternoon. I’m Calyx — a calm, open-source workspace powered by Gemini. Ask me to reason through a problem, draft something precise, or help you build.", createdAt: new Date().toISOString() },
  ]},
]

const suggestions = [
  ['Think it through', 'Compare three approaches to a difficult decision', BrainCircuit],
  ['Build something', 'Create a clean implementation plan for my idea', Code2],
  ['Make it clearer', 'Turn rough notes into a polished explanation', Sparkles],
]

const plans: { name: string; id: Plan; price: string; note: string; features: string[] }[] = [
  { name: 'Free', id: 'free', price: '$0', note: 'For thoughtful everyday use', features: ['50 messages each day', 'Gemini chat', 'Encrypted bring-your-own key', 'Community support'] },
  { name: 'Starter', id: 'starter', price: '$5', note: 'For longer projects', features: ['500 messages each day', 'Longer conversation history', 'Priority responses', 'Export conversations'] },
  { name: 'Work', id: 'work', price: '$10', note: 'For doing, not just asking', features: ['Everything in Starter', 'Work canvas and task runs', 'Chrome extension', 'Permission-based browser actions'] },
  { name: 'Unlimited', id: 'unlimited', price: '$20', note: 'For your whole working day', features: ['Unlimited messages', 'Every Work feature', 'Advanced Gemini modes', 'Highest response priority'] },
]

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    const cached = localStorage.getItem('calyx-threads')
    if (cached) try { return JSON.parse(cached) } catch { /* ignore corrupt local state */ }
    return seedThreads
  })
  const [activeId, setActiveId] = useState('welcome')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [view, setView] = useState<'chat' | 'pricing' | 'settings' | 'work'>('chat')
  const [modal, setModal] = useState<'auth' | 'key' | null>(null)
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [toast, setToast] = useState('')
  const active = useMemo(() => threads.find(t => t.id === activeId) ?? threads[0], [threads, activeId])

  useEffect(() => localStorage.setItem('calyx-threads', JSON.stringify(threads)), [threads])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer) }, [toast])

  const newThread = () => {
    const thread = { id: uid(), title: 'New conversation', messages: [] }
    setThreads(current => [thread, ...current])
    setActiveId(thread.id); setView('chat')
  }

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault()
    const text = (preset ?? input).trim()
    if (!text || busy) return
    setInput(''); setBusy(true); setView('chat')
    const userMessage: Message = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() }
    setThreads(current => current.map(t => t.id === activeId ? { ...t, title: t.messages.length ? t.title : text.slice(0, 38), messages: [...t.messages, userMessage] } : t))
    try {
      if (!supabase) throw new Error('demo')
      const { data, error } = await supabase.functions.invoke('gemini-chat', { body: { messages: [...active.messages, userMessage].map(({ role, content }) => ({ role, content })) } })
      if (error) throw error
      const reply: Message = { id: uid(), role: 'assistant', content: data.text, createdAt: new Date().toISOString() }
      setThreads(current => current.map(t => t.id === activeId ? { ...t, messages: [...t.messages, reply] } : t))
    } catch {
      const demo: Message = { id: uid(), role: 'assistant', content: isSupabaseConfigured
        ? 'I couldn’t reach the model just now. Check the Edge Function and your encrypted Gemini key, then try again.'
        : '**The interface is ready.** Connect Supabase and add your Gemini key in Settings to receive live answers. Your key is sent only to the server-side encryption function; it is never saved in this browser.', createdAt: new Date().toISOString() }
      setThreads(current => current.map(t => t.id === activeId ? { ...t, messages: [...t.messages, demo] } : t))
    } finally { setBusy(false) }
  }

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return setToast('Add Supabase environment values to enable sign-in.')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
    setToast(error ? error.message : 'Check your email for a secure sign-in link.'); if (!error) setModal(null)
  }

  const saveKey = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return setToast('Connect Supabase before saving a key.')
    const { error } = await supabase.functions.invoke('save-gemini-key', { body: { apiKey } })
    setToast(error ? error.message : 'Gemini key encrypted and saved.'); if (!error) { setApiKey(''); setModal(null) }
  }

  return <div className="app-shell">
    <aside className={sidebar ? 'sidebar' : 'sidebar collapsed'}>
      <div className="brand-row"><button className="brand" onClick={() => setView('chat')}><span className="brand-mark">C</span><span>Calyx</span></button><button className="icon-button desktop" aria-label="Hide sidebar" onClick={() => setSidebar(false)}><PanelLeftClose size={18}/></button></div>
      <button className="new-chat" onClick={newThread}><SquarePen size={17}/> New conversation <kbd>⌘ K</kbd></button>
      <nav className="history"><p className="eyebrow">Recents</p>{threads.map(thread => <button key={thread.id} className={thread.id === activeId ? 'thread active' : 'thread'} onClick={() => { setActiveId(thread.id); setView('chat') }}><span>{thread.title}</span></button>)}</nav>
      <div className="side-bottom">
        <button onClick={() => setView('work')}><Command size={17}/> Work <span className="plan-pill">PRO</span></button>
        <button onClick={() => setView('pricing')}><Zap size={17}/> Plans</button>
        <button onClick={() => setView('settings')}><KeyRound size={17}/> Settings</button>
        <a href="https://github.com/UmarErth/calyxai" target="_blank" rel="noreferrer"><Github size={17}/> Open source</a>
      </div>
    </aside>

    <main className="main">
      <header><div>{!sidebar && <button className="icon-button" aria-label="Open sidebar" onClick={() => setSidebar(true)}><Menu size={19}/></button>}</div><div className="model"><span className="status-dot"/> Gemini 3.8 Flash <ChevronDown size={14}/></div><button className="sign-in" onClick={() => setModal('auth')}>Sign in</button></header>
      {view === 'chat' && <Chat active={active} busy={busy} input={input} setInput={setInput} send={send}/>} 
      {view === 'pricing' && <Pricing onChoose={async (plan) => {
        if (plan === 'free') return setModal('auth')
        if (!supabase) return setToast('Connect Supabase and Stripe to activate checkout.')
        const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan, returnUrl: `${location.origin}/` } })
        if (error || !data?.url) return setToast(error?.message ?? 'Checkout is unavailable.')
        location.assign(data.url)
      }} />}
      {view === 'settings' && <Settings onKey={() => setModal('key')} />}
      {view === 'work' && <Work />}
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>{modal === 'auth' ? <form onSubmit={signIn}><span className="brand-mark large">C</span><h2>Welcome to Calyx</h2><p>Sign in with a secure email link. No password to remember.</p><label>Email address<input required type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}/></label><button className="primary" type="submit">Send sign-in link</button></form> : <form onSubmit={saveKey}><ShieldCheck size={30}/><h2>Connect Gemini</h2><p>Your key is encrypted server-side with AES-GCM before storage. Calyx never returns it to the browser.</p><label>Gemini API key<input required type="password" autoComplete="off" placeholder="AIza…" value={apiKey} onChange={e => setApiKey(e.target.value)}/></label><button className="primary" type="submit">Encrypt and save key</button><small>Get a key from Google AI Studio. Never commit it to this repository.</small></form>}</div></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Chat({ active, busy, input, setInput, send }: { active: Thread; busy: boolean; input: string; setInput: (v: string) => void; send: (e?: FormEvent, preset?: string) => void }) {
  const empty = active.messages.length === 0
  return <section className={empty ? 'chat empty' : 'chat'}>
    <div className="messages">{empty ? <div className="empty-state"><div className="flower">✣</div><h1>What shall we think through?</h1><p>Bring a question, a half-formed idea, or something you want to make.</p><div className="suggestions">{suggestions.map(([title, prompt, Icon]) => <button key={title as string} onClick={() => send(undefined, prompt as string)}><Icon size={19}/><span><strong>{title as string}</strong><small>{prompt as string}</small></span></button>)}</div></div> : active.messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className="avatar">{message.role === 'assistant' ? 'C' : 'You'}</div><div className="message-body"><ReactMarkdown>{message.content}</ReactMarkdown></div></article>)}{busy && <article className="message assistant"><div className="avatar">C</div><div className="thinking"><i/><i/><i/></div></article>}</div>
    <form className="composer" onSubmit={send}><textarea aria-label="Message Calyx" placeholder="Message Calyx…" rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}/><div className="composer-row"><div><button type="button" className="composer-tool" aria-label="Attach"><Paperclip size={18}/></button><button type="button" className="mode-button"><Sparkles size={16}/> Deep think</button></div><button className="send" disabled={!input.trim() || busy} aria-label="Send"><ArrowUp size={19}/></button></div></form>
    <p className="disclaimer">Calyx can make mistakes. Check important information.</p>
  </section>
}

function Pricing({ onChoose }: { onChoose: (p: Plan) => void }) { return <section className="page pricing"><p className="eyebrow accent">Simple, honest pricing</p><h1>Choose the space you need.</h1><p className="lede">Start quietly. Upgrade when your work asks for more.</p><div className="plans">{plans.map(plan => <article className={plan.id === 'starter' ? 'plan featured' : 'plan'} key={plan.id}>{plan.id === 'starter' && <span className="popular">MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.note}</p><div className="price">{plan.price}<small>/ month</small></div><button onClick={() => onChoose(plan.id)}>{plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`}</button><ul>{plan.features.map(f => <li key={f}><Check size={17}/>{f}</li>)}</ul></article>)}</div><p className="billing-note">Plans renew monthly and can be cancelled at any time. Unlimited is subject to reasonable abuse prevention and upstream provider availability.</p></section> }
function Settings({ onKey }: { onKey: () => void }) { return <section className="page narrow"><p className="eyebrow accent">Settings</p><h1>Your Calyx, your key.</h1><div className="setting-card"><div className="setting-icon"><KeyRound/></div><div><h2>Gemini API key</h2><p>Use your own Google Gemini key. It is encrypted before being stored and is only decrypted inside the chat function.</p></div><button onClick={onKey}>Add key</button></div><div className="security-note"><ShieldCheck/><div><strong>Designed for privacy</strong><p>Conversation rows are protected by row-level security. Secret keys never appear in client logs or API responses.</p></div></div></section> }
function Work() { return <section className="page work"><div className="work-copy"><p className="eyebrow accent">Calyx Work</p><h1>Turn a conversation into action.</h1><p className="lede">A focused task canvas and open-source Chrome extension for browser work you approve step by step.</p><div className="work-list"><div><Search/><span><strong>Research with context</strong><small>Collect and organize useful pages from the active tab.</small></span></div><div><Chrome/><span><strong>Browser actions, with consent</strong><small>Preview every proposed action before it runs.</small></span></div><div><Cpu/><span><strong>Local-first control bridge</strong><small>No silent background control and no broad host permissions.</small></span></div></div><a className="primary inline" href="https://github.com/UmarErth/calyxai/tree/main/extension" target="_blank" rel="noreferrer"><Github size={17}/> View extension source</a></div><div className="task-card"><div className="task-top"><span>Task preview</span><span className="live"><i/> Ready</span></div><h3>Compare project management tools</h3><div className="task-step done"><Check/> Read the current page</div><div className="task-step current"><Sparkles/> Extract requirements</div><div className="task-step"><Chrome/> Open approved comparison tabs</div><button>Review next action</button></div></section> }

export default App
