import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "github" | "cloudflare" | "notion" | "slack" | "google_drive" | "linear" | "custom";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
};

const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function encryptionKey() {
  const secret = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Integration encryption is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  return { encrypted: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function decrypt(encrypted: string, iv: string) {
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await encryptionKey(), base64ToBytes(encrypted));
  return new TextDecoder().decode(clear);
}

function safeCustomUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:") throw new Error("Custom apps must use HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error("Private network addresses are not allowed");
  }
  return url;
}

async function providerFetch(provider: Provider, token: string, config: Record<string, unknown>, mode: "verify" | "context") {
  let url = "";
  let init: RequestInit = { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } };
  if (provider === "github") url = mode === "verify" ? "https://api.github.com/user" : "https://api.github.com/user/repos?sort=updated&per_page=12";
  if (provider === "cloudflare") url = mode === "verify" ? "https://api.cloudflare.com/client/v4/user/tokens/verify" : "https://api.cloudflare.com/client/v4/accounts?per_page=12";
  if (provider === "notion") {
    url = mode === "verify" ? "https://api.notion.com/v1/users/me" : "https://api.notion.com/v1/search";
    init = { method: mode === "verify" ? "GET" : "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" }, body: mode === "context" ? JSON.stringify({ page_size: 12 }) : undefined };
  }
  if (provider === "slack") url = mode === "verify" ? "https://slack.com/api/auth.test" : "https://slack.com/api/conversations.list?limit=12&exclude_archived=true";
  if (provider === "google_drive") url = "https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,modifiedTime,webViewLink)";
  if (provider === "linear") {
    url = "https://api.linear.app/graphql";
    const query = mode === "verify" ? "query { viewer { id name email } }" : "query { viewer { id name } issues(first: 12) { nodes { id identifier title state { name } url updatedAt } } }";
    init = { method: "POST", headers: { Accept: "application/json", Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify({ query }) };
  }
  if (provider === "custom") {
    const base = safeCustomUrl(String(config.baseUrl || ""));
    const path = String(mode === "verify" ? config.healthPath || "/" : config.contextPath || config.healthPath || "/");
    const allowedPaths = Array.isArray(config.allowedPaths) ? config.allowedPaths.map(String) : ["/"];
    if (!path.startsWith("/") || !allowedPaths.some((prefix) => path.startsWith(prefix))) throw new Error("Custom app path is not allowed by its manifest");
    url = new URL(path, base).toString();
    const headerName = String(config.authHeader || "Authorization");
    const prefix = String(config.authPrefix ?? "Bearer ");
    init = { headers: { Accept: "application/json", [headerName]: `${prefix}${token}` } };
  }
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  const payload = await response.json().catch(() => ({ status: response.status }));
  if (!response.ok || (provider === "slack" && payload?.ok === false) || (provider === "cloudflare" && payload?.success === false)) throw new Error("The provider rejected this credential");
  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Sign in required" }, 401);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "list") {
      const { data, error } = await admin.from("user_integrations").select("id,provider,name,config,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return json({ integrations: data || [] });
    }

    if (action === "connect") {
      const provider = String(body.provider || "") as Provider;
      const supported: Provider[] = ["github", "cloudflare", "notion", "slack", "google_drive", "linear", "custom"];
      if (!supported.includes(provider)) return json({ error: "Unsupported provider" }, 400);
      const token = String(body.token || "").trim();
      const name = String(body.name || provider).trim().slice(0, 80);
      const config = typeof body.config === "object" && body.config ? body.config as Record<string, unknown> : {};
      if (token.length < 8) return json({ error: "A valid credential is required" }, 400);
      if (provider === "custom") safeCustomUrl(String(config.baseUrl || ""));
      await providerFetch(provider, token, config, "verify");
      const secret = await encrypt(token);
      const { data, error } = await admin.from("user_integrations").upsert({ user_id: user.id, provider, name, encrypted_secret: secret.encrypted, secret_iv: secret.iv, config, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider,name" }).select("id,provider,name,config,created_at,updated_at").single();
      if (error) throw error;
      return json({ integration: data });
    }

    if (action === "disconnect") {
      const id = String(body.id || "");
      const { error } = await admin.from("user_integrations").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      return json({ disconnected: true });
    }

    if (action === "context") {
      const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 6) : [];
      let query = admin.from("user_integrations").select("id,provider,name,config,encrypted_secret,secret_iv").eq("user_id", user.id).limit(6);
      if (ids.length) query = query.in("id", ids);
      const { data, error } = await query;
      if (error) throw error;
      const results = [];
      for (const item of data || []) {
        try {
          const token = await decrypt(item.encrypted_secret, item.secret_iv);
          results.push({ id: item.id, provider: item.provider, name: item.name, data: await providerFetch(item.provider as Provider, token, item.config || {}, "context") });
        } catch {
          results.push({ id: item.id, provider: item.provider, name: item.name, error: "Connection needs attention" });
        }
      }
      return json({ context: results });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("app-integrations", error instanceof Error ? error.message : error);
    return json({ error: "Oops, that's an error from our side." }, 500);
  }
});
