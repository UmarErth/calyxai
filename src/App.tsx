import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/source-serif-4";
import {
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  Blocks,
  Check,
  ChevronDown,
  Chrome,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Github,
  Image,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Palette,
  Paperclip,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  SquarePen,
  Sun,
  Terminal,
  Trash2,
  UserRound,
  WandSparkles,
  WifiOff,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  authRedirectUrl,
  closeNativeOAuth,
  isNativeApp,
  listenForNativeAuth,
  openNativeOAuth,
} from "./native";
import type {
  Attachment,
  AppIntegration,
  CalyxTheme,
  Message,
  ModelId,
  Plan,
  Thread,
} from "./types";
import type { NativeUpdateState } from "./native";

const uid = () => crypto.randomUUID();
const FRIENDLY_ERROR = "Oops, that's an error from our side.";
const seedThreads: Thread[] = [
  {
    id: "welcome",
    title: "Welcome to Calyx",
    messages: [
      {
        id: uid(),
        role: "assistant",
        content:
          "Good afternoon. I’m Calyx — a calm, open-source thinking workspace. Ask me to reason through a problem, draft something precise, or help you build.",
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

const suggestions = [
  [
    "Think it through",
    "Compare three approaches to a difficult decision",
    BrainCircuit,
  ],
  ["Build something", "Create a clean implementation plan for my idea", Code2],
  ["Make it clearer", "Turn rough notes into a polished explanation", Sparkles],
];

const plans: {
  name: string;
  id: Plan;
  price: string;
  note: string;
  features: string[];
}[] = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    note: "For thoughtful everyday use",
    features: [
      "50 messages each day",
      "Calyx Core intelligence",
      "Encrypted bring-your-own key",
      "Community support",
    ],
  },
  {
    name: "Starter",
    id: "starter",
    price: "$5",
    note: "For longer projects",
    features: [
      "500 messages each day",
      "Calyx Focus reasoning",
      "Stronger planning prompt",
      "Export conversations",
    ],
  },
  {
    name: "Work",
    id: "work",
    price: "$10",
    note: "For doing, not just asking",
    features: [
      "5,000 messages each day",
      "Calyx Work advanced reasoning",
      "Execution-grade system prompt",
      "Chrome extension",
      "Permission-based browser actions",
    ],
  },
  {
    name: "Unlimited",
    id: "unlimited",
    price: "$20",
    note: "For your whole working day",
    features: [
      "Unlimited messages",
      "Calyx Max intelligence",
      "Deepest reasoning profile",
      "Personalized AI instructions",
      "Calyx Humanizer workspace",
      "Connected app context",
      "Every Work feature",
    ],
  },
];

const models: { id: ModelId; name: string; description: string; plan: Plan }[] =
  [
    {
      id: "core",
      name: "Calyx Core",
      description: "Fast, capable everyday intelligence",
      plan: "free",
    },
    {
      id: "focus",
      name: "Calyx Focus",
      description: "Deeper planning and longer projects",
      plan: "starter",
    },
    {
      id: "work",
      name: "Calyx Work",
      description: "Advanced reasoning for tools and execution",
      plan: "work",
    },
    {
      id: "max",
      name: "Calyx Max",
      description: "Our highest reasoning profile",
      plan: "unlimited",
    },
  ];
const planRank: Record<Plan, number> = {
  free: 0,
  starter: 1,
  work: 2,
  unlimited: 3,
};

const productViews = ["landing", "chat", "pricing", "work", "humanizer", "privacy", "terms"] as const;
type ProductView = (typeof productViews)[number];

function Logo({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <span className="logo-lockup">
      <svg className="calyx-logo" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 4c0 9-6 13-15 13 7 4 10 10 7 20 6-5 12-5 16 3 0-9 4-14 12-17-9-2-13-8-12-17-2 7-4 12-8 16C20 15 20 10 24 4Z" />
        <circle cx="24" cy="24" r="4" />
      </svg>
      {wordmark && <span>Calyx</span>}
    </span>
  );
}

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    const cached = localStorage.getItem("calyx-threads");
    if (cached)
      try {
        return JSON.parse(cached);
      } catch {
        /* ignore corrupt local state */
      }
    return seedThreads;
  });
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const nativeApp = isNativeApp();
  const [view, setView] = useState<ProductView>(() =>
    nativeApp || location.hash === "#chat"
      ? "chat"
      : location.hash === "#pricing"
        ? "pricing"
        : location.hash === "#humanizer"
          ? "humanizer"
          : location.hash === "#work"
          ? "work"
          : location.hash === "#privacy"
            ? "privacy"
            : location.hash === "#terms"
              ? "terms"
              : "landing",
  );
  const [modal, setModal] = useState<"auth" | "account" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [model, setModel] = useState<ModelId>(
    () => (localStorage.getItem("calyx-model") as ModelId) || "core",
  );
  const [density, setDensity] = useState<"comfortable" | "compact">(() =>
    localStorage.getItem("calyx-density") === "compact"
      ? "compact"
      : "comfortable",
  );
  const [motion, setMotion] = useState(
    () => localStorage.getItem("calyx-motion") !== "reduced",
  );
  const [webSearch, setWebSearch] = useState(false);
  const [researchStage, setResearchStage] = useState("");
  const [responseStyle, setResponseStyle] = useState<
    "concise" | "balanced" | "detailed"
  >(
    () =>
      (localStorage.getItem("calyx-response-style") as
        "concise" | "balanced" | "detailed") || "balanced",
  );
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    () =>
      (localStorage.getItem("calyx-font-size") as
        "small" | "medium" | "large") || "medium",
  );
  const [enterToSend, setEnterToSend] = useState(
    () => localStorage.getItem("calyx-enter-send") !== "false",
  );
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>(
    [],
  );
  const [online, setOnline] = useState(navigator.onLine);
  const [updateState, setUpdateState] = useState<NativeUpdateState | null>(
    null,
  );
  const [visualTheme, setVisualTheme] = useState<CalyxTheme>(
    () => (localStorage.getItem("calyx-visual-theme") as CalyxTheme) || "dark",
  );
  const [blur, setBlur] = useState(
    () => localStorage.getItem("calyx-blur") !== "false",
  );
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [personalInstructions, setPersonalInstructions] = useState("");
  const [integrations, setIntegrations] = useState<AppIntegration[]>([]);
  const [useApps, setUseApps] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("calyx-theme");
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? threads[0],
    [threads, activeId],
  );

  const currentPlan = (user?.app_metadata?.plan as Plan) || "free";
  const displayName =
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";

  const navigate = (
    next: ProductView,
  ) => {
    setView(next);
    history.replaceState(
      null,
      "",
      next === "landing" ? location.pathname : `#${next}`,
    );
  };

  useEffect(
    () =>
      localStorage.setItem(
        "calyx-threads",
        JSON.stringify(threads, (key, value) =>
          key === "data" || key === "preview" ? undefined : value,
        ),
      ),
    [threads],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.platform = nativeApp ? "native" : "web";
    localStorage.setItem("calyx-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    setPersonalName(String(user?.user_metadata?.personal_name || ""));
    setPersonalInstructions(
      String(user?.user_metadata?.personal_instructions || ""),
    );
  }, [user]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !user) {
      setIntegrations([]);
      return;
    }
    void supabase.functions.invoke("app-integrations", { body: { action: "list" } }).then(({ data, error }) => {
      if (!error && Array.isArray(data?.integrations)) setIntegrations(data.integrations);
    });
  }, [user]);
  useEffect(() => {
    if (!nativeApp || !supabase) return;
    const authClient = supabase;
    document.documentElement.dataset.native = "true";
    const handleCallback = async (url: string) => {
      try {
        const callback = new URL(url);
        const code = callback.searchParams.get("code");
        if (code) {
          const { error } = await authClient.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
          const accessToken = fragment.get("access_token");
          const refreshToken = fragment.get("refresh_token");
          if (!accessToken || !refreshToken)
            throw new Error("Missing authentication response");
          const { error } = await authClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
        await closeNativeOAuth();
        setModal(null);
        setToast("Welcome to Calyx.");
        navigate("chat");
      } catch {
        setToast(FRIENDLY_ERROR);
      }
    };
    let dispose: () => void = () => undefined;
    void listenForNativeAuth(handleCallback).then((cleanup) => {
      dispose = cleanup;
    });
    return () => dispose();
  }, [nativeApp]);
  useEffect(() => {
    localStorage.setItem("calyx-model", model);
  }, [model]);
  useEffect(() => {
    localStorage.setItem("calyx-density", density);
    document.documentElement.dataset.density = density;
  }, [density]);
  useEffect(() => {
    localStorage.setItem("calyx-motion", motion ? "full" : "reduced");
    document.documentElement.dataset.motion = motion ? "full" : "reduced";
  }, [motion]);
  useEffect(() => {
    localStorage.setItem("calyx-response-style", responseStyle);
  }, [responseStyle]);
  useEffect(() => {
    localStorage.setItem("calyx-font-size", fontSize);
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem("calyx-enter-send", String(enterToSend));
  }, [enterToSend]);
  useEffect(() => {
    localStorage.setItem("calyx-visual-theme", visualTheme);
    document.documentElement.dataset.visualTheme = visualTheme;
  }, [visualTheme]);
  useEffect(() => {
    localStorage.setItem("calyx-blur", String(blur));
    document.documentElement.dataset.blur = blur ? "on" : "off";
  }, [blur]);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    addEventListener("online", connected);
    addEventListener("offline", disconnected);
    return () => {
      removeEventListener("online", connected);
      removeEventListener("offline", disconnected);
    };
  }, []);
  useEffect(() => {
    if (!window.calyxNative) return;
    const dispose = window.calyxNative.onUpdateState(setUpdateState);
    void window.calyxNative.checkForUpdates();
    return dispose;
  }, []);

  const newThread = () => {
    const thread = { id: uid(), title: "New conversation", messages: [] };
    setThreads((current) => [thread, ...current]);
    setActiveId(thread.id);
    navigate("chat");
  };

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const text = (preset ?? input).trim();
    if ((!text && !pendingAttachments.length) || busy) return;
    if (!online) return setToast("No network connection.");
    if (active.imageMode && (active.imageTurnsRemaining ?? 0) <= 0)
      return setToast(
        "This image chat is complete. Start a new chat to continue with text.",
      );
    const outgoingAttachments = pendingAttachments;
    const hasImage = outgoingAttachments.some((file) =>
      file.type.startsWith("image/"),
    );
    setInput("");
    setPendingAttachments([]);
    setBusy(true);
    navigate("chat");
    const timers: number[] = [];
    if (webSearch) {
      setResearchStage("Opening website links");
      timers.push(
        window.setTimeout(() => setResearchStage("Reading page content"), 900),
      );
      timers.push(
        window.setTimeout(() => setResearchStage("Comparing sources"), 2400),
      );
    } else setResearchStage("Reasoning through your request");
    const userMessage: Message = {
      id: uid(),
      role: "user",
      content: text || "Please analyze the attached file.",
      attachments: outgoingAttachments,
      createdAt: new Date().toISOString(),
    };
    const nextImageMode = active.imageMode || hasImage;
    const nextTurns =
      hasImage && !active.imageMode
        ? 5
        : active.imageMode
          ? Math.max(0, (active.imageTurnsRemaining ?? 0) - 1)
          : undefined;
    setThreads((current) =>
      current.map((t) =>
        t.id === activeId
          ? {
              ...t,
              imageMode: nextImageMode,
              imageTurnsRemaining: nextTurns,
              title: t.messages.length
                ? t.title
                : (text || outgoingAttachments[0]?.name || "Attachment").slice(
                    0,
                    38,
                  ),
              messages: [...t.messages, userMessage],
            }
          : t,
      ),
    );
    try {
      if (!supabase) throw new Error("demo");
      let integrationContext: unknown[] = [];
      if (user && useApps && integrations.length) {
        setResearchStage("Reading connected apps");
        const contextResult = await supabase.functions.invoke("app-integrations", {
          body: { action: "context", ids: integrations.map((item) => item.id) },
        });
        if (!contextResult.error && Array.isArray(contextResult.data?.context)) integrationContext = contextResult.data.context;
      }
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: {
          model,
          webSearch,
          integrationContext,
          preferences: { responseStyle, personalName, personalInstructions },
          messages: [...active.messages, userMessage].map(
            ({ role, content, attachments }) => ({
              role,
              content,
              attachments: attachments
                ?.filter((file) => file.data)
                .map(({ name, type, size, data }) => ({
                  name,
                  type,
                  size,
                  data,
                })),
            }),
          ),
        },
      });
      if (error) {
        let message = FRIENDLY_ERROR;
        if ("context" in error && error.context instanceof Response) {
          const payload = await error.context
            .clone()
            .json()
            .catch(() => null);
          if (payload?.error?.includes("10 free messages"))
            message = payload.error;
        }
        throw new Error(message);
      }
      const reply: Message = {
        id: uid(),
        role: "assistant",
        content: data.text,
        sources: data.sources,
        reasoningSummary: data.reasoningSummary,
        createdAt: new Date().toISOString(),
      };
      setThreads((current) =>
        current.map((t) =>
          t.id === activeId ? { ...t, messages: [...t.messages, reply] } : t,
        ),
      );
    } catch (error) {
      const content =
        error instanceof Error && error.message.includes("10 free messages")
          ? error.message
          : FRIENDLY_ERROR;
      const demo: Message = {
        id: uid(),
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      };
      setThreads((current) =>
        current.map((t) =>
          t.id === activeId ? { ...t, messages: [...t.messages, demo] } : t,
        ),
      );
    } finally {
      timers.forEach(clearTimeout);
      setResearchStage("");
      setBusy(false);
    }
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setToast(FRIENDLY_ERROR);
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { username }, emailRedirectTo: location.origin },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setToast(
      result.error
        ? FRIENDLY_ERROR
        : authMode === "signup"
          ? "Account created. Check your email if confirmation is required."
          : "Welcome back.",
    );
    if (!result.error) {
      setModal(null);
      setPassword("");
    }
  };

  const socialSignIn = async (provider: "google" | "github") => {
    if (!supabase) return setToast(FRIENDLY_ERROR);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authRedirectUrl(),
        skipBrowserRedirect: nativeApp,
      },
    });
    if (error || (nativeApp && !data.url)) return setToast(FRIENDLY_ERROR);
    if (nativeApp && data.url)
      await openNativeOAuth(data.url).catch(() => setToast(FRIENDLY_ERROR));
  };

  const resetPassword = async () => {
    if (!supabase || !email)
      return setToast(email ? FRIENDLY_ERROR : "Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin,
    });
    setToast(error ? FRIENDLY_ERROR : "Password reset instructions sent.");
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setModal(null);
    setToast("Signed out.");
  };

  const savePersonalization = async () => {
    if (currentPlan !== "unlimited")
      return setToast("AI personalization is included with Unlimited.");
    if (!supabase || !user) return setToast(FRIENDLY_ERROR);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        personal_name: personalName.trim().slice(0, 80),
        personal_instructions: personalInstructions.trim().slice(0, 2000),
      },
    });
    if (error) return setToast(FRIENDLY_ERROR);
    setUser(data.user);
    setToast("AI personalization saved.");
  };

  const deleteThread = (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread || !confirm(`Delete “${thread.title}”? This cannot be undone.`))
      return;
    const remaining = threads.filter((item) => item.id !== threadId);
    if (remaining.length) {
      setThreads(remaining);
      if (activeId === threadId) setActiveId(remaining[0].id);
    } else {
      const replacement: Thread = {
        id: uid(),
        title: "New conversation",
        messages: [],
      };
      setThreads([replacement]);
      setActiveId(replacement.id);
    }
    setToast("Chat deleted.");
  };

  const chooseModel = (next: ModelId) => {
    const choice = models.find((item) => item.id === next)!;
    if (planRank[currentPlan] < planRank[choice.plan]) {
      setToast(`${choice.name} is included with the ${choice.plan} plan.`);
      navigate("pricing");
      return;
    }
    setModel(next);
  };

  return (
    <div
      className="app-shell"
      data-view={view}
      data-native={nativeApp ? "true" : "false"}
    >
      {view === "landing" ? (
        <Landing
          dark={dark}
          setDark={setDark}
          user={user}
          displayName={displayName}
          openChat={() => navigate("chat")}
          openPricing={() => navigate("pricing")}
          openAuth={() => setModal(user ? "account" : "auth")}
          openLegal={(next) => navigate(next)}
        />
      ) : (
        <main className="product-shell">
          <header className="product-nav">
            <button
              className="logo-button"
              onClick={() => navigate(nativeApp ? "chat" : "landing")}
            >
              <Logo />
            </button>
            <nav>
              <button
                className={view === "chat" ? "active" : ""}
                onClick={() => navigate("chat")}
              >
                Chat
              </button>
              <button
                className={view === "work" ? "active" : ""}
                onClick={() => navigate("work")}
              >
                Work
              </button>
              <button
                className={view === "humanizer" ? "active" : ""}
                onClick={() => navigate("humanizer")}
              >
                Humanizer
              </button>
              <button
                className={view === "pricing" ? "active" : ""}
                onClick={() => navigate("pricing")}
              >
                Plans
              </button>
            </nav>
            <div className="header-actions">
              {!nativeApp && (
                <a
                  className="github-link"
                  href="https://github.com/UmarErth/calyxai"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github size={16} />
                </a>
              )}
              <button
                className="icon-button theme-toggle"
                aria-label={dark ? "Use light mode" : "Use dark mode"}
                onClick={() => setDark((value) => !value)}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              {user ? (
                <button
                  className="user-chip"
                  onClick={() => setModal("account")}
                >
                  <span>{displayName.slice(0, 1).toUpperCase()}</span>
                  {displayName}
                </button>
              ) : (
                <button className="sign-in" onClick={() => setModal("auth")}>
                  Sign in
                </button>
              )}
            </div>
          </header>
          {view === "chat" && (
            <Chat
              active={active}
              threads={threads}
              activeId={activeId}
              setActiveId={setActiveId}
              newThread={newThread}
              deleteThread={deleteThread}
              openAccount={() => setModal(user ? "account" : "auth")}
              busy={busy}
              input={input}
              setInput={setInput}
              send={send}
              model={model}
              currentPlan={currentPlan}
              chooseModel={chooseModel}
              webSearch={webSearch}
              setWebSearch={setWebSearch}
              integrationCount={integrations.length}
              useApps={useApps}
              setUseApps={setUseApps}
              researchStage={researchStage}
              enterToSend={enterToSend}
              pendingAttachments={pendingAttachments}
              setPendingAttachments={setPendingAttachments}
              setToast={setToast}
              visualTheme={visualTheme}
              setVisualTheme={setVisualTheme}
              deleteMessage={(messageId) =>
                setThreads((current) =>
                  current.map((thread) =>
                    thread.id === activeId
                      ? {
                          ...thread,
                          messages: thread.messages.filter(
                            (message) => message.id !== messageId,
                          ),
                        }
                      : thread,
                  ),
                )
              }
            />
          )}
          {view === "pricing" && (
            <Pricing
              onChoose={async (plan) => {
                if (user && plan === currentPlan)
                  return setToast("You are already on this plan.");
                if (plan === "free") return setModal("auth");
                if (!supabase) return setToast(FRIENDLY_ERROR);
                const { data, error } = await supabase.functions.invoke(
                  "create-checkout",
                  { body: { plan, returnUrl: `${location.origin}/` } },
                );
                if (error || !data?.url) return setToast(FRIENDLY_ERROR);
                location.assign(data.url);
              }}
              currentPlan={currentPlan}
              signedIn={Boolean(user)}
            />
          )}
          {view === "work" && <Work />}
          {view === "humanizer" && (
            <Humanizer
              plan={currentPlan}
              signedIn={Boolean(user)}
              openPricing={() => navigate("pricing")}
              openAuth={() => setModal("auth")}
              setToast={setToast}
            />
          )}
          {view === "privacy" && <LegalPage kind="privacy" />}
          {view === "terms" && <LegalPage kind="terms" />}
        </main>
      )}

      {modal === "auth" && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div
            className="modal auth-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setModal(null)}>
              <X size={18} />
            </button>
            <form onSubmit={signIn}>
              <span className="brand-mark large">C</span>
              <h2>
                {authMode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p>
                {authMode === "signin"
                  ? "Continue your work with Calyx."
                  : "Choose a username and secure password."}
              </p>
              <div className="sso-row">
                <button
                  type="button"
                  className="sso-button"
                  onClick={() => socialSignIn("google")}
                >
                  <span>G</span> Continue with Google
                </button>
                <button
                  type="button"
                  className="sso-button"
                  onClick={() => socialSignIn("github")}
                >
                  <Github size={17} /> Continue with GitHub
                </button>
              </div>
              <div className="auth-divider">
                <span>or</span>
              </div>
              {authMode === "signup" && (
                <label>
                  Username
                  <input
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={
                    authMode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {authMode === "signin" && (
                <button
                  type="button"
                  className="text-button forgot"
                  onClick={resetPassword}
                >
                  Forgot password?
                </button>
              )}
              <button className="primary" type="submit">
                {authMode === "signin" ? "Sign in" : "Create account"}
              </button>
              <button
                type="button"
                className="text-button auth-switch"
                onClick={() =>
                  setAuthMode((mode) =>
                    mode === "signin" ? "signup" : "signin",
                  )
                }
              >
                {authMode === "signin"
                  ? "New to Calyx? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          </div>
        </div>
      )}
      {modal === "account" && user && (
        <AccountModal
          user={user}
          displayName={displayName}
          plan={currentPlan}
          model={model}
          chooseModel={chooseModel}
          dark={dark}
          setDark={setDark}
          density={density}
          setDensity={setDensity}
          motion={motion}
          setMotion={setMotion}
          responseStyle={responseStyle}
          setResponseStyle={setResponseStyle}
          fontSize={fontSize}
          setFontSize={setFontSize}
          enterToSend={enterToSend}
          setEnterToSend={setEnterToSend}
          visualTheme={visualTheme}
          setVisualTheme={setVisualTheme}
          blur={blur}
          setBlur={setBlur}
          personalName={personalName}
          setPersonalName={setPersonalName}
          personalInstructions={personalInstructions}
          setPersonalInstructions={setPersonalInstructions}
          savePersonalization={savePersonalization}
          integrations={integrations}
          setIntegrations={setIntegrations}
          setToast={setToast}
          close={() => setModal(null)}
          signOut={signOut}
          openPricing={() => {
            setModal(null);
            navigate("pricing");
          }}
        />
      )}
      {!online && (
        <div className="offline-overlay">
          <div>
            <WifiOff />
            <h2>No network connection</h2>
            <p>Calyx will be ready when you’re back online.</p>
            <button onClick={() => location.reload()}>Try again</button>
          </div>
        </div>
      )}
      {updateState && !["current", "checking"].includes(updateState.status) && (
        <button
          className={`update-banner ${updateState.status}`}
          onClick={() =>
            updateState.status === "available" &&
            window.calyxNative?.downloadUpdate()
          }
        >
          <Sparkles size={17} />
          <span>
            <strong>
              {updateState.status === "available"
                ? `Calyx ${updateState.version} is available`
                : updateState.status === "downloading"
                  ? `Downloading update · ${Math.round(updateState.progress || 0)}%`
                  : updateState.status === "installing"
                    ? "Installing update…"
                    : "Update check failed"}
            </strong>
            <small>
              {updateState.status === "available"
                ? "Click to download and install"
                : updateState.status === "installing"
                  ? "Calyx will close and relaunch automatically."
                  : "Your work is saved."}
            </small>
          </span>
        </button>
      )}
      {nativeApp && view === "chat" && (
        <details className="native-customizer">
          <summary>
            <Palette size={16} /> Customize
          </summary>
          <div>
            <p>Interface theme</p>
            <div className="theme-grid">
              {(
                ["light", "dark", "hacker", "midnight", "paper"] as CalyxTheme[]
              ).map((theme) => (
                <button
                  key={theme}
                  className={visualTheme === theme ? "active" : ""}
                  onClick={() => {
                    setVisualTheme(theme);
                    setDark(theme !== "light" && theme !== "paper");
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>
            <label>
              <span>Translucent blur</span>
              <input
                type="checkbox"
                checked={blur}
                onChange={(e) => setBlur(e.target.checked)}
              />
            </label>
            <label>
              <span>Reduce motion</span>
              <input
                type="checkbox"
                checked={!motion}
                onChange={(e) => setMotion(!e.target.checked)}
              />
            </label>
          </div>
        </details>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Landing({
  dark,
  setDark,
  user,
  displayName,
  openChat,
  openPricing,
  openAuth,
  openLegal,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  user: User | null;
  displayName: string;
  openChat: () => void;
  openPricing: () => void;
  openAuth: () => void;
  openLegal: (v: "privacy" | "terms") => void;
}) {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Logo />
        <nav>
          <button onClick={openChat}>Product</button>
          <a href="#downloads">Downloads</a>
          <button onClick={openPricing}>Pricing</button>
          <a
            href="https://github.com/UmarErth/calyxai"
            target="_blank"
            rel="noreferrer"
          >
            Open source
          </a>
        </nav>
        <div>
          <button
            className="icon-button"
            aria-label={dark ? "Use light mode" : "Use dark mode"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className={user ? "user-chip" : "nav-account"}
            onClick={openAuth}
          >
            {user && <span>{displayName.slice(0, 1).toUpperCase()}</span>}
            {user ? displayName : "Sign in"}
          </button>
          <button className="nav-cta" onClick={openChat}>
            Open Calyx <ArrowRight size={15} />
          </button>
        </div>
      </header>
      <section className="landing-hero">
        <div className="hero-statement">
          <p className="section-label">CALYX INTELLIGENCE / PUBLIC RELEASE</p>
          <h1>
            A clearer place
            <br />
            to do difficult work.
          </h1>
          <p className="hero-lede">
            Calyx is an independent AI workspace for research, decisions,
            writing, and execution—designed to keep the work visible and the
            interface out of your way.
          </p>
          <div className="hero-actions">
            <button onClick={openChat}>
              Start a conversation <ArrowRight size={17} />
            </button>
            <a href="#downloads">
              Download the app <Download size={17} />
            </a>
            <button onClick={openPricing}>View plans</button>
          </div>
        </div>
        <div className="brand-orbit" aria-label="Calyx brand symbol">
          <Logo wordmark={false} />
          <span>REASON</span>
          <span>BUILD</span>
          <span>REFINE</span>
        </div>
      </section>
      <section className="proof-strip">
        <span>OPEN SOURCE</span>
        <span>SELF-HOSTED TYPOGRAPHY</span>
        <span>USER-CONTROLLED WORKFLOWS</span>
        <span>DARK MODE INCLUDED</span>
      </section>
      <section className="company-grid">
        <div>
          <p className="section-label">BUILT FOR REAL OUTPUT</p>
          <h2>Not another empty chat window.</h2>
        </div>
        <div className="capability">
          <span>01</span>
          <h3>Think in systems</h3>
          <p>
            Break large questions into decisions, assumptions, evidence, and
            next actions.
          </p>
        </div>
        <div className="capability">
          <span>02</span>
          <h3>Keep work legible</h3>
          <p>
            Conversations, task context, and approved actions stay visibly
            separated.
          </p>
        </div>
        <div className="capability">
          <span>03</span>
          <h3>Move with control</h3>
          <p>
            Use Work features and the open-source extension without silent
            browser access.
          </p>
        </div>
      </section>
      <section className="downloads" id="downloads">
        <div className="downloads-heading">
          <p className="section-label">CALYX ON YOUR DEVICE</p>
          <h2>
            One workspace.
            <br />
            Everywhere you work.
          </h2>
          <p>
            Install the official Calyx app for your platform. Android 0.5.0 and
            desktop 0.3.0 are available now.
          </p>
        </div>
        <div className="download-grid">
          <a href="https://raw.githubusercontent.com/UmarErth/calyxai/main/public/fdroid/repo/ai.calyx.app_5.apk">
            <Smartphone />
            <span>
              <strong>Android APK</strong>
              <small>Direct installation · Android 7+</small>
            </span>
            <Download size={18} />
          </a>
          <a href="https://fdroid.link/#https://raw.githubusercontent.com/UmarErth/calyxai/main/public/fdroid/repo?fingerprint=9DF749C6D82AA3F26C3565003671441E3EDBD7A6518BBE63B8E87F074998513A">
            <Download />
            <span>
              <strong>F-Droid repository</strong>
              <small>Signed updates through your F-Droid client</small>
            </span>
            <ArrowRight size={18} />
          </a>
          <a href="https://github.com/UmarErth/calyxai/releases/download/v0.3.0/Calyx.Setup.0.3.0.exe">
            <Monitor />
            <span>
              <strong>Windows</strong>
              <small>64-bit installer</small>
            </span>
            <Download size={18} />
          </a>
          <a href="https://github.com/UmarErth/calyxai/releases/download/v0.3.0/Calyx-0.3.0.AppImage">
            <Terminal />
            <span>
              <strong>Linux</strong>
              <small>Portable AppImage</small>
            </span>
            <Download size={18} />
          </a>
        </div>
        <a
          className="all-releases"
          href="https://github.com/UmarErth/calyxai/releases/tag/v0.3.0"
          target="_blank"
          rel="noreferrer"
        >
          Release notes and alternate downloads <ExternalLink size={14} />
        </a>
      </section>
      <section className="landing-closing">
        <Logo wordmark={false} />
        <h2>Make room for better thinking.</h2>
        <button onClick={openChat}>
          Enter the workspace <ArrowRight size={17} />
        </button>
      </section>
      <footer>
        <Logo />
        <span>Open source software by Calyx.</span>
        <div className="footer-links">
          <a href="#downloads">Downloads</a>
          <button onClick={() => openLegal("privacy")}>Privacy</button>
          <button onClick={() => openLegal("terms")}>Terms</button>
          <a
            href="https://github.com/UmarErth/calyxai"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

function Chat({
  active,
  threads,
  activeId,
  setActiveId,
  newThread,
  deleteThread,
  openAccount,
  busy,
  input,
  setInput,
  send,
  model,
  currentPlan,
  chooseModel,
  webSearch,
  setWebSearch,
  integrationCount,
  useApps,
  setUseApps,
  researchStage,
  enterToSend,
  pendingAttachments,
  setPendingAttachments,
  setToast,
  visualTheme,
  setVisualTheme,
  deleteMessage,
}: {
  active: Thread;
  threads: Thread[];
  activeId: string;
  setActiveId: (v: string) => void;
  newThread: () => void;
  deleteThread: (id: string) => void;
  openAccount: () => void;
  busy: boolean;
  input: string;
  setInput: (v: string) => void;
  send: (e?: FormEvent, preset?: string) => void;
  model: ModelId;
  currentPlan: Plan;
  chooseModel: (v: ModelId) => void;
  webSearch: boolean;
  setWebSearch: (v: boolean) => void;
  integrationCount: number;
  useApps: boolean;
  setUseApps: (v: boolean) => void;
  researchStage: string;
  enterToSend: boolean;
  pendingAttachments: Attachment[];
  setPendingAttachments: (v: Attachment[]) => void;
  setToast: (v: string) => void;
  visualTheme: CalyxTheme;
  setVisualTheme: (v: CalyxTheme) => void;
  deleteMessage: (id: string) => void;
}) {
  const empty = active.messages.length === 0;
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    message?: Message;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 4);
    const allowed = selected.filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.type.startsWith("text/") ||
        /\.(md|json|csv|js|ts|tsx|py|html|css)$/i.test(file.name),
    );
    if (allowed.length !== selected.length)
      setToast("Calyx supports images, PDFs, text, and code files.");
    if (allowed.some((file) => file.size >= 10 * 1024 * 1024))
      return setToast("Each AI attachment must be smaller than 10 MB.");
    const loaded = await Promise.all(
      allowed.map(
        (file) =>
          new Promise<Attachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
              const result = String(reader.result);
              resolve({
                id: uid(),
                name: file.name,
                type: file.type || "text/plain",
                size: file.size,
                data: result.split(",")[1],
                preview: file.type.startsWith("image/") ? result : undefined,
              });
            };
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPendingAttachments([...pendingAttachments, ...loaded].slice(0, 4));
  };
  useEffect(() => {
    const transcript = messagesRef.current;
    if (!transcript) return;
    requestAnimationFrame(() =>
      transcript.scrollTo({
        top: transcript.scrollHeight,
        behavior: active.messages.length > 1 ? "smooth" : "auto",
      }),
    );
  }, [activeId, active.messages.length, busy]);
  return (
    <section
      className={empty ? "chat cockpit empty" : "chat cockpit"}
      onContextMenu={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }
      }}
    >
      {drawerOpen && (
        <button
          className="mobile-drawer-backdrop"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={
          drawerOpen ? "conversation-rail mobile-open" : "conversation-rail"
        }
      >
        <div>
          <p>Conversations</p>
          <span className="rail-actions">
            <button onClick={newThread} aria-label="New conversation">
              <SquarePen size={16} />
            </button>
            <button
              className="drawer-close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </span>
        </div>
        {threads.map((thread, index) => (
          <div
            className={
              thread.id === activeId ? "thread-row active" : "thread-row"
            }
            key={thread.id}
          >
            <button
              onClick={() => {
                setActiveId(thread.id);
                setDrawerOpen(false);
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{thread.title}</strong>
            </button>
            <button
              className="delete-chat"
              onClick={() => deleteThread(thread.id)}
              aria-label={`Delete ${thread.title}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div className="mobile-drawer-tools">
          <button onClick={openAccount}>
            <UserRound size={17} /> Account & personalization
          </button>
          <p>Theme</p>
          <div className="drawer-themes">
            {(
              ["dark", "light", "paper", "midnight", "hacker"] as CalyxTheme[]
            ).map((theme) => (
              <button
                key={theme}
                className={visualTheme === theme ? "active" : ""}
                onClick={() => setVisualTheme(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <section className="dialogue-stage">
        <div className="stage-header">
          <button
            className="mobile-menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open chats and settings"
          >
            <Menu size={21} />
          </button>
          <div>
            <span>ACTIVE DIALOGUE</span>
            <strong>{active.title}</strong>
          </div>
          <div className="stage-controls">
            <ModelSelector
              value={model}
              plan={currentPlan}
              onChange={chooseModel}
            />
            <button
              className="stage-delete"
              onClick={() => deleteThread(activeId)}
              aria-label="Delete this chat"
            >
              <Trash2 size={16} />
            </button>
            <span className="stage-status">
              <i /> Private
            </span>
          </div>
        </div>
        {active.imageMode && (
          <div className="image-budget">
            <Image size={14} />
            {active.imageTurnsRemaining
              ? `${active.imageTurnsRemaining} follow-up messages remain in this image chat`
              : "Image chat complete"}
            {!active.imageTurnsRemaining && (
              <button onClick={newThread}>Start text chat</button>
            )}
          </div>
        )}
        <div className="messages" ref={messagesRef}>
          {empty ? (
            <div className="empty-state">
              <Logo wordmark={false} />
              <p className="hero-kicker">NEW DIALOGUE</p>
              <h1>
                What are we
                <br />
                working on?
              </h1>
              <p>
                Bring the rough version. Calyx will help shape the structure,
                challenge assumptions, and move toward something useful.
              </p>
              <div className="suggestions">
                {suggestions.map(([title, prompt, Icon]) => (
                  <button
                    key={title as string}
                    onClick={() => send(undefined, prompt as string)}
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{title as string}</strong>
                      <small>{prompt as string}</small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role}`}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, message });
                }}
              >
                <div className="avatar">
                  {message.role === "assistant" ? (
                    <Logo wordmark={false} />
                  ) : (
                    "YOU"
                  )}
                </div>
                <div className="message-body">
                  {message.attachments?.length ? (
                    <div className="message-attachments">
                      {message.attachments.map((file) =>
                        file.preview ? (
                          <img
                            key={file.id}
                            src={file.preview}
                            alt={file.name}
                          />
                        ) : (
                          <span key={file.id}>
                            <FileText size={15} />
                            {file.name}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}
                  {message.role === "assistant" &&
                  (message.sources?.length || message.reasoningSummary) ? (
                    <ResearchDetails
                      sources={message.sources || []}
                      summary={message.reasoningSummary}
                    />
                  ) : null}
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </article>
            ))
          )}
          {busy && (
            <article className="message assistant research-pending">
              <div className="avatar">
                <Logo wordmark={false} />
              </div>
              <div>
                <div className="thinking">
                  <i />
                  <i />
                  <i />
                </div>
                <strong>{researchStage}</strong>
                <small>
                  {webSearch
                    ? "Calyx will show every website it reads."
                    : "Building a careful response."}
                </small>
              </div>
            </article>
          )}
        </div>
        {pendingAttachments.length > 0 && (
          <div className="attachment-tray">
            {pendingAttachments.map((file) => (
              <div key={file.id}>
                {file.preview ? (
                  <img src={file.preview} alt="" />
                ) : (
                  <FileText size={17} />
                )}
                <span>
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </span>
                <button
                  onClick={() =>
                    setPendingAttachments(
                      pendingAttachments.filter((item) => item.id !== file.id),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form className="composer" onSubmit={send}>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            multiple
            accept="image/*,application/pdf,text/*,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="attach-button"
            onClick={() => fileRef.current?.click()}
            title="Attach an image or file (under 10 MB)"
          >
            <Paperclip size={17} />
          </button>
          <button
            type="button"
            className={webSearch ? "web-toggle active" : "web-toggle"}
            onClick={() => setWebSearch(!webSearch)}
            title="Read website links you provide"
          >
            <Globe2 size={16} />
            <span>Links</span>
          </button>
          {integrationCount > 0 && (
            <button
              type="button"
              className={useApps ? "web-toggle active" : "web-toggle"}
              onClick={() => setUseApps(!useApps)}
              title="Let Calyx read your connected apps for this request"
            >
              <Blocks size={16} />
              <span>Apps · {integrationCount}</span>
            </button>
          )}
          <textarea
            aria-label="Message Calyx"
            placeholder={
              webSearch
                ? "Paste website links and tell Calyx what to find…"
                : "Message Calyx…"
            }
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && enterToSend) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="send"
            disabled={
              (!input.trim() && !pendingAttachments.length) ||
              busy ||
              (active.imageMode && !active.imageTurnsRemaining)
            }
            aria-label="Send"
          >
            <ArrowUp size={19} />
          </button>
        </form>
        <p className="disclaimer">
          Calyx can make mistakes. Check important information.
        </p>
        {menu && (
          <div
            className="context-menu"
            style={{ left: menu.x, top: menu.y }}
            onMouseLeave={() => setMenu(null)}
          >
            {menu.message && (
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(menu.message!.content);
                  setMenu(null);
                }}
              >
                <Copy size={14} /> Copy
              </button>
            )}
            {menu.message && (
              <button
                onClick={() => {
                  deleteMessage(menu.message!.id);
                  setMenu(null);
                }}
              >
                <Trash2 size={14} /> Delete message
              </button>
            )}
            <button
              onClick={() => {
                newThread();
                setMenu(null);
              }}
            >
              <SquarePen size={14} /> New chat
            </button>
          </div>
        )}
      </section>
    </section>
  );
}

function ResearchDetails({
  sources,
  summary,
}: {
  sources: Message["sources"];
  summary?: string;
}) {
  return (
    <details className="research-trace">
      <summary>
        <Globe2 size={15} />
        <span>
          {sources?.length
            ? `Research complete · ${sources.length} sources`
            : "Reasoning summary"}
        </span>
        <ChevronDown size={14} />
      </summary>
      <div>
        {summary && (
          <p>
            <strong>Reasoning summary</strong>
            {summary}
          </p>
        )}
        {sources?.map((source) => (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            key={source.url}
          >
            <span>
              <strong>{source.title}</strong>
              <small>{source.status}</small>
            </span>
            <ExternalLink size={13} />
          </a>
        ))}
      </div>
    </details>
  );
}

function ModelSelector({
  value,
  plan,
  onChange,
}: {
  value: ModelId;
  plan: Plan;
  onChange: (v: ModelId) => void;
}) {
  return (
    <label className="model-select">
      <span className="sr-only">Choose model</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
      >
        {models.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
            {planRank[plan] < planRank[item.plan] ? ` — ${item.plan} plan` : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
}

const integrationProviders: Array<{ id: AppIntegration["provider"]; name: string; note: string }> = [
  { id: "github", name: "GitHub", note: "Repositories, issues, and recent project context" },
  { id: "cloudflare", name: "Cloudflare", note: "Accounts, zones, and deployment context" },
  { id: "notion", name: "Notion", note: "Pages and workspace search" },
  { id: "slack", name: "Slack", note: "Channels available to your token" },
  { id: "google_drive", name: "Google Drive", note: "Recent files and document metadata" },
  { id: "linear", name: "Linear", note: "Assigned issues and project status" },
  { id: "custom", name: "Custom app", note: "Bring an HTTPS JSON API manifest" },
];

function IntegrationSettings({ integrations, setIntegrations, setToast }: { integrations: AppIntegration[]; setIntegrations: (value: AppIntegration[]) => void; setToast: (value: string) => void }) {
  const [provider, setProvider] = useState<AppIntegration["provider"]>("github");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [contextPath, setContextPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    if (!supabase || !token.trim()) return setToast("Enter a credential first.");
    setBusy(true);
    const config = provider === "custom" ? { baseUrl, healthPath: contextPath, contextPath, allowedPaths: [contextPath], authHeader: "Authorization", authPrefix: "Bearer " } : {};
    const { data, error } = await supabase.functions.invoke("app-integrations", { body: { action: "connect", provider, name: name.trim() || integrationProviders.find((item) => item.id === provider)?.name, token, config } });
    setBusy(false);
    if (error || !data?.integration) return setToast(FRIENDLY_ERROR);
    setIntegrations([data.integration, ...integrations.filter((item) => item.id !== data.integration.id)]);
    setToken("");
    setName("");
    setToast(`${data.integration.name} connected.`);
  };
  const disconnect = async (integration: AppIntegration) => {
    if (!supabase || !confirm(`Disconnect ${integration.name}?`)) return;
    const { error } = await supabase.functions.invoke("app-integrations", { body: { action: "disconnect", id: integration.id } });
    if (error) return setToast(FRIENDLY_ERROR);
    setIntegrations(integrations.filter((item) => item.id !== integration.id));
    setToast(`${integration.name} disconnected.`);
  };
  return (
    <section className="settings-section integrations-settings">
      <h3><Blocks size={15} /> App integrations</h3>
      <p className="settings-copy">Give Calyx read-only context from services you choose. Credentials are encrypted server-side and are never sent to the AI model.</p>
      {integrations.length > 0 && <div className="connected-apps">{integrations.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.provider.replace("_", " ")} · Connected</small></span><button onClick={() => void disconnect(item)} aria-label={`Disconnect ${item.name}`}><Trash2 size={14} /></button></div>)}</div>}
      <div className="app-catalog">{integrationProviders.map((item) => <button key={item.id} className={provider === item.id ? "selected" : ""} onClick={() => setProvider(item.id)}><strong>{item.name}</strong><small>{item.note}</small></button>)}</div>
      <div className="integration-form">
        <label><span>Connection name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={integrationProviders.find((item) => item.id === provider)?.name} /></label>
        {provider === "custom" && <><label><span>HTTPS API base URL</span><input type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com" /></label><label><span>Allowed context path</span><input value={contextPath} onChange={(event) => setContextPath(event.target.value)} placeholder="/v1/context" /></label></>}
        <label><span>{provider === "custom" ? "API credential" : "Access token"}</span><input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Stored encrypted" /></label>
        <button className="save-personalization" disabled={busy} onClick={() => void connect()}>{busy ? "Verifying…" : `Connect ${integrationProviders.find((item) => item.id === provider)?.name}`}</button>
      </div>
      <details className="app-sdk"><summary>Build your own Calyx app</summary><p>Expose a small HTTPS JSON endpoint, choose the exact path Calyx may read, and connect it as a Custom app. Calyx blocks private-network URLs and never provides an open proxy.</p></details>
    </section>
  );
}

function Humanizer({ plan, signedIn, openPricing, openAuth, setToast }: { plan: Plan; signedIn: boolean; openPricing: () => void; openAuth: () => void; setToast: (value: string) => void }) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("natural");
  const [result, setResult] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [signals, setSignals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const humanize = async () => {
    if (plan !== "unlimited") return openPricing();
    if (!supabase || !text.trim()) return setToast("Paste some text first.");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("gemini-chat", { body: { mode: "humanize", text, tone } });
    setBusy(false);
    if (error || typeof data?.humanized !== "string") return setToast(FRIENDLY_ERROR);
    setResult(data.humanized);
    setScore(data.aiStyleScore);
    setSignals(Array.isArray(data.signals) ? data.signals : []);
  };
  if (!signedIn || plan !== "unlimited") return <section className="page humanizer-page humanizer-locked"><WandSparkles size={34} /><p className="eyebrow accent">CALYX HUMANIZER</p><h1>Make stiff writing sound like you.</h1><p>Humanizer is an Unlimited workspace for rewriting formulaic text with a more natural rhythm while preserving its meaning and facts.</p><button className="primary" onClick={signedIn ? openPricing : openAuth}>{signedIn ? "Upgrade to Unlimited" : "Sign in to continue"}</button></section>;
  return (
    <section className="page humanizer-page">
      <div className="humanizer-heading"><div><p className="eyebrow accent">UNLIMITED WORKSPACE</p><h1>Calyx Humanizer</h1><p>Refine robotic or repetitive prose without adding fake stories, mistakes, or unsupported claims.</p></div>{score !== null && <div className="style-score"><strong>{score}%</strong><span>AI-like style estimate</span><small>Not an authorship detector</small></div>}</div>
      <div className="humanizer-toolbar"><label>Voice<select value={tone} onChange={(event) => setTone(event.target.value)}>{["natural", "professional", "casual", "confident", "warm"].map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary" disabled={busy || !text.trim()} onClick={() => void humanize()}><WandSparkles size={16} /> {busy ? "Humanizing…" : "Humanize"}</button></div>
      <div className="humanizer-grid"><label><span>Original text</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste text to humanize…" /></label><label><span>Humanized result</span><textarea value={result} readOnly placeholder="Your rewritten text will appear here." /></label></div>
      {signals.length > 0 && <div className="style-signals"><strong>Patterns noticed</strong>{signals.map((signal) => <span key={signal}>{signal}</span>)}</div>}
    </section>
  );
}

function AccountModal({
  user,
  displayName,
  plan,
  model,
  chooseModel,
  dark,
  setDark,
  density,
  setDensity,
  motion,
  setMotion,
  responseStyle,
  setResponseStyle,
  fontSize,
  setFontSize,
  enterToSend,
  setEnterToSend,
  visualTheme,
  setVisualTheme,
  blur,
  setBlur,
  personalName,
  setPersonalName,
  personalInstructions,
  setPersonalInstructions,
  savePersonalization,
  integrations,
  setIntegrations,
  setToast,
  close,
  signOut,
  openPricing,
}: {
  user: User;
  displayName: string;
  plan: Plan;
  model: ModelId;
  chooseModel: (v: ModelId) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  density: "comfortable" | "compact";
  setDensity: (v: "comfortable" | "compact") => void;
  motion: boolean;
  setMotion: (v: boolean) => void;
  responseStyle: "concise" | "balanced" | "detailed";
  setResponseStyle: (v: "concise" | "balanced" | "detailed") => void;
  fontSize: "small" | "medium" | "large";
  setFontSize: (v: "small" | "medium" | "large") => void;
  enterToSend: boolean;
  setEnterToSend: (v: boolean) => void;
  visualTheme: CalyxTheme;
  setVisualTheme: (v: CalyxTheme) => void;
  blur: boolean;
  setBlur: (v: boolean) => void;
  personalName: string;
  setPersonalName: (v: string) => void;
  personalInstructions: string;
  setPersonalInstructions: (v: string) => void;
  savePersonalization: () => void;
  integrations: AppIntegration[];
  setIntegrations: (value: AppIntegration[]) => void;
  setToast: (value: string) => void;
  close: () => void;
  signOut: () => void;
  openPricing: () => void;
}) {
  const next =
    plan === "free"
      ? "Starter"
      : plan === "starter"
        ? "Work"
        : plan === "work"
          ? "Unlimited"
          : null;
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div
        className="modal account-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <X size={18} />
        </button>
        <div className="account-heading">
          <span className="account-avatar">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p>Signed in as</p>
            <h2>{displayName}</h2>
            <small>{user.email}</small>
          </div>
        </div>
        <div className="account-plan">
          <div>
            <span>{plan.toUpperCase()} PLAN</span>
            <strong>
              {plan === "unlimited"
                ? "Everything is unlocked"
                : `${plans.find((item) => item.id === plan)?.features[0]}`}
            </strong>
          </div>
          {next && <button onClick={openPricing}>See {next}</button>}
        </div>
        <section className="settings-section">
          <h3>
            <Settings2 size={15} /> Intelligence
          </h3>
          <ModelSelector value={model} plan={plan} onChange={chooseModel} />
          <div className="model-catalog">
            {models.map((item) => {
              const unlocked = planRank[plan] >= planRank[item.plan];
              return (
                <button
                  key={item.id}
                  className={item.id === model ? "selected" : ""}
                  onClick={() => chooseModel(item.id)}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <em>
                    {unlocked
                      ? item.id === model
                        ? "Active"
                        : "Included"
                      : `${item.plan}+`}
                  </em>
                </button>
              );
            })}
          </div>
        </section>
        <section className={plan === "unlimited" ? "settings-section personalization" : "settings-section personalization locked"}>
          <h3>
            <UserRound size={15} /> AI personalization
            <em>{plan === "unlimited" ? "Unlimited" : "Unlimited only"}</em>
          </h3>
          <p>Tell Calyx who you are and how you want it to work with you.</p>
          <label>
            <span>What should Calyx call you?</span>
            <input value={personalName} maxLength={80} disabled={plan !== "unlimited"} placeholder="Your preferred name" onChange={(event) => setPersonalName(event.target.value)} />
          </label>
          <label>
            <span>How should Calyx behave?</span>
            <textarea value={personalInstructions} maxLength={2000} disabled={plan !== "unlimited"} rows={5} placeholder="For example: Be direct, challenge weak assumptions, and explain technical ideas with practical examples." onChange={(event) => setPersonalInstructions(event.target.value)} />
          </label>
          {plan === "unlimited" ? <button className="save-personalization" onClick={savePersonalization}>Save personalization</button> : <button className="save-personalization" onClick={openPricing}>Unlock with Unlimited</button>}
        </section>
        <IntegrationSettings integrations={integrations} setIntegrations={setIntegrations} setToast={setToast} />
        <section className="settings-section">
          <h3>
            <Palette size={15} /> Appearance
          </h3>
          <div className="setting-row">
            <span>Theme</span>
            <div className="segmented">
              <button
                className={!dark ? "active" : ""}
                onClick={() => setDark(false)}
              >
                Light
              </button>
              <button
                className={dark ? "active" : ""}
                onClick={() => setDark(true)}
              >
                Dark
              </button>
            </div>
          </div>
          <div className="setting-row theme-setting">
            <span>Color style</span>
            <div className="segmented">
              {(["light", "dark", "paper", "midnight", "hacker"] as CalyxTheme[]).map((theme) => <button key={theme} className={visualTheme === theme ? "active" : ""} onClick={() => setVisualTheme(theme)}>{theme}</button>)}
            </div>
          </div>
          <div className="setting-row">
            <span>Density</span>
            <div className="segmented">
              <button
                className={density === "comfortable" ? "active" : ""}
                onClick={() => setDensity("comfortable")}
              >
                Comfortable
              </button>
              <button
                className={density === "compact" ? "active" : ""}
                onClick={() => setDensity("compact")}
              >
                Compact
              </button>
            </div>
          </div>
          <div className="setting-row">
            <span>Text size</span>
            <div className="segmented">
              <button
                className={fontSize === "small" ? "active" : ""}
                onClick={() => setFontSize("small")}
              >
                Small
              </button>
              <button
                className={fontSize === "medium" ? "active" : ""}
                onClick={() => setFontSize("medium")}
              >
                Medium
              </button>
              <button
                className={fontSize === "large" ? "active" : ""}
                onClick={() => setFontSize("large")}
              >
                Large
              </button>
            </div>
          </div>
          <label className="setting-row">
            <span>Interface motion</span>
            <input
              type="checkbox"
              checked={motion}
              onChange={(e) => setMotion(e.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>Translucent blur</span>
            <input type="checkbox" checked={blur} onChange={(event) => setBlur(event.target.checked)} />
          </label>
        </section>
        <section className="settings-section">
          <h3>
            <Sparkles size={15} /> Responses
          </h3>
          <div className="setting-row">
            <span>Answer style</span>
            <div className="segmented">
              <button
                className={responseStyle === "concise" ? "active" : ""}
                onClick={() => setResponseStyle("concise")}
              >
                Concise
              </button>
              <button
                className={responseStyle === "balanced" ? "active" : ""}
                onClick={() => setResponseStyle("balanced")}
              >
                Balanced
              </button>
              <button
                className={responseStyle === "detailed" ? "active" : ""}
                onClick={() => setResponseStyle("detailed")}
              >
                Detailed
              </button>
            </div>
          </div>
          <label className="setting-row">
            <span>Enter sends message</span>
            <input
              type="checkbox"
              checked={enterToSend}
              onChange={(e) => setEnterToSend(e.target.checked)}
            />
          </label>
        </section>
        {next && (
          <section className="missing-out">
            <p>WHAT YOU'RE MISSING</p>
            <h3>Move up to {next}</h3>
            <ul>
              {plans
                .find((item) => item.name === next)
                ?.features.slice(1)
                .map((feature) => (
                  <li key={feature}>
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
            </ul>
            <button onClick={openPricing}>
              Compare all plans <ArrowRight size={14} />
            </button>
          </section>
        )}
        <button className="sign-out" onClick={signOut}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  return (
    <article className="page legal">
      <p className="eyebrow accent">Calyx legal</p>
      <h1>{privacy ? "Privacy Policy" : "Terms of Service"}</h1>
      <p className="legal-date">Effective October 11, 2026</p>
      {privacy ? (
        <>
          <section>
            <h2>The short version</h2>
            <p>
              We collect only what is needed to operate Calyx, protect accounts,
              process subscriptions, and improve reliability. We do not sell
              personal information.
            </p>
          </section>
          <section>
            <h2>Information we process</h2>
            <p>
              Account details such as your email address, username,
              authentication provider, subscription status, and essential
              security records may be processed when you use Calyx. Conversation
              content is sent to our AI infrastructure only to provide the
              response you request.
            </p>
          </section>
          <section>
            <h2>How information is used</h2>
            <p>
              We use information to authenticate you, deliver the service,
              enforce message limits, prevent abuse, provide support, and
              maintain security. Service providers may process limited
              information on our behalf under their own security and privacy
              commitments.
            </p>
          </section>
          <section>
            <h2>Connected apps</h2>
            <p>
              When you connect an app, Calyx stores its credential encrypted
              and uses it only to retrieve the context you enable. Selected
              app data may be included with an AI request so Calyx can answer
              it. You can disconnect an app at any time to delete its stored
              credential.
            </p>
          </section>
          <section>
            <h2>Your choices</h2>
            <p>
              You may sign out, manage interface preferences locally, or request
              account access or deletion. Contact details for privacy requests
              will be published here when Calyx support email is finalized.
            </p>
          </section>
          <section>
            <h2>Security and retention</h2>
            <p>
              We use reasonable technical and organizational safeguards. No
              internet service can promise absolute security. Information is
              retained only as long as reasonably needed for service, legal, and
              security purposes.
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <h2>Using Calyx</h2>
            <p>
              You must use Calyx lawfully and keep your account secure. You are
              responsible for reviewing outputs before relying on them,
              especially for important decisions.
            </p>
          </section>
          <section>
            <h2>AI output</h2>
            <p>
              AI responses can be incomplete or wrong and are not professional
              advice. Calyx does not guarantee accuracy, availability, or
              fitness for a particular purpose.
            </p>
          </section>
          <section>
            <h2>Plans and billing</h2>
            <p>
              Paid plans renew monthly until cancelled. Published message
              allowances and feature access apply to each plan. Unlimited use
              remains subject to reasonable abuse prevention and upstream
              availability.
            </p>
          </section>
          <section>
            <h2>Acceptable use</h2>
            <p>
              Do not use Calyx to break laws, harm others, interfere with the
              service, bypass access controls, or distribute malicious material.
              Access may be restricted to protect users and the service.
            </p>
          </section>
          <section>
            <h2>Open-source components</h2>
            <p>
              The Calyx frontend and browser extension are offered under the
              license included in their public repository. Hosted service access
              and third-party services remain subject to these terms.
            </p>
          </section>
        </>
      )}
      <p className="legal-note">
        These terms are a practical public-release policy and should be reviewed
        by qualified counsel before commercial launch.
      </p>
    </article>
  );
}

function Pricing({
  onChoose,
  currentPlan,
  signedIn,
}: {
  onChoose: (p: Plan) => void;
  currentPlan: Plan;
  signedIn: boolean;
}) {
  return (
    <section className="page pricing">
      <p className="eyebrow accent">Simple, honest pricing</p>
      <h1>Choose the space you need.</h1>
      <p className="lede">
        Start quietly. Upgrade when your work asks for more.
      </p>
      <div className="plans">
        {plans.map((plan) => {
          const current = signedIn && plan.id === currentPlan;
          return (
            <article
              className={plan.id === "starter" ? "plan featured" : "plan"}
              key={plan.id}
            >
              {plan.id === "starter" && (
                <span className="popular">MOST POPULAR</span>
              )}
              <h2>{plan.name}</h2>
              <p>{plan.note}</p>
              <div className="price">
                {plan.price}
                <small>/ month</small>
              </div>
              <button
                className={current ? "current-plan" : ""}
                disabled={current}
                onClick={() => onChoose(plan.id)}
              >
                {current
                  ? "You are already on this plan."
                  : plan.id === "free"
                    ? "Start free"
                    : `Choose ${plan.name}`}
              </button>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={17} />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="billing-note">
        Visitors without an account can send 10 messages per day. Plans renew
        monthly and can be cancelled at any time. Unlimited is subject to
        reasonable abuse prevention and upstream provider availability.
      </p>
    </section>
  );
}
function Work() {
  return (
    <section className="page work">
      <div className="work-copy">
        <p className="eyebrow accent">Calyx Work</p>
        <h1>Turn a conversation into action.</h1>
        <p className="lede">
          A focused task canvas and open-source Chrome extension for browser
          work you approve step by step.
        </p>
        <div className="work-list">
          <div>
            <Search />
            <span>
              <strong>Research with context</strong>
              <small>
                Collect and organize useful pages from the active tab.
              </small>
            </span>
          </div>
          <div>
            <Chrome />
            <span>
              <strong>Browser actions, with consent</strong>
              <small>Preview every proposed action before it runs.</small>
            </span>
          </div>
          <div>
            <Cpu />
            <span>
              <strong>Local-first control bridge</strong>
              <small>
                No silent background control and no broad host permissions.
              </small>
            </span>
          </div>
        </div>
        <a
          className="primary inline"
          href="https://github.com/UmarErth/calyxai/tree/main/extension"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} /> View extension source
        </a>
      </div>
      <div className="task-card">
        <div className="task-top">
          <span>Task preview</span>
          <span className="live">
            <i /> Ready
          </span>
        </div>
        <h3>Compare project management tools</h3>
        <div className="task-step done">
          <Check /> Read the current page
        </div>
        <div className="task-step current">
          <Sparkles /> Extract requirements
        </div>
        <div className="task-step">
          <Chrome /> Open approved comparison tabs
        </div>
        <button>Review next action</button>
      </div>
    </section>
  );
}

export default App;
