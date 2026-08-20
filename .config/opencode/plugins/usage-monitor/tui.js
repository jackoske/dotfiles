// @bun
// src/tui.ts
import { watch } from "fs";
import { createElement, insert, setProp } from "@opentui/solid";
import { createSignal } from "solid-js";

// src/config.ts
import { homedir } from "os";
var HOME = homedir() ?? "";
var CONFIG_PATH = `${HOME}/.config/opencode/usage-monitor.json`;
var OMO_CONFIG_PATH = `${HOME}/.config/opencode/oh-my-openagent.json`;
var CONFIG_DEFAULTS = {
  enabled: true,
  default_collapsed: false,
  refresh_ms: 60000,
  request_timeout_ms: 15000,
  show_openai: true,
  show_zai: true,
  show_deepseek: true,
  show_details: false,
  default_provider_collapsed: true,
  debug: false,
  width: 34,
  symbols: "unicode",
  max_detail_lines: 4,
  max_windows: 3,
  max_model_lines: 1,
  refresh_keybind: "<leader>q",
  zai_organization_id: "",
  zai_project_id: ""
};
function configFingerprint(config) {
  return JSON.stringify(Object.entries(config).sort(([left], [right]) => left.localeCompare(right)));
}

// src/credentials.ts
import { randomUUID } from "crypto";

// src/auth.ts
import { homedir as homedir2 } from "os";
import { isAbsolute } from "path";
var HOME2 = homedir2() ?? "";
var AUTH_STRING_FIELDS = [
  "type",
  "key",
  "apiKey",
  "api_key",
  "token",
  "accessToken",
  "auth_token",
  "access",
  "refresh",
  "accountId"
];
function extractToken(entry) {
  if (!entry)
    return;
  return entry.key || entry.apiKey || entry.api_key || entry.token || entry.accessToken || entry.auth_token || entry.access || undefined;
}
function findOpenCodeAuthPaths(options = {}) {
  const home = options.home ?? HOME2;
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const candidates = platform === "win32" ? [
    absoluteBase(env.LOCALAPPDATA, platform) ? `${env.LOCALAPPDATA}/opencode/auth.json` : undefined,
    absoluteBase(env.APPDATA, platform) ? `${env.APPDATA}/opencode/auth.json` : undefined,
    absoluteBase(home, platform) ? `${home}/.opencode/auth.json` : undefined
  ] : [
    absoluteBase(env.XDG_DATA_HOME, platform) ? `${env.XDG_DATA_HOME}/opencode/auth.json` : undefined,
    absoluteBase(home, platform) ? `${home}/.local/share/opencode/auth.json` : undefined,
    absoluteBase(env.XDG_CONFIG_HOME, platform) ? `${env.XDG_CONFIG_HOME}/opencode/auth.json` : undefined,
    absoluteBase(home, platform) ? `${home}/.config/opencode/auth.json` : undefined,
    absoluteBase(home, platform) ? `${home}/.opencode/auth.json` : undefined
  ];
  return Object.freeze([
    ...new Set(candidates.filter((path) => typeof path === "string" && path.length > 0))
  ]);
}
function absoluteBase(path, platform) {
  if (!path)
    return false;
  if (platform === "win32")
    return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\");
  return isAbsolute(path);
}
async function readAuthFile(options = {}) {
  const candidates = options.candidates ?? findOpenCodeAuthPaths();
  const readText = options.readText ?? readBunText;
  const fallbackPath = candidates[0] ?? `${HOME2}/.local/share/opencode/auth.json`;
  for (const path of candidates) {
    try {
      const result = await readText(path);
      if (!result.exists)
        continue;
      return parseAuthJson(result.text, path);
    } catch (_error) {
      return invalidAuthState(path);
    }
  }
  return { kind: "missing", path: fallbackPath };
}
function parseAuthJson(text, path) {
  try {
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed))
      return invalidAuthState(path);
    return { kind: "loaded", path, auth: sanitizeAuthJson(parsed) };
  } catch (_error) {
    return invalidAuthState(path);
  }
}
async function readOpenCodeEntry(entry, options = {}) {
  const state = await readAuthFile(options);
  if (state.kind === "missing")
    return;
  if (state.kind === "invalid")
    throw new Error("OpenCode auth file is invalid");
  return toOpenCodeCredential(entry, asAuthEntry(state.auth[entry]));
}
async function readBunText(path) {
  const file = Bun.file(path);
  if (!await file.exists())
    return { exists: false };
  return { exists: true, text: await file.text() };
}
function toOpenCodeCredential(entryName, entry) {
  if (entryName === "openai")
    return entry ? toOpenAIOpenCodeCredential(entry) : undefined;
  const secret = extractToken(entry);
  if (!secret || !entry)
    return;
  return Object.freeze({ secret, metadata: authEntryMetadata(entry) });
}
function toOpenAIOpenCodeCredential(entry) {
  const credential = discoverOpenAICredential({ openai: entry });
  if (!("token" in credential))
    return;
  return Object.freeze({
    secret: credential.token,
    metadata: Object.freeze({
      type: "oauth",
      accountId: credential.accountId,
      expires: String(credential.expires)
    })
  });
}
function authEntryMetadata(entry) {
  return Object.freeze({
    ...entry.metadata ?? {},
    ...entry.type ? { type: entry.type } : {},
    ...entry.accountId ? { accountId: entry.accountId } : {},
    ...typeof entry.expires === "number" ? { expires: String(entry.expires) } : {}
  });
}
function discoverOpenAICredential(auth, _env = process.env) {
  const openai = asAuthEntry(auth.openai);
  const accessToken = openai?.access;
  const accountId = openai?.accountId;
  const expires = openai?.expires;
  if (openai?.type !== "oauth")
    return { message: "auth missing" };
  if (typeof accessToken === "string" && accessToken.length > 0 && typeof accountId === "string" && accountId.length > 0 && typeof expires === "number" && expires > Date.now()) {
    return { token: accessToken, accountId, expires };
  }
  return { message: "auth missing" };
}
function discoverDeepseekCredential(auth, env = process.env) {
  const deepseek = extractToken(asAuthEntry(auth.deepseek));
  if (deepseek)
    return { token: deepseek };
  const apiKey = env.DEEPSEEK_API_KEY;
  if (apiKey)
    return { token: apiKey };
  return { message: "auth missing" };
}
function discoverZaiCredential(auth, env = process.env) {
  const zaiCodingPlan = extractToken(asAuthEntry(auth["zai-coding-plan"]));
  if (zaiCodingPlan)
    return { token: zaiCodingPlan, baseUrl: "https://api.z.ai" };
  const zai = extractToken(asAuthEntry(auth.zai));
  if (zai)
    return { token: zai, baseUrl: "https://api.z.ai" };
  const zhipu = extractToken(asAuthEntry(auth.zhipu));
  if (zhipu)
    return { token: zhipu, baseUrl: "https://open.bigmodel.cn" };
  const zaiEnv = env.ZAI_API_KEY;
  if (zaiEnv)
    return { token: zaiEnv, baseUrl: "https://api.z.ai" };
  const zaiCodingPlanEnv = env.ZAI_CODING_PLAN_API_KEY;
  if (zaiCodingPlanEnv)
    return { token: zaiCodingPlanEnv, baseUrl: "https://api.z.ai" };
  const zhipuEnv = env.ZHIPU_API_KEY;
  if (zhipuEnv)
    return { token: zhipuEnv, baseUrl: "https://open.bigmodel.cn" };
  const zhipuaiEnv = env.ZHIPUAI_API_KEY;
  if (zhipuaiEnv)
    return { token: zhipuaiEnv, baseUrl: "https://open.bigmodel.cn" };
  return { message: "auth missing" };
}
function sanitizeAuthJson(value) {
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const sanitized = sanitizeAuthEntry(entry);
    return sanitized ? [[key, sanitized]] : [];
  }));
}
function sanitizeAuthEntry(value) {
  if (!isPlainObject(value))
    return;
  const strings = AUTH_STRING_FIELDS.flatMap((field) => typeof value[field] === "string" ? [[field, value[field]]] : []);
  const metadata = sanitizeStringRecord(value.metadata);
  const expires = typeof value.expires === "number" && Number.isFinite(value.expires) ? [["expires", value.expires]] : [];
  return Object.fromEntries([
    ...strings,
    ...expires,
    ...metadata ? [["metadata", metadata]] : []
  ]);
}
function sanitizeStringRecord(value) {
  if (!isPlainObject(value))
    return;
  const entries = Object.entries(value).flatMap(([key, item]) => typeof item === "string" ? [[key, item]] : []);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
function asAuthEntry(value) {
  return sanitizeAuthEntry(value);
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function invalidAuthState(path) {
  return { kind: "invalid", path, error: "OpenCode auth file is invalid" };
}

// src/sanitize.ts
var SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /sk-proj-[a-zA-Z0-9_-]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{10,}/g,
  /key[=:]\s*[a-zA-Z0-9._-]{10,}/gi,
  /token[=:]\s*[a-zA-Z0-9._-]{10,}/gi,
  /api[_-]?key[=:]\s*[a-zA-Z0-9._-]{10,}/gi,
  /Authorization:\s*(?:Bearer\s+)?\S+/gi
];
function looksSecretKey(key) {
  const lower = key.toLowerCase();
  return /authorization|secret|password|credential|api[_-]?key|auth[_-]?token|access[_-]?token/.test(lower) || /(^|[_-])(key|token)($|[_-])/.test(lower);
}
function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  let sanitized = message;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }
  return sanitized.split(`
`)[0] ?? "error";
}
function sanitizeCredentialError(error, credential) {
  const message = error instanceof Error ? error.message : String(error);
  const redacted = credential.length > 0 ? message.split(credential).join("[redacted]") : message;
  return sanitizeError(redacted);
}
function hasSecretPattern(value) {
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    const matched = pattern.test(value);
    pattern.lastIndex = 0;
    if (matched)
      return true;
  }
  return false;
}

// src/credentials.ts
var METADATA_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var METADATA_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
var SAFE_CREDENTIAL_METADATA_KEYS = new Set(["credential_variant"]);
function createCredentialResolver(readers = defaultCredentialSourceReaders()) {
  let states = new Map;
  let sequences = new Map;
  let accountScopes = new Map;
  let disposed = false;
  const resolve = async (registration, reference) => {
    if (disposed)
      return resolutionError("source", "Credential resolver is disposed", 0);
    const identity = referenceIdentity(registration.metadata.id, reference);
    const sequence = (sequences.get(identity) ?? 0) + 1;
    sequences = new Map(sequences).set(identity, sequence);
    const selection = selectCandidates(registration, reference);
    if (!selection.ok)
      return resolutionError("config", selection.message, states.get(identity)?.epoch ?? 0);
    const resolved = await resolveCandidates(selection.candidates, readers, () => disposed);
    if (disposed)
      return resolutionError("source", "Credential resolver is disposed", 0);
    if (sequences.get(identity) !== sequence) {
      return resolutionError("superseded", "Credential resolution was superseded", states.get(identity)?.epoch ?? 0);
    }
    if (resolved.kind === "source-error") {
      const next2 = nextUnavailableState(states.get(identity), "source-error");
      states = new Map(states).set(identity, next2);
      return resolutionError("source", "Unable to read credential source", next2.epoch);
    }
    const next = nextCredentialState(states.get(identity), resolved);
    states = new Map(states).set(identity, next);
    if (next.status !== "resolved")
      return resolutionError("missing", "Credential is missing", next.epoch);
    const accountScope = accountScopes.get(identity) ?? randomUUID();
    if (!accountScopes.has(identity))
      accountScopes = new Map(accountScopes).set(identity, accountScope);
    return Object.freeze({
      ok: true,
      accountScope,
      lease: Object.freeze({
        secret: next.secret,
        source: next.source,
        variant: next.variant,
        epoch: next.epoch,
        ...next.metadata ? { metadata: next.metadata } : {}
      })
    });
  };
  const dispose = () => {
    disposed = true;
    states = new Map;
    sequences = new Map;
    accountScopes = new Map;
  };
  return Object.freeze({ resolve, dispose });
}
function createNonSecretAccountMetadataReader(metadata, allowedKeys) {
  const issue = validateMetadata(metadata, allowedKeys);
  if (issue)
    return { ok: false, issues: Object.freeze([issue]) };
  const selected = Object.freeze(Object.fromEntries(allowedKeys.flatMap((key) => typeof metadata[key] === "string" ? [[key, metadata[key]]] : [])));
  return {
    ok: true,
    value: Object.freeze({
      readAccountIdentifier: (key) => allowedKeys.includes(key) ? selected[key] : undefined
    })
  };
}
function defaultCredentialSourceReaders() {
  return Object.freeze({
    readOpenCodeEntry,
    readEnv: (name) => process.env[name]
  });
}
function selectCandidates(registration, reference) {
  const { allowedSources, defaultCandidates } = registration.credentialPolicy;
  if (defaultCandidates.some((candidate2) => !allowedSources.includes(candidate2.source))) {
    return { ok: false, message: "Credential policy is inconsistent" };
  }
  if (!reference)
    return { ok: true, candidates: defaultCandidates };
  if (!allowedSources.includes(reference.source)) {
    return { ok: false, message: "Credential reference is not allowed" };
  }
  const name = reference.source === "env" ? reference.name : reference.entry;
  const candidate = defaultCandidates.find((item) => item.source === reference.source && item.name === name);
  return candidate ? { ok: true, candidates: [candidate] } : { ok: false, message: "Credential reference is not allowed" };
}
async function resolveCandidates(candidates, readers, isDisposed) {
  for (const candidate of candidates) {
    if (isDisposed())
      return { kind: "missing" };
    const read = await readCandidate(candidate, readers);
    if (isDisposed())
      return { kind: "missing" };
    if (read.kind === "source-error")
      return read;
    if (read.kind === "found")
      return { ...read, candidate };
  }
  return { kind: "missing" };
}
async function readCandidate(candidate, readers) {
  try {
    const read = candidate.source === "env" ? await readers.readEnv(candidate.name) : await readers.readOpenCodeEntry(candidate.name);
    const credential = normalizeCredentialRead(read);
    return credential ? { kind: "found", ...credential } : { kind: "missing" };
  } catch (_error) {
    return { kind: "source-error" };
  }
}
function normalizeCredentialRead(read) {
  if (typeof read === "string")
    return read.length > 0 ? { secret: read } : undefined;
  if (!read || read.secret.length === 0)
    return;
  const metadata = sanitizeCredentialMetadata(read.metadata);
  return Object.freeze({
    secret: read.secret,
    ...metadata ? { metadata } : {}
  });
}
function sanitizeCredentialMetadata(metadata) {
  const allowed = new Set([
    "accountId",
    "type",
    "expires",
    "credential_variant"
  ]);
  const entries = Object.entries(metadata).filter(([key, value]) => allowed.has(key) && METADATA_KEY_PATTERN.test(key) && METADATA_VALUE_PATTERN.test(value) && !hasSecretPattern(value));
  return entries.length > 0 ? Object.freeze(Object.fromEntries(entries)) : undefined;
}
function nextCredentialState(previous, resolved) {
  if (resolved.kind === "missing") {
    return nextUnavailableState(previous, "missing");
  }
  if (sameCredential(previous, resolved))
    return previous;
  return Object.freeze({
    status: "resolved",
    source: resolved.candidate.source,
    variant: resolved.candidate.variant,
    secret: resolved.secret,
    ...resolved.metadata ? { metadata: resolved.metadata } : {},
    epoch: (previous?.epoch ?? 0) + 1
  });
}
function nextUnavailableState(previous, status) {
  if (previous?.status === status)
    return previous;
  return Object.freeze({ status, epoch: (previous?.epoch ?? 0) + 1 });
}
function sameCredential(previous, resolved) {
  return previous?.status === "resolved" && previous.source === resolved.candidate.source && previous.variant === resolved.candidate.variant && previous.secret === resolved.secret && JSON.stringify(previous.metadata ?? {}) === JSON.stringify(resolved.metadata ?? {});
}
function referenceIdentity(providerId, reference) {
  if (!reference)
    return JSON.stringify([providerId, "default"]);
  const name = reference.source === "env" ? reference.name : reference.entry;
  return JSON.stringify([providerId, "explicit", reference.source, name]);
}
function resolutionError(kind, message, epoch) {
  return Object.freeze({ ok: false, kind, message, epoch });
}
function validateMetadata(metadata, allowedKeys) {
  for (const key of allowedKeys) {
    if (!METADATA_KEY_PATTERN.test(key) || looksSecretKey(key) && !SAFE_CREDENTIAL_METADATA_KEYS.has(key)) {
      return metadataIssue(key, "Metadata key is not allowed");
    }
    const value = metadata[key];
    if (value !== undefined && (typeof value !== "string" || !METADATA_VALUE_PATTERN.test(value) || hasSecretPattern(value))) {
      return metadataIssue(key, "Metadata value is invalid");
    }
  }
  return;
}
function metadataIssue(key, message) {
  const safeKey = METADATA_KEY_PATTERN.test(key) ? key : "metadata";
  return Object.freeze({ path: `metadata.${safeKey}`, message });
}

// src/layout.ts
function sanitizeLine(value) {
  return value.replace(/[\r\n]/g, " ");
}
function truncateTo(value, width) {
  const normalizedWidth = Math.max(0, width);
  const line = sanitizeLine(value);
  if (normalizedWidth <= 0)
    return "";
  if (line.length <= normalizedWidth)
    return line;
  if (normalizedWidth === 1)
    return "\u2026";
  return `${line.slice(0, normalizedWidth - 1)}\u2026`;
}
function truncateSmart(value, width) {
  const normalizedWidth = Math.max(0, width);
  let line = sanitizeLine(value);
  if (line.length <= normalizedWidth)
    return line;
  while (line.includes(" \xB7 ")) {
    const lastSeparator = line.lastIndexOf(" \xB7 ");
    if (lastSeparator <= 0)
      break;
    line = line.slice(0, lastSeparator);
    if (line.length <= normalizedWidth)
      return line;
  }
  return truncateTo(line, normalizedWidth);
}
function padRight(value, width) {
  const normalizedWidth = Math.max(0, width);
  return truncateTo(value, normalizedWidth).padEnd(normalizedWidth, " ");
}
function formatHeaderLine(left, right, width) {
  const normalizedWidth = Math.max(0, width);
  const leftLine = sanitizeLine(left);
  const rightLine = sanitizeLine(right);
  if (normalizedWidth <= 0)
    return "";
  if (rightLine.length >= normalizedWidth)
    return truncateTo(rightLine, normalizedWidth);
  const leftBudget = Math.max(0, normalizedWidth - rightLine.length);
  const safeLeft = leftLine.length > leftBudget ? truncateTo(leftLine, leftBudget) : leftLine;
  const padding = " ".repeat(Math.max(0, normalizedWidth - safeLeft.length - rightLine.length));
  return `${safeLeft}${padding}${rightLine}`;
}
function formatAge(timestampMs, nowMs = Date.now()) {
  const diffMs = nowMs - timestampMs;
  if (diffMs < 0)
    return "now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60)
    return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
function formatReset(resetAtMs, nowMs = Date.now()) {
  if (resetAtMs === undefined)
    return "";
  const diffMs = resetAtMs - nowMs;
  if (diffMs <= 0)
    return "reset now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60)
    return `reset ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return `reset ${hours}h`;
  return `reset ${Math.floor(hours / 24)}d`;
}
function formatPercent(value) {
  if (value === undefined)
    return "";
  return `${Math.round(value)}%`;
}
function formatTokens(count) {
  const abs = Math.abs(count);
  if (abs < 1000)
    return String(count);
  if (abs < 1e6)
    return formatCompact(count, 1000, "K");
  if (abs < 1e9)
    return formatCompact(count, 1e6, "M");
  return formatCompact(count, 1e9, "B");
}
function formatCurrency(value, currency) {
  if (value === undefined || !Number.isFinite(value))
    return;
  const symbol = currency === "CNY" ? "\xA5" : currency ? `${currency} ` : "";
  return `${symbol}${value.toFixed(2)}`;
}
function metricLabelWidth(metrics) {
  const maxLabel = metrics.reduce((max, metric) => Math.max(max, sanitizeLine(metric.label).length), 0);
  return Math.min(10, Math.max(4, maxLabel));
}
function formatMetricLine(label, value, labelWidth, totalWidth) {
  const safeLabel = padRight(label, labelWidth);
  return truncateSmart(`    ${safeLabel}  ${sanitizeLine(value)}`, totalWidth);
}
function formatProviderTitleLine(title, collapsed, summary, width) {
  const indicator = collapsed ? "\u25B6" : "\u25BC";
  const left = `${indicator} ${sanitizeLine(title)}`;
  if (summary === undefined || summary.length === 0)
    return truncateTo(left, width);
  return formatHeaderLine(left, summary, width);
}
function toneToSeverity(tone) {
  if (tone === "warn")
    return "warning";
  if (tone === "bad")
    return "critical";
  if (tone === "muted")
    return "muted";
  return "normal";
}
function formatCompact(value, divisor, suffix) {
  const compact = value / divisor;
  return Number.isInteger(compact) ? `${compact}${suffix}` : `${compact.toFixed(1)}${suffix}`;
}

// src/severity.ts
function isLimitReached(window) {
  return window.limitReached === true || (window.percentage ?? 0) >= 100 || window.remaining === 0;
}
function getWindowSeverity(window) {
  if (isLimitReached(window))
    return "critical";
  if ((window.percentage ?? 0) >= 75)
    return "warning";
  return "normal";
}

// src/views/common.ts
function statusView(provider, missingAuthSummary = "needs auth") {
  if (provider.status === "ready" || provider.status === "partial")
    return;
  const summary = provider.status === "missing-auth" ? missingAuthSummary : provider.errorMessage ?? provider.statusText ?? provider.status;
  return {
    id: provider.id,
    title: provider.displayName,
    status: toViewStatus(provider.status),
    summary,
    metrics: [{ key: "status", label: "status", value: summary, tone: "muted", priority: 100, compact: true }],
    fetchedAt: provider.lastGoodAt ?? provider.fetchedAt
  };
}
function toViewStatus(status) {
  if (status === "loading")
    return "partial";
  return status;
}
function windowMetric(window, priority) {
  return {
    key: `window-${window.id}`,
    label: window.label,
    value: windowValue(window),
    tone: severityTone(window.severity ?? getWindowSeverity(window)),
    priority,
    compact: true
  };
}
function windowValue(window) {
  const main = formatCanonicalUsage(window) || formatPercent(window.percentage) || formatMoneyWindow(window) || formatUsedLimit(window) || window.budgetLabel || "n/a";
  const suffix = [window.resetLabel ?? formatReset(window.resetAt)].filter((part) => part !== undefined && part.length > 0);
  return [main, ...suffix].join(" \xB7 ");
}
function providerDetailsToMetrics(details) {
  return (details ?? []).map((detail, index) => ({
    key: detail.visibility === "debug" ? `debug-${detail.key}` : detail.key,
    label: detail.label,
    value: detailValueToString(detail.value),
    priority: detail.priority ?? 50 - index,
    ...detail.tone ? { tone: detail.tone } : {},
    ...detail.visibility === "summary" ? { compact: true } : { detailOnly: true }
  }));
}
function formatMoneyWindow(window) {
  if (window.kind !== "credits" && window.kind !== "cost")
    return;
  return formatCurrency(window.currentValue, window.unitLabel);
}
function splitMetricValue(fullValue) {
  const dotIndex = fullValue.indexOf(" \xB7 ");
  if (dotIndex === -1)
    return { main: fullValue };
  const potentialSuffix = fullValue.slice(dotIndex + 3);
  if (potentialSuffix.startsWith("reset ")) {
    return { main: fullValue.slice(0, dotIndex), suffix: potentialSuffix };
  }
  return { main: fullValue };
}
function metricSummary(metrics, maxCount = 2) {
  const parts = [...metrics].filter((metric) => metric.compact === true && metric.detailOnly !== true).sort((left, right) => right.priority - left.priority).slice(0, maxCount).map((metric) => metric.key === "plan" ? metric.value : `${metric.label} ${metric.value.split(" \xB7 ")[0] ?? metric.value}`);
  return parts.length > 0 ? parts.join(" \xB7 ") : undefined;
}
function stringMetric(key, label, value, priority, options = {}) {
  const formatted = formatUnknown(value);
  if (formatted === undefined || formatted.length === 0)
    return;
  return { key, label, value: formatted, priority, ...options };
}
function formatUnknown(value) {
  if (typeof value === "string")
    return value;
  if (typeof value === "number" && Number.isFinite(value))
    return formatTokens(value);
  if (typeof value === "boolean")
    return value ? "yes" : "no";
  if (Array.isArray(value))
    return `items[${value.length}]`;
  if (value && typeof value === "object")
    return `props[${Object.keys(value).length}]`;
  return;
}
function formatCanonicalUsage(window) {
  if (!window.usage)
    return;
  if (window.usage.kind === "percent")
    return formatPercent(window.usage.usedPercent);
  return `${formatTokens(window.usage.used)}/${formatTokens(window.usage.limit)} ${window.usage.unit}`;
}
function detailValueToString(value) {
  if (value.kind === "text")
    return value.value;
  if (value.kind === "flag")
    return value.value ? "yes" : "no";
  if (value.kind === "currency")
    return formatCurrency(value.value, value.currency) ?? String(value.value);
  const formatted = formatTokens(value.value);
  return value.unit ? `${formatted} ${value.unit}` : formatted;
}
function severityTone(severity) {
  if (severity === "critical")
    return "bad";
  if (severity === "warning")
    return "warn";
  if (severity === "muted")
    return "muted";
  return "good";
}
function formatUsedLimit(window) {
  if (window.used !== undefined && window.limit !== undefined) {
    return `${formatTokens(window.used)}/${formatTokens(window.limit)}${window.unitLabel ? ` ${window.unitLabel}` : ""}`;
  }
  if (window.remaining !== undefined)
    return `${formatTokens(window.remaining)} left`;
  if (window.currentValue !== undefined)
    return `${formatTokens(window.currentValue)} current`;
  return;
}

// src/format.ts
var DEBUG_METRIC_PREFIXES = ["debug-", "raw-"];
var DEBUG_METRIC_KEYS = new Set([
  "has_credits",
  "provider-base-url",
  "debug-provider-base-url",
  "approx"
]);
var COMPACT_SUMMARY_WINDOW_PRIORITY = ["5h", "day", "week", "month"];
function formatProviderTitle(view, collapsed, width) {
  return {
    text: formatProviderTitleLine(view.title, collapsed, collapsed ? view.summary : undefined, width),
    severity: providerTitleSeverity(view)
  };
}
function formatProviderMetricsForState(view, config, width, showDetails) {
  if (!showDetails) {
    const baseMetrics = view.metrics.filter((metric) => metric.key.startsWith("window-") || shouldShowBaseSummaryMetric(metric, config));
    const labelWidth2 = metricLabelWidth(baseMetrics);
    return baseMetrics.map((metric) => formatMetric(metric, labelWidth2, width));
  }
  const windowMetrics = view.metrics.filter((metric) => metric.key.startsWith("window-"));
  const detailMetrics = [...view.metrics, ...view.details ?? []].filter((metric) => {
    if (metric.key.startsWith("window-"))
      return false;
    if (metric.detailOnly === true && !showDetails)
      return false;
    if (isDebugMetric(metric) && !config.debug)
      return false;
    return true;
  });
  const allVisible = [...windowMetrics, ...detailMetrics];
  const labelWidth = metricLabelWidth(allVisible);
  return allVisible.map((metric) => {
    const isDetail = !metric.key.startsWith("window-");
    const line = formatMetric(metric, labelWidth, width);
    return isDetail ? { ...line, severity: "muted" } : line;
  });
}
function formatCollapsedSummary(view, width) {
  const summary = compactSummary(view.metrics) ?? view.summary ?? view.status;
  return {
    text: formatProviderTitleLine(view.title, true, summary, width),
    severity: providerTitleSeverity(view)
  };
}
function formatHeader(providerCount, right, collapsed, width, symbols) {
  const indicator = collapsed ? symbols === "ascii" ? ">" : "\u25B6" : symbols === "ascii" ? "v" : "\u25BC";
  const headerRight = collapsed ? `${providerCount}p ${right}`.trim() : right;
  return {
    text: formatHeaderLine(`${indicator} Usage`, headerRight, width),
    severity: "normal"
  };
}
function shouldShowBaseSummaryMetric(metric, config) {
  if (metric.detailOnly === true)
    return false;
  if (metric.compact !== true)
    return false;
  if (isDebugMetric(metric) && !config.debug)
    return false;
  return true;
}
function isDebugMetric(metric) {
  return DEBUG_METRIC_KEYS.has(metric.key) || DEBUG_METRIC_KEYS.has(metric.label) || DEBUG_METRIC_PREFIXES.some((prefix) => metric.key.startsWith(prefix));
}
function compactSummary(metrics) {
  const windowMetrics = [...metrics].filter((candidate) => candidate.key.startsWith("window-") && candidate.compact === true && candidate.detailOnly !== true).sort((left, right) => right.priority - left.priority);
  const priorityMetric = COMPACT_SUMMARY_WINDOW_PRIORITY.map((label) => windowMetrics.find((candidate) => candidate.label === label)).find((candidate) => candidate !== undefined);
  const summaryMetrics = [...metrics].filter((candidate) => !candidate.key.startsWith("window-") && candidate.compact === true && candidate.detailOnly !== true).sort((left, right) => right.priority - left.priority);
  const metric = priorityMetric ?? windowMetrics[0] ?? summaryMetrics[0];
  if (metric === undefined)
    return;
  return `${metric.label} ${metric.value}`;
}
function formatMetric(metric, labelWidth, width) {
  const { main, suffix } = splitMetricValue(metric.value);
  const text = formatMetricLine(metric.label, main, labelWidth, width);
  const suffixBudget = suffix === undefined ? 0 : Math.max(0, width - text.length - 3);
  const visibleSuffix = suffixBudget > 0 && suffix !== undefined ? truncateTo(suffix, suffixBudget) : undefined;
  return {
    text,
    severity: toneToSeverity(metric.tone),
    ...visibleSuffix === undefined ? {} : { suffix: visibleSuffix }
  };
}
function providerTitleSeverity(view) {
  if (view.status === "error")
    return "muted";
  if (view.status === "missing-auth")
    return "muted";
  if (view.status === "stale" || view.stale === true)
    return "muted";
  return "warning";
}

// src/provider-cache.ts
import { createHash, randomUUID as randomUUID2 } from "crypto";
import {
  chmodSync,
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "fs";
import { tmpdir } from "os";
import { isAbsolute as isAbsolute2, join, relative, resolve, sep } from "path";

// src/snapshot-validation.ts
var MAX_SNAPSHOT_BYTES = 256 * 1024;
var MAX_VALUE_DEPTH = 10;
var MAX_VALUE_NODES = 5000;
var SUCCESS_STATUSES = new Set(["ready", "partial"]);
var WINDOW_KINDS = new Set([
  "rolling",
  "daily",
  "weekly",
  "monthly",
  "billing",
  "tokens",
  "requests",
  "credits",
  "cost",
  "unknown"
]);
var SEVERITIES = new Set(["normal", "warning", "critical", "muted"]);
var DETAIL_VISIBILITIES = new Set(["summary", "detail", "debug"]);
var DETAIL_TONES = new Set(["normal", "muted", "good", "warn", "bad"]);
function validateAndCloneUsageSnapshot(snapshot, providerId, options = {}) {
  try {
    const detached = detachJsonValue(snapshot, 0, 0, options.credential ?? "");
    if (detached.credential)
      return { ok: false, reason: "credential" };
    if (!detached.valid || !isPlainRecord(detached.value))
      return { ok: false, reason: "invalid" };
    const candidate = options.fetchedAt === undefined ? detached.value : Object.freeze({ ...detached.value, fetchedAt: options.fetchedAt });
    if (!isFinalSnapshotSizeValid(candidate))
      return { ok: false, reason: "invalid" };
    if (!isSuccessfulSnapshot(candidate, providerId))
      return { ok: false, reason: "invalid" };
    return { ok: true, snapshot: deepFreeze(candidate) };
  } catch (_error) {
    return { ok: false, reason: "invalid" };
  }
}
function isSecretBearingKey(key) {
  if (key === "key")
    return false;
  const normalized = key.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return looksSecretKey(key) || [
    "token",
    "secret",
    "credential",
    "password",
    "session",
    "cookie",
    "authorization",
    "privatekey",
    "clientsecret"
  ].some((fragment) => normalized.includes(fragment));
}
function detachJsonValue(value, depth, nodes, credential) {
  if (depth > MAX_VALUE_DEPTH || nodes >= MAX_VALUE_NODES)
    return invalidDetach(nodes, MAX_SNAPSHOT_BYTES + 1);
  if (value === null || typeof value === "boolean")
    return primitiveDetach(value, nodes, credential);
  if (typeof value === "number") {
    return Number.isFinite(value) ? primitiveDetach(value, nodes, credential) : invalidDetach(nodes + 1, 0);
  }
  if (typeof value === "string")
    return stringDetach(value, nodes, credential);
  if (Array.isArray(value))
    return detachArray(value, depth, nodes + 1, credential);
  if (typeof value === "object" && value !== null)
    return detachRecord(value, depth, nodes + 1, credential);
  return invalidDetach(nodes + 1, 0);
}
function primitiveDetach(value, nodes, credential) {
  const text = String(value);
  return boundedDetach(value, nodes + 1, Buffer.byteLength(text), true, credential.length > 0 && text.includes(credential));
}
function stringDetach(value, nodes, credential) {
  const bytes = Buffer.byteLength(JSON.stringify(value));
  const foundCredential = credential.length > 0 && value.includes(credential);
  return boundedDetach(value, nodes + 1, bytes, !hasSecretPattern(value), foundCredential);
}
function detachArray(value, depth, nodes, credential) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol"))
    return invalidDetach(nodes, 0);
  const length = readArrayLength(value);
  if (length === null || length > MAX_VALUE_NODES - nodes)
    return invalidDetach(nodes, 0);
  if (keys.length !== length + 1)
    return invalidDetach(nodes, 0);
  if (keys.some((key) => typeof key !== "string" || key !== "length" && !isArrayIndex(key, length))) {
    return invalidDetach(nodes, 0);
  }
  let result = boundedDetach(Object.freeze([]), nodes, 2, true, false);
  let items = Object.freeze([]);
  for (let index = 0;index < length; index += 1) {
    const descriptor = readDataDescriptor(value, String(index));
    if (!descriptor)
      return invalidDetach(result.nodes, result.bytes);
    const child = detachJsonValue(descriptor.value, depth + 1, result.nodes, credential);
    items = child.value === undefined ? items : Object.freeze([...items, child.value]);
    result = combineDetach(result, child, index > 0 ? 1 : 0, items);
    if (result.bytes > MAX_SNAPSHOT_BYTES || result.nodes > MAX_VALUE_NODES)
      return result;
  }
  return result;
}
function detachRecord(value, depth, nodes, credential) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return invalidDetach(nodes, 0);
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol"))
    return invalidDetach(nodes, 0);
  if (keys.length > MAX_VALUE_NODES - nodes)
    return invalidDetach(nodes, 0);
  let result = boundedDetach(Object.freeze({}), nodes, 2, true, false);
  let output = Object.freeze({});
  for (const key of keys) {
    if (typeof key !== "string")
      return invalidDetach(result.nodes, result.bytes);
    const descriptor = readDataDescriptor(value, key);
    if (!descriptor)
      return invalidDetach(result.nodes, result.bytes);
    const child = detachJsonValue(descriptor.value, depth + 1, result.nodes, credential);
    if (child.value !== undefined)
      output = Object.freeze({ ...output, [key]: child.value });
    const keyBytes = Buffer.byteLength(JSON.stringify(key)) + 1 + (Object.keys(output).length > 1 ? 1 : 0);
    const keyContainsCredential = credential.length > 0 && key.includes(credential);
    const safeChild = isSecretBearingKey(key) ? Object.freeze({ ...child, valid: false, credential: child.credential || keyContainsCredential }) : Object.freeze({ ...child, credential: child.credential || keyContainsCredential });
    result = combineDetach(result, safeChild, keyBytes, output);
    if (result.bytes > MAX_SNAPSHOT_BYTES || result.nodes > MAX_VALUE_NODES)
      return result;
  }
  return result;
}
function combineDetach(parent, child, overhead, value) {
  return boundedDetach(value, child.nodes, parent.bytes + child.bytes + overhead, parent.valid && child.valid, parent.credential || child.credential);
}
function boundedDetach(value, nodes, bytes, valid, credential) {
  const withinBudget = nodes <= MAX_VALUE_NODES && bytes <= MAX_SNAPSHOT_BYTES;
  return Object.freeze({ value: withinBudget ? value : undefined, nodes, bytes, valid: valid && withinBudget, credential });
}
function invalidDetach(nodes, bytes) {
  return Object.freeze({ value: undefined, nodes, bytes, valid: false, credential: false });
}
function isArrayIndex(key, length) {
  if (!/^(0|[1-9][0-9]*)$/.test(key))
    return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}
function readArrayLength(value) {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "number")
    return null;
  return Number.isSafeInteger(descriptor.value) && descriptor.value >= 0 ? descriptor.value : null;
}
function readDataDescriptor(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor?.enumerable && "value" in descriptor ? descriptor : null;
}
function isFinalSnapshotSizeValid(value) {
  return Buffer.byteLength(JSON.stringify(value)) <= MAX_SNAPSHOT_BYTES;
}
function isSuccessfulSnapshot(value, providerId) {
  if (!isPlainRecord(value) || value.id !== providerId || !isSuccessStatus(value.status))
    return false;
  if (!isBoundedString(value.displayName, 128) || !Array.isArray(value.windows))
    return false;
  if (!value.windows.every(isUsageWindow) || !isPositiveFiniteNumber(value.fetchedAt))
    return false;
  if (value.errorMessage !== undefined)
    return false;
  if (!isOptionalBoundedString(value.statusText, 1024) || !isOptionalBoundedString(value.plan, 256))
    return false;
  if (!isOptionalFiniteNumber(value.staleAt) || !isOptionalFiniteNumber(value.lastGoodAt))
    return false;
  if (value.additionalProperties !== undefined)
    return false;
  if (value.details !== undefined && (!Array.isArray(value.details) || !value.details.every(isProviderDetail)))
    return false;
  if (value.alerts !== undefined && (!Array.isArray(value.alerts) || !value.alerts.every(isUsageAlert)))
    return false;
  if (value.modelBreakdown !== undefined && (!Array.isArray(value.modelBreakdown) || !value.modelBreakdown.every(isModelBreakdown)))
    return false;
  return providerKeysAreKnown(value);
}
function isUsageWindow(value) {
  if (!isPlainRecord(value))
    return false;
  if (!isBoundedString(value.id, 256) || !isBoundedString(value.label, 256))
    return false;
  return isCanonicalUsageWindow(value);
}
function isCanonicalUsageWindow(value) {
  if (!isUsagePeriod(value.period) || !isUsageAmount(value.usage))
    return false;
  if (value.kind !== undefined && (typeof value.kind !== "string" || !WINDOW_KINDS.has(value.kind)))
    return false;
  if (!optionalNumbersAreFinite(value, ["percentage", "used", "limit", "remaining", "currentValue", "resetAt"]))
    return false;
  if (!isOptionalBoundedString(value.unitLabel, 128))
    return false;
  if (!isOptionalBoundedString(value.resetLabel, 512) || !isOptionalBoundedString(value.budgetLabel, 512))
    return false;
  if (!isOptionalPositiveFiniteNumber(value.resetAt))
    return false;
  if (value.limitReached !== undefined && typeof value.limitReached !== "boolean")
    return false;
  if (value.severity !== undefined && !isSeverity(value.severity))
    return false;
  if (!windowKeysAreKnown(value))
    return false;
  return value.summaryDetails === undefined || isBoundedStringArray(value.summaryDetails, 512);
}
function isUsagePeriod(value) {
  if (!isPlainRecord(value) || typeof value.kind !== "string")
    return false;
  if (value.kind === "unknown")
    return keysAreAllowed(value, ["kind"]);
  if (value.kind === "rolling") {
    return isPositiveFiniteNumber(value.durationMs) && keysAreAllowed(value, ["kind", "durationMs"]);
  }
  if (value.kind === "calendar") {
    return ["day", "week", "month", "billing"].includes(String(value.unit)) && keysAreAllowed(value, ["kind", "unit"]);
  }
  return false;
}
function isUsageAmount(value) {
  if (!isPlainRecord(value) || typeof value.kind !== "string")
    return false;
  if (value.kind === "percent") {
    return isNonNegativeFiniteNumber(value.usedPercent) && keysAreAllowed(value, ["kind", "usedPercent"]);
  }
  if (value.kind === "quota") {
    return isNonNegativeFiniteNumber(value.used) && isPositiveFiniteNumber(value.limit) && isBoundedString(value.unit, 64) && keysAreAllowed(value, ["kind", "used", "limit", "unit"]);
  }
  return false;
}
function isProviderDetail(value) {
  return isPlainRecord(value) && isBoundedString(value.key, 256) && !isSecretBearingKey(value.key) && isBoundedString(value.label, 256) && !isSecretBearingKey(value.label) && isDetailValue(value.value) && typeof value.visibility === "string" && DETAIL_VISIBILITIES.has(value.visibility) && isOptionalFiniteNumber(value.priority) && (value.tone === undefined || typeof value.tone === "string" && DETAIL_TONES.has(value.tone)) && keysAreAllowed(value, ["key", "label", "value", "visibility", "priority", "tone"]);
}
function isDetailValue(value) {
  if (!isPlainRecord(value) || typeof value.kind !== "string")
    return false;
  if (value.kind === "text")
    return isBoundedString(value.value, 2048) && keysAreAllowed(value, ["kind", "value"]);
  if (value.kind === "flag")
    return typeof value.value === "boolean" && keysAreAllowed(value, ["kind", "value"]);
  if (value.kind === "number") {
    return isOptionalBoundedString(value.unit, 64) && isOptionalFiniteNumber(value.value) && value.value !== undefined && keysAreAllowed(value, ["kind", "value", "unit"]);
  }
  if (value.kind === "currency") {
    return isOptionalFiniteNumber(value.value) && value.value !== undefined && isBoundedString(value.currency, 16) && keysAreAllowed(value, ["kind", "value", "currency"]);
  }
  return false;
}
function isUsageAlert(value) {
  return isPlainRecord(value) && isBoundedString(value.id, 256) && isBoundedString(value.label, 512) && isSeverity(value.severity) && value.additionalProperties === undefined && keysAreAllowed(value, ["id", "label", "severity"]);
}
function isModelBreakdown(value) {
  return isPlainRecord(value) && isBoundedString(value.id, 256) && isBoundedString(value.label, 512) && optionalNumbersAreFinite(value, ["percentage", "used", "costUsd", "requests"]) && isOptionalBoundedString(value.unitLabel, 128) && (value.severity === undefined || isSeverity(value.severity)) && keysAreAllowed(value, [
    "id",
    "label",
    "percentage",
    "used",
    "unitLabel",
    "costUsd",
    "requests",
    "severity"
  ]);
}
function optionalNumbersAreFinite(value, keys) {
  return keys.every((key) => isOptionalFiniteNumber(value[key]));
}
function isOptionalFiniteNumber(value) {
  return value === undefined || typeof value === "number" && Number.isFinite(value);
}
function isNonNegativeFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isOptionalPositiveFiniteNumber(value) {
  return value === undefined || isPositiveFiniteNumber(value);
}
function isPositiveFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function isSuccessStatus(value) {
  return typeof value === "string" && SUCCESS_STATUSES.has(value);
}
function isSeverity(value) {
  return typeof value === "string" && SEVERITIES.has(value);
}
function isBoundedString(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}
function isOptionalBoundedString(value, maxLength) {
  return value === undefined || isBoundedString(value, maxLength);
}
function isBoundedStringArray(value, maxLength) {
  return Array.isArray(value) && value.every((entry) => isBoundedString(entry, maxLength));
}
function windowKeysAreKnown(value) {
  return keysAreAllowed(value, [
    "id",
    "label",
    "kind",
    "percentage",
    "used",
    "limit",
    "remaining",
    "currentValue",
    "unitLabel",
    "resetAt",
    "resetLabel",
    "budgetLabel",
    "limitReached",
    "severity",
    "summaryDetails",
    "period",
    "usage"
  ]);
}
function providerKeysAreKnown(value) {
  return keysAreAllowed(value, [
    "id",
    "displayName",
    "status",
    "statusText",
    "plan",
    "windows",
    "alerts",
    "modelBreakdown",
    "details",
    "fetchedAt",
    "staleAt",
    "lastGoodAt"
  ]);
}
function keysAreAllowed(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}
function deepFreeze(value) {
  if (value === null || typeof value !== "object")
    return value;
  for (const child of Object.values(value))
    deepFreeze(child);
  return Object.freeze(value);
}
function isPlainRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// src/provider-cache.ts
var CACHE_V2_SCHEMA_VERSION = 2;
var DEFAULT_BASE_DIR = join(tmpdir(), "opencode-usage-monitor-v2");
var MAX_FILE_BYTES = 512 * 1024;
var MAX_TEMPORARY_FILE_AGE_MS = 5 * 60 * 1000;
var PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
var ACCOUNT_SCOPE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var VARIANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
var SHAPE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
var TEMPORARY_FILE_PATTERN = /^[a-z][a-z0-9-]{0,63}-[a-f0-9]{64}\.json\.tmp-[A-Za-z0-9-]+$/;
function createProviderCacheV2(options = {}) {
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const memory = new Map;
  let disposed = false;
  return Object.freeze({
    read: (target) => disposed ? { status: "invalid", diagnostic: "cache-invalid-input" } : readEntry(baseDir, memory, target),
    write: (target, snapshot) => disposed ? { status: "rejected", diagnostic: "cache-invalid-input" } : writeEntry(baseDir, memory, target, snapshot),
    dispose: () => {
      if (disposed)
        return;
      disposed = true;
      memory.clear();
    }
  });
}
function readEntry(baseDir, memory, target) {
  const validated = validateTarget(baseDir, target);
  if (!validated)
    return { status: "invalid", diagnostic: "cache-invalid-input" };
  const key = memoryKey(validated);
  const cached = memory.get(key);
  if (cached)
    return { status: "hit", snapshot: cloneFrozen(cached), storage: "memory" };
  if (!validated.scopeDigest)
    return { status: "miss", diagnostic: "cache-miss" };
  const persistent = readPersistent(baseDir, validated);
  if (persistent.status === "hit")
    memory.set(key, persistent.snapshot);
  return persistent;
}
function writeEntry(baseDir, memory, target, snapshot) {
  const validated = validateTarget(baseDir, target);
  if (!validated)
    return { status: "rejected", diagnostic: "cache-invalid-input" };
  const validation = validateAndCloneUsageSnapshot(snapshot, validated.providerId);
  if (!validation.ok)
    return { status: "rejected", diagnostic: "snapshot-invalid" };
  const frozen = validation.snapshot;
  if (!validated.scopeDigest) {
    memory.set(memoryKey(validated), frozen);
    return { status: "written", storage: "memory" };
  }
  if (!writePersistent(baseDir, validated, frozen)) {
    return { status: "error", diagnostic: "cache-write-failed" };
  }
  memory.set(memoryKey(validated), frozen);
  return { status: "written", storage: "persistent" };
}
function validateTarget(baseDir, target) {
  try {
    if (!isTrustedBaseDir(baseDir) || !PROVIDER_ID_PATTERN.test(target.providerId))
      return null;
    if (!isSafeCounter(target.generation) || !isSafeCounter(target.credentialEpoch))
      return null;
    if (!ACCOUNT_SCOPE_PATTERN.test(target.accountScope))
      return null;
    if (target.scope === null)
      return { ...target, scopeDigest: null };
    const validatedScope = validateCacheScope(target.providerId, target.scope);
    if (!validatedScope)
      return null;
    return {
      providerId: target.providerId,
      generation: target.generation,
      credentialEpoch: target.credentialEpoch,
      accountScope: target.accountScope,
      scopeDigest: createHash("sha256").update(validatedScope.canonical).digest("hex")
    };
  } catch (_error) {
    return null;
  }
}
function validateCacheScope(providerId, value) {
  try {
    if (!PROVIDER_ID_PATTERN.test(providerId) || !isPlainRecord2(value))
      return null;
    const fields = readDataProperties(value, ["accountId", "credentialVariant", "dataShape"]);
    if (!fields)
      return null;
    const { accountId, credentialVariant, dataShape } = fields;
    if (typeof accountId !== "string" || !isSafeIdentity(accountId, 512))
      return null;
    if (typeof credentialVariant !== "string" || !VARIANT_PATTERN.test(credentialVariant))
      return null;
    if (hasSecretPattern(credentialVariant))
      return null;
    const shape = canonicalShape(dataShape);
    if (!shape)
      return null;
    const detachedScope = Object.freeze({ accountId, credentialVariant, dataShape: shape.dataShape });
    const canonical = JSON.stringify([
      providerId,
      CACHE_V2_SCHEMA_VERSION,
      accountId,
      credentialVariant,
      shape.entries
    ]);
    return Object.freeze({ scope: detachedScope, canonical, identity: canonical });
  } catch (_error) {
    return null;
  }
}
function canonicalShape(shape) {
  if (!isPlainRecord2(shape))
    return null;
  const descriptors = Object.getOwnPropertyDescriptors(shape);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol"))
    return null;
  const entries = Object.entries(descriptors);
  if (entries.length > 32)
    return null;
  const values = entries.map(([key, descriptor]) => [key, dataPropertyValue(descriptor)]);
  if (!values.every(([key, value]) => isSafeShapeEntry(key, value)))
    return null;
  const safeValues = values.flatMap(([key, value]) => isSafeShapeEntry(key, value) ? [Object.freeze([key, value])] : []);
  const sorted = safeValues.map(([key, value]) => Object.freeze([key, value])).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return Object.freeze({ dataShape: Object.freeze(Object.fromEntries(sorted)), entries: Object.freeze(sorted) });
}
function readDataProperties(value, expectedKeys) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) {
    return null;
  }
  const properties = keys.flatMap((key) => typeof key === "string" ? [[key, dataPropertyValue(descriptors[key])]] : []);
  return properties.some(([, property]) => property === INVALID_PROPERTY) ? null : Object.freeze(Object.fromEntries(properties));
}
var INVALID_PROPERTY = Symbol("invalid-property");
function dataPropertyValue(descriptor) {
  return descriptor?.enumerable && "value" in descriptor ? descriptor.value : INVALID_PROPERTY;
}
function isSafeShapeEntry(key, value) {
  if (!SHAPE_KEY_PATTERN.test(key) || isSecretBearingKey(key) || looksDerivedCredentialKey(key))
    return false;
  if (typeof value === "boolean")
    return true;
  if (typeof value === "number")
    return Number.isFinite(value);
  return typeof value === "string" && isSafeIdentity(value, 256);
}
function looksDerivedCredentialKey(key) {
  return /(^|[._-])(hash|prefix|suffix|reference)($|[._-])/.test(key.toLowerCase());
}
function isSafeIdentity(value, maxLength) {
  return value.length > 0 && value.length <= maxLength && !containsControlCharacter(value) && !hasSecretPattern(value);
}
function containsControlCharacter(value) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}
function isSafeCounter(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function memoryKey(target) {
  return target.scopeDigest === null ? JSON.stringify([target.providerId, target.accountScope, target.credentialEpoch]) : JSON.stringify([target.providerId, target.scopeDigest]);
}
function isTrustedBaseDir(baseDir) {
  if (!isAbsolute2(baseDir))
    return false;
  return isDescendantPath(resolve(tmpdir()), resolve(baseDir));
}
function isDescendantPath(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent.length > 0 && pathFromParent !== ".." && !pathFromParent.startsWith(`..${sep}`) && !isAbsolute2(pathFromParent);
}
function readPersistent(baseDir, target) {
  const digest = target.scopeDigest;
  if (!digest)
    return { status: "miss", diagnostic: "cache-miss" };
  const filePath = persistentPath(baseDir, target.providerId, digest);
  try {
    lstatSync(filePath);
    assertPrivateDirectoryForRead(baseDir);
    const envelope = readEnvelope(filePath);
    if (!envelope)
      return { status: "invalid", diagnostic: "cache-invalid" };
    if (!matchesEnvelope(envelope, target.providerId, digest)) {
      return { status: "invalid", diagnostic: "cache-invalid" };
    }
    const validation = validateAndCloneUsageSnapshot(envelope.snapshot, target.providerId);
    if (!validation.ok)
      return { status: "invalid", diagnostic: "cache-invalid" };
    return { status: "hit", snapshot: validation.snapshot, storage: "persistent" };
  } catch (error) {
    return isMissingFileError(error) ? { status: "miss", diagnostic: "cache-miss" } : { status: "invalid", diagnostic: "cache-invalid" };
  }
}
function readEnvelope(filePath) {
  const linkStat = lstatSync(filePath);
  if (!isPrivateRegularFile(linkStat))
    return null;
  if (linkStat.size > MAX_FILE_BYTES)
    return null;
  const descriptor = openSync(filePath, constants.O_RDONLY | requiredNoFollowFlag());
  try {
    const openedStat = fstatSync(descriptor);
    if (!isPrivateRegularFile(openedStat) || openedStat.size > MAX_FILE_BYTES)
      return null;
    if (linkStat.dev !== openedStat.dev || linkStat.ino !== openedStat.ino)
      return null;
    const raw = readBoundedUtf8(descriptor);
    if (raw === null)
      return null;
    const parsed = JSON.parse(raw);
    return isPersistedEnvelope(parsed) ? parsed : null;
  } finally {
    closeSync(descriptor);
  }
}
function readBoundedUtf8(descriptor) {
  const buffer = Buffer.allocUnsafe(MAX_FILE_BYTES + 1);
  let totalBytes = 0;
  while (totalBytes < buffer.length) {
    const bytesRead = readSync(descriptor, buffer, totalBytes, buffer.length - totalBytes, totalBytes);
    if (bytesRead === 0)
      break;
    totalBytes += bytesRead;
  }
  return totalBytes > MAX_FILE_BYTES ? null : buffer.toString("utf8", 0, totalBytes);
}
function assertPrivateDirectoryForRead(baseDir) {
  assertCanonicalTrustedDirectory(baseDir);
  const status = lstatSync(baseDir);
  const privateMode = (status.mode & 511) === 448;
  if (!status.isDirectory() || status.isSymbolicLink() || !privateMode || !isOwnedByCurrentUser(status.uid)) {
    throw new Error("invalid cache directory");
  }
}
function isPrivateRegularFile(status) {
  return status.isFile() && !status.isSymbolicLink() && (status.mode & 511) === 384 && isOwnedByCurrentUser(status.uid);
}
function isOwnedByCurrentUser(uid) {
  return typeof process.getuid !== "function" || uid === process.getuid();
}
function matchesEnvelope(envelope, providerId, digest) {
  return envelope.version === CACHE_V2_SCHEMA_VERSION && envelope.providerId === providerId && envelope.scopeDigest === digest;
}
function isPersistedEnvelope(value) {
  if (!isPlainRecord2(value))
    return false;
  const keys = Object.keys(value);
  return keys.length === 4 && keys.every((key) => ["version", "providerId", "scopeDigest", "snapshot"].includes(key)) && value.version === CACHE_V2_SCHEMA_VERSION && typeof value.providerId === "string" && typeof value.scopeDigest === "string" && isPlainRecord2(value.snapshot);
}
function writePersistent(baseDir, target, snapshot) {
  const digest = target.scopeDigest;
  if (!digest)
    return false;
  let temporaryPath = null;
  try {
    ensurePrivateDirectory(baseDir);
    removeStaleTemporaryFiles(baseDir);
    const filePath = persistentPath(baseDir, target.providerId, digest);
    temporaryPath = `${filePath}.tmp-${randomUUID2()}`;
    const envelope = {
      version: CACHE_V2_SCHEMA_VERSION,
      providerId: target.providerId,
      scopeDigest: digest,
      snapshot
    };
    writeAtomicFile(temporaryPath, filePath, JSON.stringify(envelope));
    temporaryPath = null;
    syncDirectory(baseDir);
    return true;
  } catch {
    if (temporaryPath)
      removeTemporaryFile(temporaryPath, true);
    return false;
  }
}
function ensurePrivateDirectory(baseDir) {
  mkdirSync(baseDir, { recursive: true, mode: 448 });
  assertCanonicalTrustedDirectory(baseDir);
  const status = lstatSync(baseDir);
  if (!status.isDirectory() || status.isSymbolicLink() || !isOwnedByCurrentUser(status.uid)) {
    throw new Error("invalid cache directory");
  }
  chmodSync(baseDir, 448);
}
function assertCanonicalTrustedDirectory(baseDir) {
  const trustedRoot = realpathSync(tmpdir());
  const canonicalBaseDir = realpathSync(baseDir);
  if (!isDescendantPath(trustedRoot, canonicalBaseDir))
    throw new Error("untrusted cache directory");
}
function writeAtomicFile(temporaryPath, filePath, content) {
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | requiredNoFollowFlag();
  const descriptor = openSync(temporaryPath, flags, 384);
  try {
    fchmodSync(descriptor, 384);
    if (!isPrivateRegularFile(fstatSync(descriptor)))
      throw new Error("invalid temporary cache file");
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporaryPath, filePath);
}
function syncDirectory(baseDir) {
  const descriptor = openSync(baseDir, constants.O_RDONLY | requiredNoFollowFlag());
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}
function removeTemporaryFile(filePath, removeActive = false) {
  try {
    const status = lstatSync(filePath);
    if (!isPrivateRegularFile(status))
      return;
    if (!removeActive && !isStaleTemporaryFile(status.mtimeMs))
      return;
    unlinkSync(filePath);
  } catch {
    return;
  }
}
function isStaleTemporaryFile(modifiedAt) {
  return Date.now() - modifiedAt >= MAX_TEMPORARY_FILE_AGE_MS;
}
function removeStaleTemporaryFiles(baseDir) {
  for (const name of readdirSync(baseDir)) {
    if (!TEMPORARY_FILE_PATTERN.test(name))
      continue;
    removeTemporaryFile(join(baseDir, name));
  }
}
function persistentPath(baseDir, providerId, digest) {
  return join(baseDir, `${providerId}-${digest}.json`);
}
function requiredNoFollowFlag() {
  const flag = Reflect.get(constants, "O_NOFOLLOW");
  if (typeof flag !== "number" || flag === 0)
    throw new Error("O_NOFOLLOW unavailable");
  return flag;
}
function isMissingFileError(error) {
  return error instanceof Error && "code" in error && Reflect.get(error, "code") === "ENOENT";
}
function deepFreeze2(value) {
  if (value === null || typeof value !== "object")
    return value;
  for (const child of Object.values(value))
    deepFreeze2(child);
  return Object.freeze(value);
}
function cloneFrozen(snapshot) {
  const serialized = JSON.stringify(snapshot);
  return deepFreeze2(JSON.parse(serialized));
}
function isPlainRecord2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// src/refresh-snapshot.ts
var CREDENTIAL_DATA_MESSAGE = "Provider response contained credential data";
var INVALID_PROVIDER_DATA_MESSAGE = "Provider returned invalid data";
var PROVIDER_FAILURE_FALLBACK = "Provider refresh failed";
var MAX_PROVIDER_FAILURE_LENGTH = 1024;
function prepareProviderSnapshot(snapshot, credential, expectedProviderId, fetchedAt) {
  return validateAndCloneUsageSnapshot(snapshot, expectedProviderId, { credential, fetchedAt });
}
function sanitizeProviderFailure(error, credential) {
  try {
    const redacted = sanitizeCredentialError(error, credential);
    const oneLine = redacted.replace(/[\r\n]+/g, " ").trim();
    return (oneLine || PROVIDER_FAILURE_FALLBACK).slice(0, MAX_PROVIDER_FAILURE_LENGTH);
  } catch (_error) {
    return PROVIDER_FAILURE_FALLBACK;
  }
}
function successfulRuntimeStatus(snapshot) {
  return snapshot.status === "partial" ? "partial" : "ready";
}

// src/refresh-schedule.ts
var CONFIG_ERROR_MESSAGE = "Provider configuration is invalid";
var CREDENTIAL_MESSAGES = Object.freeze({
  missing: "Credential is required",
  config: "Credential configuration is invalid",
  source: "Credential source is unavailable",
  superseded: "Credential resolution was superseded"
});
function createInitialStates(providers, generation) {
  return new Map(providers.map((provider) => [provider.id, freezeState({
    id: provider.id,
    generation,
    requestSequence: 0,
    credentialEpoch: 0,
    status: provider.ok ? "loading" : "config_error",
    ...provider.ok ? {} : { message: CONFIG_ERROR_MESSAGE }
  })]));
}
function createInitialContexts(providers) {
  return new Map(providers.map((provider) => [provider.id, Object.freeze({
    selection: provider,
    credentialEpoch: 0
  })]));
}
function reconfigureStates(providers, previousProviders, previousStates, generation, policy, now) {
  return new Map(providers.map((provider) => {
    const priorSelection = previousProviders.find((candidate) => candidate.id === provider.id);
    const prior = priorSelection === provider ? previousStates.get(provider.id) : undefined;
    return [provider.id, reconfiguredState(provider, prior, generation, policy, now)];
  }));
}
function reconfigureContexts(providers, previousProviders, previous) {
  return new Map(providers.map((provider) => {
    const priorSelection = previousProviders.find((candidate) => candidate.id === provider.id);
    const prior = priorSelection === provider ? previous.get(provider.id) : undefined;
    return [provider.id, prior ?? Object.freeze({ selection: provider, credentialEpoch: 0 })];
  }));
}
function deriveScope(provider, lease) {
  const reader = createNonSecretAccountMetadataReader({ credential_variant: lease.variant }, ["credential_variant"]);
  if (!reader.ok)
    return { ok: false };
  try {
    const raw = provider.binding.resolveCacheScopeMetadata(reader.value);
    if (raw instanceof Promise) {
      raw.catch(() => {
        return;
      });
      return { ok: false };
    }
    if (raw === null)
      return { ok: true, value: Object.freeze({ scope: null, persistentIdentity: null }) };
    const validated = validateCacheScope(provider.id, raw);
    return validated ? { ok: true, value: Object.freeze({ scope: validated.scope, persistentIdentity: validated.identity }) } : { ok: false };
  } catch (_error) {
    return { ok: false };
  }
}
function safeCacheRead(cache, target) {
  try {
    return cache.read(target);
  } catch (_error) {
    return { status: "invalid", diagnostic: "cache-invalid" };
  }
}
function safeCacheWrite(cache, target, snapshot) {
  try {
    cache.write(target, snapshot);
  } catch (_error) {
    return;
  }
}
function scopeIdentity(scope, accountScope) {
  return scope.persistentIdentity ?? JSON.stringify(["memory", accountScope]);
}
function makeTarget(providerId, generation, credentialEpoch, accountScope, scope) {
  return Object.freeze({ providerId, generation, credentialEpoch, accountScope, scope });
}
function shouldRefreshImmediately(state, now) {
  return !state || state.status === "stale" || state.nextDueAt === undefined || state.nextDueAt <= now;
}
function credentialErrorStatus(kind) {
  if (kind === "missing")
    return "needs_auth";
  if (kind === "config")
    return "config_error";
  return "error";
}
function automaticDue(policy, completedAt) {
  return policy.mode === "automatic" ? completedAt + policy.interval_ms : undefined;
}
function nearestDeadline(states, policy, busyIds) {
  const deadlines = states.flatMap((state) => stateDeadlines(state, policy, busyIds));
  return deadlines.length > 0 ? Math.min(...deadlines) : undefined;
}
function isDue(state, now) {
  return state?.status === "stale" || state?.nextDueAt !== undefined && state.nextDueAt <= now;
}
function becomesStale(state, policy, now) {
  return (state.status === "ready" || state.status === "partial") && state.lastSuccessAt !== undefined && now - state.lastSuccessAt >= policy.stale_after_ms;
}
function freezeState(state) {
  return Object.freeze(state);
}
function withoutKey(source, key) {
  const next = new Map(source);
  next.delete(key);
  return next;
}
var DEFAULT_CLOCK = Object.freeze({ now: () => Date.now() });
var DEFAULT_TIMERS = Object.freeze({
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle)
});
function reconfiguredState(provider, prior, generation, policy, now) {
  if (!provider.ok)
    return freezeState({
      id: provider.id,
      generation,
      requestSequence: 0,
      credentialEpoch: 0,
      status: "config_error",
      message: CONFIG_ERROR_MESSAGE
    });
  if (!prior)
    return freezeState({
      id: provider.id,
      generation,
      requestSequence: 0,
      credentialEpoch: 0,
      status: "loading",
      nextDueAt: policy.mode === "automatic" ? now : undefined
    });
  return freezeState({
    ...prior,
    generation,
    requestSequence: 0,
    status: retainedStatus(prior, policy, now),
    nextDueAt: recomputedDue(prior, policy, now),
    message: undefined
  });
}
function retainedStatus(prior, policy, now) {
  if (!prior.snapshot || prior.lastSuccessAt === undefined)
    return "loading";
  if (now - prior.lastSuccessAt >= policy.stale_after_ms)
    return "stale";
  return successfulRuntimeStatus(prior.snapshot);
}
function recomputedDue(prior, policy, now) {
  if (policy.mode !== "automatic")
    return;
  const completedAt = prior.lastAttemptAt ?? prior.lastSuccessAt;
  return completedAt === undefined ? now : completedAt + policy.interval_ms;
}
function stateDeadlines(state, policy, busyIds) {
  const automatic = !busyIds.has(state.id) && policy.mode === "automatic" ? state.nextDueAt : undefined;
  const stale = (state.status === "ready" || state.status === "partial") && state.lastSuccessAt !== undefined ? state.lastSuccessAt + policy.stale_after_ms : undefined;
  return [automatic, stale].filter((value) => value !== undefined);
}

// src/refresh-commit.ts
function validateFetchResult(result, expectedProviderId, credential) {
  if (isSuccessfulProviderResult(result, expectedProviderId)) {
    return Object.freeze({ ok: true, result });
  }
  const message = result.errorMessage ?? result.statusText ?? "Provider refresh failed";
  return Object.freeze({
    ok: false,
    message: sanitizeProviderFailure(message, credential)
  });
}
function isSuccessfulProviderResult(result, expectedProviderId) {
  return result.id === expectedProviderId && (result.status === "ready" || result.status === "partial");
}
function prepareCompletedFetch(result, credential, expectedProviderId, completedAt) {
  const prepared = prepareProviderSnapshot(result, credential, expectedProviderId, completedAt);
  if (prepared.ok)
    return Object.freeze({ ok: true, snapshot: prepared.snapshot });
  const message = prepared.reason === "credential" ? CREDENTIAL_DATA_MESSAGE : INVALID_PROVIDER_DATA_MESSAGE;
  return Object.freeze({ ok: false, message });
}
function createSuccessfulFetchState(previous, gate, status, snapshot, completedAt, policy) {
  return freezeState({
    ...previous,
    id: gate.id,
    generation: gate.generation,
    requestSequence: gate.requestSequence,
    credentialEpoch: gate.credentialEpoch,
    status,
    snapshot,
    lastAttemptAt: completedAt,
    lastSuccessAt: completedAt,
    nextDueAt: automaticDue(policy, completedAt),
    message: undefined
  });
}

// src/refresh-contracts.ts
function matchesOperation(operation, generation, credentialEpoch, scopeKey) {
  return operation?.generation === generation && operation.credentialEpoch === credentialEpoch && operation.scopeKey === scopeKey;
}

// src/refresh.ts
class DeterministicRefreshCoordinator {
  input;
  providers;
  policy;
  generation = 1;
  states;
  contexts;
  operations = new Map;
  resolutionSequences = new Map;
  pendingResolutions = new Map;
  subscribers = Object.freeze([]);
  timerHandle;
  timerSequence = 0;
  disposed = false;
  constructor(input) {
    this.input = input;
    this.providers = Object.freeze([...input.providers]);
    this.policy = Object.freeze({ ...input.policy });
    this.states = createInitialStates(this.providers, this.generation);
    this.contexts = createInitialContexts(this.providers);
    this.bootstrapResetProviders(this.providers, this.generation);
    this.reschedule();
  }
  async refreshAll() {
    if (this.disposed)
      return;
    const requests = this.providers.filter((provider) => provider.ok).map((provider) => this.requestProvider(provider, this.generation));
    await Promise.allSettled(requests);
  }
  async refreshProvider(id) {
    if (this.disposed)
      return;
    const selected = this.providers.find((provider) => provider.id === id);
    if (!selected?.ok)
      return;
    await this.requestProvider(selected, this.generation);
  }
  reconfigure(providers, policy) {
    if (this.disposed)
      return;
    const previousProviders = this.providers;
    const previousContexts = this.contexts;
    const interruptedBootstraps = new Set(this.pendingResolutions.keys());
    this.abortAllOperations();
    this.cancelTimer();
    this.generation += 1;
    this.providers = Object.freeze([...providers]);
    this.policy = Object.freeze({ ...policy });
    this.states = reconfigureStates(this.providers, previousProviders, this.states, this.generation, this.policy, this.now());
    this.contexts = reconfigureContexts(this.providers, previousProviders, previousContexts);
    this.operations = new Map;
    this.invalidateResolutions();
    this.emit();
    this.bootstrapChangedProviders(previousProviders, interruptedBootstraps);
    this.reschedule();
  }
  getStates() {
    return Object.freeze(this.providers.flatMap((provider) => {
      const current = this.states.get(provider.id);
      return current ? [current] : [];
    }));
  }
  subscribe(subscriber) {
    if (this.disposed)
      return () => {
        return;
      };
    this.subscribers = Object.freeze([...this.subscribers, subscriber]);
    let active = true;
    return () => {
      if (!active)
        return;
      active = false;
      this.subscribers = Object.freeze(this.subscribers.filter((candidate) => candidate !== subscriber));
    };
  }
  dispose() {
    if (this.disposed)
      return;
    this.disposed = true;
    this.cancelTimer();
    this.abortAllOperations();
    this.operations = new Map;
    this.pendingResolutions = new Map;
    this.subscribers = Object.freeze([]);
    attemptCleanup(() => this.input.credentialResolver.dispose());
    attemptCleanup(() => this.input.cache.dispose());
  }
  bootstrapResetProviders(providers, generation) {
    for (const provider of providers) {
      if (provider.ok)
        this.bootstrapProvider(provider, generation);
    }
  }
  bootstrapChangedProviders(previous, interruptedBootstraps) {
    for (const provider of this.providers) {
      const prior = previous.find((candidate) => candidate.id === provider.id);
      if (provider.ok && (prior !== provider || interruptedBootstraps.has(provider.id))) {
        this.bootstrapProvider(provider, this.generation);
      }
    }
  }
  async bootstrapProvider(provider, generation) {
    const resolutionSequence = this.beginResolution(provider.id, false);
    try {
      const resolution = await this.resolveCredential(provider, generation, resolutionSequence);
      if (!resolution)
        return;
      if (!this.resolutionIsCurrent(provider.id, generation, resolutionSequence))
        return;
      if (!resolution.ok) {
        this.commitCredentialError(provider.id, generation, resolution);
        return;
      }
      const scope = deriveScope(provider, resolution.lease);
      if (!scope.ok) {
        this.commitScopeError(provider.id, generation, resolution.lease.epoch);
        return;
      }
      this.setContext(provider, resolution.lease.epoch, resolution.accountScope, scope.value);
      this.bootstrapFromCache(provider, generation, resolution.lease, resolution.accountScope, scope.value);
    } finally {
      this.endResolution(provider.id, generation);
    }
  }
  bootstrapFromCache(provider, generation, lease, accountScope, scope) {
    const scopeKey = scopeIdentity(scope, accountScope);
    if (!this.contextIsCurrent(provider.id, generation, lease.epoch, scopeKey))
      return;
    const target = makeTarget(provider.id, generation, lease.epoch, accountScope, scope.scope);
    const cached = safeCacheRead(this.input.cache, target);
    if (!this.contextIsCurrent(provider.id, generation, lease.epoch, scopeKey))
      return;
    if (cached.status === "hit")
      this.commitCached(provider.id, cached.snapshot, lease.secret);
    if (this.policy.mode !== "automatic")
      return;
    const current = this.states.get(provider.id);
    if (cached.status !== "hit" || shouldRefreshImmediately(current, this.now())) {
      this.startWithLease(provider, generation, lease, accountScope, scope);
    }
  }
  async requestProvider(provider, generation) {
    const resolutionSequence = this.beginResolution(provider.id, true);
    try {
      if (!this.resolutionIsCurrent(provider.id, generation, resolutionSequence))
        return;
      const resolution = await this.resolveCredential(provider, generation, resolutionSequence);
      if (!resolution)
        return;
      if (!this.resolutionIsCurrent(provider.id, generation, resolutionSequence))
        return;
      if (!resolution.ok) {
        this.commitCredentialError(provider.id, generation, resolution);
        return;
      }
      const scope = deriveScope(provider, resolution.lease);
      if (!scope.ok) {
        this.commitScopeError(provider.id, generation, resolution.lease.epoch);
        return;
      }
      await this.startWithLease(provider, generation, resolution.lease, resolution.accountScope, scope.value);
    } finally {
      this.endResolution(provider.id, generation);
    }
  }
  async resolveCredential(provider, generation, resolutionSequence) {
    try {
      return await this.input.credentialResolver.resolve(provider.registration, provider.credential);
    } catch (_error) {
      if (this.resolutionIsCurrent(provider.id, generation, resolutionSequence)) {
        const epoch = this.contexts.get(provider.id)?.credentialEpoch ?? 0;
        this.commitCredentialError(provider.id, generation, {
          ok: false,
          kind: "source",
          message: CREDENTIAL_MESSAGES.source,
          epoch
        });
      }
      return null;
    }
  }
  startWithLease(provider, generation, lease, accountScope, scope) {
    if (!this.providerIsCurrent(provider.id, generation))
      return Promise.resolve();
    const scopeKey = scopeIdentity(scope, accountScope);
    const existing = this.operations.get(provider.id);
    if (existing && matchesOperation(existing, generation, lease.epoch, scopeKey))
      return existing.promise;
    existing?.controller.abort();
    this.setContext(provider, lease.epoch, accountScope, scope);
    const requestSequence = (this.states.get(provider.id)?.requestSequence ?? 0) + 1;
    const gate = Object.freeze({
      id: provider.id,
      generation,
      requestSequence,
      credentialEpoch: lease.epoch,
      scopeKey
    });
    this.commitRefreshing(gate);
    if (!this.canCommit(gate))
      return Promise.resolve();
    const controller = new AbortController;
    const promise = Promise.resolve().then(() => this.executeFetch(provider, lease, accountScope, scope, controller, gate));
    const operation = Object.freeze({ ...gate, controller, promise });
    this.operations = new Map(this.operations).set(provider.id, operation);
    return promise;
  }
  async executeFetch(provider, lease, accountScope, scope, controller, gate) {
    try {
      const result = await provider.binding.fetchUsage({
        credential: lease,
        signal: controller.signal,
        timeoutMs: this.policy.timeout_ms
      });
      this.commitFetchResult(result, accountScope, scope, gate, lease.secret);
    } catch (error) {
      this.commitFetchFailure(sanitizeProviderFailure(error, lease.secret), gate);
    } finally {
      this.finishOperation(gate);
    }
  }
  commitFetchResult(result, accountScope, scope, gate, credential) {
    const valid = validateFetchResult(result, gate.id, credential);
    if (!valid.ok) {
      this.commitFetchFailure(valid.message, gate);
      return;
    }
    const completedAt = this.now();
    const prepared = prepareCompletedFetch(valid.result, credential, gate.id, completedAt);
    if (!prepared.ok) {
      this.commitFetchFailure(prepared.message, gate);
      return;
    }
    if (!this.canCommit(gate))
      return;
    const snapshot = prepared.snapshot;
    this.replaceState(gate.id, createSuccessfulFetchState(this.states.get(gate.id), gate, valid.result.status, snapshot, completedAt, this.policy));
    if (!this.canCommit(gate))
      return;
    safeCacheWrite(this.input.cache, makeTarget(gate.id, gate.generation, gate.credentialEpoch, accountScope, scope.scope), snapshot);
  }
  commitFetchFailure(message, gate) {
    if (!this.canCommit(gate))
      return;
    const completedAt = this.now();
    const previous = this.states.get(gate.id);
    const next = freezeState({
      ...previous,
      id: gate.id,
      generation: gate.generation,
      requestSequence: gate.requestSequence,
      credentialEpoch: gate.credentialEpoch,
      status: "error",
      lastAttemptAt: completedAt,
      nextDueAt: automaticDue(this.policy, completedAt),
      message: message || "Provider refresh failed"
    });
    this.replaceState(gate.id, next);
  }
  commitCredentialError(id, generation, resolution) {
    if (!this.providerIsCurrent(id, generation))
      return;
    this.operations.get(id)?.controller.abort();
    this.operations = withoutKey(this.operations, id);
    const completedAt = this.now();
    const previous = this.states.get(id);
    const requestSequence = (previous?.requestSequence ?? 0) + 1;
    const status = credentialErrorStatus(resolution.kind);
    const context = this.contexts.get(id);
    if (context)
      this.contexts = new Map(this.contexts).set(id, Object.freeze({ ...context, credentialEpoch: resolution.epoch }));
    this.replaceState(id, freezeState({
      ...previous,
      id,
      generation,
      requestSequence,
      credentialEpoch: resolution.epoch,
      status,
      lastAttemptAt: completedAt,
      nextDueAt: automaticDue(this.policy, completedAt),
      message: CREDENTIAL_MESSAGES[resolution.kind]
    }));
  }
  commitScopeError(id, generation, credentialEpoch) {
    if (!this.providerIsCurrent(id, generation))
      return;
    this.operations.get(id)?.controller.abort();
    this.operations = withoutKey(this.operations, id);
    const completedAt = this.now();
    const previous = this.states.get(id);
    this.replaceState(id, freezeState({
      ...previous,
      id,
      generation,
      requestSequence: (previous?.requestSequence ?? 0) + 1,
      credentialEpoch,
      status: "config_error",
      lastAttemptAt: completedAt,
      nextDueAt: automaticDue(this.policy, completedAt),
      message: CONFIG_ERROR_MESSAGE
    }));
  }
  commitCached(id, cached, credential) {
    const context = this.contexts.get(id);
    const previous = this.states.get(id);
    const prepared = prepareProviderSnapshot(cached, credential, id);
    const fetchedAt = prepared.ok ? prepared.snapshot.fetchedAt : undefined;
    if (!context || !previous || !prepared.ok || fetchedAt === undefined)
      return;
    const cloned = prepared.snapshot;
    const status = this.now() - fetchedAt >= this.policy.stale_after_ms ? "stale" : successfulRuntimeStatus(cloned);
    this.replaceState(id, freezeState({
      ...previous,
      status,
      snapshot: cloned,
      lastSuccessAt: fetchedAt,
      nextDueAt: this.policy.mode === "automatic" ? fetchedAt + this.policy.interval_ms : undefined,
      credentialEpoch: context.credentialEpoch,
      message: undefined
    }));
  }
  commitRefreshing(gate) {
    if (!this.providerIsCurrent(gate.id, gate.generation))
      return;
    const previous = this.states.get(gate.id);
    const next = freezeState({
      ...previous,
      id: gate.id,
      generation: gate.generation,
      requestSequence: gate.requestSequence,
      credentialEpoch: gate.credentialEpoch,
      status: "refreshing",
      nextDueAt: undefined,
      message: undefined
    });
    if (previous?.status === "refreshing") {
      this.states = new Map(this.states).set(gate.id, next);
      return;
    }
    this.replaceState(gate.id, next);
  }
  beginResolution(id, markRefreshing) {
    const sequence = (this.resolutionSequences.get(id) ?? 0) + 1;
    this.resolutionSequences = new Map(this.resolutionSequences).set(id, sequence);
    const pending = (this.pendingResolutions.get(id) ?? 0) + 1;
    this.pendingResolutions = new Map(this.pendingResolutions).set(id, pending);
    if (markRefreshing)
      this.markResolving(id);
    return sequence;
  }
  markResolving(id) {
    const previous = this.states.get(id);
    if (!previous || previous.status === "refreshing")
      return;
    this.replaceState(id, freezeState({
      ...previous,
      status: "refreshing",
      nextDueAt: undefined,
      message: undefined
    }));
  }
  endResolution(id, generation) {
    if (generation !== this.generation)
      return;
    const pending = this.pendingResolutions.get(id) ?? 0;
    this.pendingResolutions = pending <= 1 ? withoutKey(this.pendingResolutions, id) : new Map(this.pendingResolutions).set(id, pending - 1);
    this.reschedule();
  }
  resolutionIsCurrent(id, generation, sequence) {
    return this.providerIsCurrent(id, generation) && this.resolutionSequences.get(id) === sequence;
  }
  setContext(provider, credentialEpoch, accountScope, scope) {
    this.contexts = new Map(this.contexts).set(provider.id, Object.freeze({
      selection: provider,
      credentialEpoch,
      accountScope,
      scope: scope.scope,
      scopeKey: scopeIdentity(scope, accountScope)
    }));
  }
  canCommit(gate) {
    const state = this.states.get(gate.id);
    return this.contextIsCurrent(gate.id, gate.generation, gate.credentialEpoch, gate.scopeKey) && state?.requestSequence === gate.requestSequence;
  }
  contextIsCurrent(id, generation, epoch, scopeKey) {
    const context = this.contexts.get(id);
    return this.providerIsCurrent(id, generation) && context?.credentialEpoch === epoch && context.scopeKey === scopeKey;
  }
  providerIsCurrent(id, generation) {
    return !this.disposed && generation === this.generation && this.providers.some((provider) => provider.id === id);
  }
  replaceState(id, next) {
    if (this.disposed || !this.states.has(id))
      return;
    this.states = new Map(this.states).set(id, next);
    this.emit();
    this.reschedule();
  }
  finishOperation(gate) {
    const current = this.operations.get(gate.id);
    if (current?.generation === gate.generation && current.requestSequence === gate.requestSequence) {
      this.operations = withoutKey(this.operations, gate.id);
    }
    this.reschedule();
  }
  emit() {
    if (this.disposed)
      return;
    const states = this.getStates();
    for (const subscriber of this.subscribers) {
      try {
        consumeSubscriberResult(subscriber(states));
      } catch (_error) {}
    }
  }
  reschedule() {
    if (this.disposed)
      return;
    this.cancelTimer();
    const deadline = nearestDeadline(this.getStates(), this.policy, this.busyIds());
    if (deadline === undefined)
      return;
    const sequence = this.timerSequence;
    this.timerHandle = this.timers().setTimeout(() => {
      if (this.disposed || sequence !== this.timerSequence)
        return;
      this.processDeadlines();
    }, Math.max(0, deadline - this.now()));
  }
  processDeadlines() {
    if (this.disposed)
      return;
    this.timerHandle = undefined;
    this.commitStaleTransitions();
    if (this.policy.mode === "automatic") {
      const now = this.now();
      for (const provider of this.providers) {
        const current = this.states.get(provider.id);
        if (provider.ok && !this.isBusy(provider.id) && isDue(current, now)) {
          this.requestProvider(provider, this.generation);
        }
      }
    }
    this.reschedule();
  }
  commitStaleTransitions() {
    const now = this.now();
    let nextStates = this.states;
    let changed = false;
    for (const [id, current] of this.states) {
      if (!becomesStale(current, this.policy, now))
        continue;
      nextStates = new Map(nextStates).set(id, freezeState({ ...current, status: "stale" }));
      changed = true;
    }
    if (!changed || this.disposed)
      return;
    this.states = nextStates;
    this.emit();
  }
  busyIds() {
    return new Set([
      ...this.operations.keys(),
      ...this.pendingResolutions.keys()
    ]);
  }
  isBusy(id) {
    return this.operations.has(id) || this.pendingResolutions.has(id);
  }
  abortAllOperations() {
    for (const operation of this.operations.values())
      operation.controller.abort();
  }
  invalidateResolutions() {
    this.resolutionSequences = new Map(this.providers.map((provider) => [
      provider.id,
      (this.resolutionSequences.get(provider.id) ?? 0) + 1
    ]));
    this.pendingResolutions = new Map;
  }
  cancelTimer() {
    this.timerSequence += 1;
    if (this.timerHandle === undefined)
      return;
    const handle = this.timerHandle;
    this.timerHandle = undefined;
    attemptCleanup(() => this.timers().clearTimeout(handle));
  }
  now() {
    return (this.input.clock ?? DEFAULT_CLOCK).now();
  }
  timers() {
    return this.input.timers ?? DEFAULT_TIMERS;
  }
}
function createRefreshCoordinator(input) {
  return new DeterministicRefreshCoordinator(input);
}
function attemptCleanup(cleanup) {
  try {
    cleanup();
  } catch (_error) {
    return;
  }
}
function consumeSubscriberResult(result) {
  Promise.resolve(result).catch(() => {
    return;
  });
}

// src/views/deepseek-view.ts
function deepseekProviderToView(provider) {
  const status = statusView(provider);
  if (status)
    return status;
  const metrics = [
    stringMetric("status", "status", provider.status === "partial" ? provider.statusText : undefined, 100, { compact: true, tone: "warn" }),
    ...provider.windows.map((window, index) => windowMetric(window, 90 - index)),
    ...providerDetailsToMetrics(provider.details)
  ].filter((metric) => metric !== undefined);
  return {
    id: provider.id,
    title: provider.displayName,
    status: provider.staleAt !== undefined ? "stale" : toViewStatus(provider.status),
    summary: metricSummary(metrics),
    metrics,
    fetchedAt: provider.lastGoodAt ?? provider.fetchedAt,
    ...provider.staleAt !== undefined ? { stale: true } : {}
  };
}

// src/providers/contracts.ts
function defineProvider(input) {
  const metadata = freezeMetadata(input.metadata);
  const credentialPolicy = freezeCredentialPolicy(input.credentialPolicy);
  const registration = createRegistration(input, metadata, credentialPolicy);
  return Object.freeze({ ...input, metadata, credentialPolicy, registration });
}
function createRegistration(definition, metadata, credentialPolicy) {
  return Object.freeze({
    metadata,
    credentialPolicy,
    parseOptions: (input) => {
      const parsed = definition.parseOptions(input);
      if (!parsed.ok)
        return parsed;
      return {
        ok: true,
        value: createBinding(definition, metadata, credentialPolicy, parsed.value)
      };
    }
  });
}
function createBinding(definition, metadata, credentialPolicy, options) {
  return Object.freeze({
    metadata,
    credentialPolicy,
    fetchUsage: (context) => definition.fetchUsage({ ...context, options }),
    present: (provider) => definition.present(provider),
    resolveCacheScopeMetadata: (reader) => definition.resolveCacheScopeMetadata({ options, metadata: reader })
  });
}
function freezeMetadata(metadata) {
  const baseUrls = Object.freeze([...metadata.officialApi.baseUrls]);
  const endpoints = Object.freeze(metadata.officialApi.endpoints.map((endpoint) => Object.freeze({ ...endpoint })));
  const officialApi = Object.freeze({
    ...metadata.officialApi,
    baseUrls,
    endpoints
  });
  return Object.freeze({ ...metadata, officialApi });
}
function freezeCredentialPolicy(policy) {
  const allowedSources = Object.freeze([...policy.allowedSources]);
  const defaultCandidates = Object.freeze(policy.defaultCandidates.map((candidate) => Object.freeze({ ...candidate })));
  return Object.freeze({ allowedSources, defaultCandidates });
}

class LegacyAdapterFacade {
  registration;
  bridge;
  constructor(registration, bridge) {
    this.registration = registration;
    this.bridge = bridge;
  }
  get id() {
    return this.registration.metadata.id;
  }
  get displayName() {
    return this.registration.metadata.displayName;
  }
  get configKey() {
    return this.bridge.configKey;
  }
  isAvailable(context) {
    return this.bridge.isAvailable?.(context) ?? true;
  }
  async fetchUsage(context, signal) {
    const bridged = this.resolveBridge(context, signal);
    if (!bridged.ok)
      return makeLegacyErrorSnapshot(this.registration, bridged.status, bridged.message);
    const parsed = this.registration.parseOptions(bridged.options);
    if (!parsed.ok)
      return makeLegacyConfigErrorSnapshot(this.registration, parsed.issues);
    return parsed.value.fetchUsage(bridged.fetchContext);
  }
  resolveBridge(context, signal) {
    try {
      return this.bridge.resolve(context, signal);
    } catch (error) {
      return { ok: false, status: "error", message: sanitizeError(error) };
    }
  }
}
function makeLegacyConfigErrorSnapshot(registration, issues) {
  const details = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  return makeLegacyErrorSnapshot(registration, "error", `config error: ${details}`);
}
function makeLegacyErrorSnapshot(registration, status, message) {
  const sanitized = sanitizeError(message);
  return {
    id: registration.metadata.id,
    displayName: registration.metadata.displayName,
    status,
    statusText: sanitized,
    ...status === "error" ? { errorMessage: sanitized } : {},
    windows: []
  };
}

// src/providers/shared.ts
function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}
function readString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function readNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  return fallback;
}
function slug(name) {
  return name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "limit";
}
function normalizeEpochMs(value) {
  const epochMs = readNumber(value);
  if (epochMs === undefined || epochMs <= 0)
    return;
  return epochMs < 10000000000 ? epochMs * 1000 : epochMs;
}
function createTimeoutController(timeoutMs, parent) {
  const controller = new AbortController;
  let timeoutId;
  let listening = false;
  const clear = () => {
    if (timeoutId !== undefined)
      clearTimeout(timeoutId);
    timeoutId = undefined;
    if (listening)
      parent?.removeEventListener("abort", abortFromParent);
    listening = false;
  };
  const abortFromParent = () => {
    controller.abort(parent?.reason);
    clear();
  };
  controller.clear = clear;
  controller.dispose = clear;
  if (parent?.aborted) {
    controller.abort(parent.reason);
    return controller;
  }
  timeoutId = setTimeout(() => {
    controller.abort();
    clear();
  }, timeoutMs);
  if (parent) {
    parent.addEventListener("abort", abortFromParent, { once: true });
    listening = true;
  }
  return controller;
}
function createStatusProvider(id, displayName) {
  return (status, message) => ({
    id,
    displayName,
    status,
    statusText: sanitizeError(message),
    errorMessage: status === "error" ? sanitizeError(message) : undefined,
    windows: []
  });
}

// src/providers/deepseek.ts
var BALANCE_URL = "https://api.deepseek.com/user/balance";
var statusProvider = createStatusProvider("deepseek", "deepseek");
var deepseekProviderDefinition = defineProvider({
  metadata: {
    id: "deepseek",
    displayName: "deepseek",
    catalogOrder: 30,
    officialApi: {
      baseUrls: ["https://api.deepseek.com"],
      documentationUrl: "https://api-docs.deepseek.com/api/get-user-balance",
      endpoints: [{ method: "GET", path: "/user/balance" }]
    }
  },
  credentialPolicy: {
    allowedSources: ["opencode", "env"],
    defaultCandidates: [
      { source: "opencode", variant: "deepseek", name: "deepseek" },
      { source: "env", variant: "deepseek", name: "DEEPSEEK_API_KEY" }
    ]
  },
  parseOptions: parseEmptyOptions,
  fetchUsage: fetchDeepseekUsage,
  present: deepseekProviderToView,
  resolveCacheScopeMetadata: () => null
});
var deepseekLegacyBridge = {
  configKey: "show_deepseek",
  isAvailable: () => true,
  resolve: resolveLegacyDeepseekContext
};
var deepseekUsageAdapter = new LegacyAdapterFacade(deepseekProviderDefinition.registration, deepseekLegacyBridge);
async function fetchDeepseekUsage(context) {
  if (context.signal.aborted)
    return statusProvider("error", "cancelled");
  if (context.credential.variant !== "deepseek") {
    return statusProvider("error", "invalid credential variant");
  }
  const controller = createTimeoutController(context.timeoutMs, context.signal);
  try {
    const response = await fetch(BALANCE_URL, {
      headers: { Authorization: `Bearer ${context.credential.secret}`, Accept: "application/json" },
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403)
      return statusProvider("forbidden", "forbidden");
    if (!response.ok)
      return statusProvider("error", `api ${response.status}`);
    return normalizeDeepseekBalance(await response.json());
  } catch (error) {
    const message = context.signal.aborted ? "cancelled" : controller.signal.aborted ? "timeout" : sanitizeCredentialError(error, context.credential.secret);
    return statusProvider("error", message);
  } finally {
    controller.dispose();
  }
}
function resolveLegacyDeepseekContext(context, signal) {
  const credential = resolveLegacyDeepseekCredential(context);
  if (!credential.ok)
    return { ok: false, status: "missing-auth", message: credential.message };
  return {
    ok: true,
    options: {},
    fetchContext: {
      credential: {
        secret: credential.secret,
        source: credential.source,
        variant: "deepseek",
        epoch: 0
      },
      signal,
      timeoutMs: context.timeoutMs
    }
  };
}
function resolveLegacyDeepseekCredential(context) {
  const authCredential = discoverDeepseekCredential(context.auth, {});
  if ("token" in authCredential) {
    return { ok: true, secret: authCredential.token, source: "opencode" };
  }
  const envCredential = discoverDeepseekCredential({}, context.env);
  if ("token" in envCredential) {
    return { ok: true, secret: envCredential.token, source: "env" };
  }
  return { ok: false, message: envCredential.message };
}
function parseEmptyOptions(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return invalidOptions("options", "options must be an object");
  }
  const unknownKey = Object.keys(input)[0];
  return unknownKey ? invalidOptions(unknownKey, "unknown option") : { ok: true, value: Object.freeze({}) };
}
function invalidOptions(path, message) {
  const issues = Object.freeze([{ path, message }]);
  return { ok: false, issues };
}
function normalizeDeepseekBalance(raw, nowMs = Date.now()) {
  const root = asRecord(raw) ?? {};
  const infos = parseBalanceInfos(root.balance_infos);
  const available = root.is_available === true;
  if (infos.length === 0) {
    return {
      id: "deepseek",
      displayName: "deepseek",
      status: "partial",
      statusText: "no balance",
      windows: [],
      fetchedAt: nowMs
    };
  }
  const cny = infos.find((info) => info.currency === "CNY") ?? infos[0];
  return {
    id: "deepseek",
    displayName: "deepseek",
    status: available ? "ready" : "partial",
    ...available ? {} : { statusText: "API access unavailable" },
    windows: [],
    details: balanceDetails(cny, available),
    fetchedAt: nowMs
  };
}
function balanceDetails(info, available) {
  return [
    { key: "balance", label: "balance", value: { kind: "currency", value: info.total, currency: info.currency }, visibility: "summary", priority: 100 },
    { key: "granted", label: "granted", value: { kind: "currency", value: info.granted, currency: info.currency }, visibility: "detail", priority: 80 },
    { key: "topped-up", label: "topped-up", value: { kind: "currency", value: info.topped, currency: info.currency }, visibility: "detail", priority: 70 },
    { key: "available", label: "available", value: { kind: "flag", value: available }, visibility: "debug", priority: 10 }
  ];
}
function parseBalanceInfos(raw) {
  if (!Array.isArray(raw))
    return [];
  return raw.flatMap((entry) => {
    const data = asRecord(entry);
    if (!data)
      return [];
    const currency = readString(data.currency);
    const total = parseAmount(data.total_balance);
    const granted = parseAmount(data.granted_balance);
    const topped = parseAmount(data.topped_up_balance);
    if (!currency || total === undefined)
      return [];
    return [{ currency, total, granted: granted ?? 0, topped: topped ?? 0 }];
  });
}
function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed))
      return parsed;
  }
  return;
}

// src/views/openai-view.ts
function openAIProviderToView(provider) {
  const status = statusView(provider);
  if (status)
    return status;
  const metrics = [
    ...provider.windows.map((window, index) => windowMetric(window, 80 - index)),
    ...providerDetailsToMetrics(provider.details)
  ].filter((metric) => metric !== undefined);
  return {
    id: provider.id,
    title: provider.displayName,
    status: provider.staleAt !== undefined ? "stale" : toViewStatus(provider.status),
    summary: metricSummary(metrics),
    metrics,
    fetchedAt: provider.lastGoodAt ?? provider.fetchedAt,
    ...provider.staleAt !== undefined ? { stale: true } : {}
  };
}

// src/providers/openai.ts
var OPENAI_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
 var statusProvider2 = createStatusProvider("openai", "ChatGPT");
var openaiProviderDefinition = defineProvider({
  metadata: {
    id: "openai",
     displayName: "ChatGPT",
    catalogOrder: 10,
    officialApi: {
      baseUrls: ["https://chatgpt.com"],
      documentationUrl: "https://github.com/chopratejas/headroom/blob/master/headroom/subscription/codex_rate_limits.py",
      endpoints: [{ method: "GET", path: "/backend-api/wham/usage" }]
    }
  },
  credentialPolicy: {
    allowedSources: ["opencode"],
    defaultCandidates: [
      { source: "opencode", variant: "openai", name: "openai" }
    ]
  },
  parseOptions: parseOpenAIOptions,
  fetchUsage: fetchOpenAIUsage,
  present: openAIProviderToView,
  resolveCacheScopeMetadata: () => null
});
var openaiLegacyBridge = {
  configKey: "show_openai",
  isAvailable: () => true,
  resolve: resolveLegacyOpenAIContext
};
var openAIUsageAdapter = new LegacyAdapterFacade(openaiProviderDefinition.registration, openaiLegacyBridge);
async function fetchOpenAIUsage(context) {
  if (context.signal.aborted)
    return statusProvider2("error", "cancelled");
  if (context.credential.source !== "opencode") {
    return statusProvider2("error", "invalid credential source");
  }
  if (context.credential.variant !== "openai")
    return statusProvider2("error", "invalid credential variant");
  const accountId = context.credential.metadata?.accountId;
  const type = context.credential.metadata?.type;
  const expires = Number(context.credential.metadata?.expires);
  if (type !== "oauth")
    return statusProvider2("missing-auth", "oauth missing");
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    return statusProvider2("missing-auth", "oauth expired");
  }
  if (!accountId)
    return statusProvider2("missing-auth", "account id missing");
  const controller = createTimeoutController(context.timeoutMs, context.signal);
  try {
    const response = await fetch(OPENAI_USAGE_URL, {
      headers: createOpenAIHeaders(context.credential.secret, accountId),
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403)
      return statusProvider2("forbidden", "forbidden");
    if (!response.ok)
      return statusProvider2("error", `api ${response.status}`);
    return normalizeWhamUsage(await response.json());
  } catch (error) {
    const message = context.signal.aborted ? "cancelled" : controller.signal.aborted ? "timeout" : sanitizeCredentialError(error, context.credential.secret);
    return statusProvider2("error", message);
  } finally {
    controller.dispose();
  }
}
function createOpenAIHeaders(secret, accountId) {
  return {
    Authorization: `Bearer ${secret}`,
    "ChatGPT-Account-Id": accountId,
    Accept: "application/json",
    Origin: "https://chatgpt.com",
    Referer: "https://chatgpt.com/"
  };
}
function resolveLegacyOpenAIContext(context, signal) {
  const credential = discoverOpenAICredential(context.auth, context.env);
  if (!("token" in credential))
    return {
      ok: false,
      status: "missing-auth",
      message: credential.message
    };
  return {
    ok: true,
    options: {},
    fetchContext: {
      credential: {
        secret: credential.token,
        source: "opencode",
        variant: "openai",
        epoch: 0,
        metadata: {
          accountId: credential.accountId,
          type: "oauth",
          expires: String(credential.expires)
        }
      },
      signal,
      timeoutMs: context.timeoutMs
    }
  };
}
function parseOpenAIOptions(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return invalidOptions2("options", "options must be an object");
  }
  const unknownKey = Object.keys(input)[0];
  return unknownKey ? invalidOptions2(unknownKey, "unknown option") : { ok: true, value: Object.freeze({}) };
}
function invalidOptions2(path, message) {
  const issues = Object.freeze([{ path, message }]);
  return { ok: false, issues };
}
function normalizeWhamUsage(raw, nowMs = Date.now()) {
  const parsed = parseWhamUsage(raw);
  const windows = [
    parsed.primary ? rateWindowToStandard("openai-primary", "rolling", parsed.primary, parsed.limitReached ?? false, nowMs) : undefined,
    parsed.secondary ? rateWindowToStandard("openai-secondary", "weekly", parsed.secondary, false, nowMs) : undefined
  ].filter((window) => window !== undefined);
  const alerts = parsed.additionalLimits.filter((limit) => limit.limitReached).map((limit) => ({
    id: `${slug(limit.label)}-limit`,
    label: `${limit.label} LIMIT`,
    severity: "critical"
  }));
  const status = windows.length > 0 ? "ready" : "partial";
  const details = whamDetails(parsed);
  return {
    id: "openai",
     displayName: "ChatGPT",
    status,
    ...status === "partial" ? { statusText: "partial data" } : {},
    ...parsed.plan ? { plan: parsed.plan } : {},
    windows,
    details,
    ...alerts.length > 0 ? { alerts } : {},
    fetchedAt: nowMs
  };
}
function parseWhamUsage(raw) {
  const data = asRecord(raw) ?? {};
  const rateLimit = asRecord(data.rate_limit) ?? {};
  return {
    plan: readString(data.plan_type),
    primary: parseRateWindow(rateLimit.primary_window),
    secondary: parseRateWindow(rateLimit.secondary_window),
    limitReached: rateLimit.limit_reached === true,
    additionalLimits: parseAdditionalLimits(data.additional_rate_limits),
    properties: collectWhamProperties(data)
  };
}
function parseRateWindow(raw) {
  const data = asRecord(raw);
  if (!data)
    return;
  return {
    usedPercent: readNumber(data.used_percent),
    limitWindowSeconds: readNumber(data.limit_window_seconds),
    resetAfterSeconds: readNumber(data.reset_after_seconds),
    resetAt: readNumber(data.reset_at)
  };
}
function rateWindowToStandard(id, kind, window, limitReached, nowMs) {
  const percentage = window.usedPercent;
  const resetAt = normalizeEpochMs(window.resetAt) ?? resetAfterToEpochMs(window.resetAfterSeconds, nowMs);
  if (percentage === undefined)
    return;
  const standard = {
    id,
    label: kind === "weekly" ? "week" : secondsToLabel(window.limitWindowSeconds),
    kind,
    period: window.limitWindowSeconds !== undefined ? { kind: "rolling", durationMs: window.limitWindowSeconds * 1000 } : { kind: "unknown" },
    usage: { kind: "percent", usedPercent: percentage },
    ...percentage !== undefined ? { percentage } : {},
    ...resetAt !== undefined ? { resetAt } : {},
    ...limitReached ? { limitReached: true } : {}
  };
  return { ...standard, severity: getWindowSeverity(standard) };
}
function whamDetails(parsed) {
  const details = [
    parsed.plan ? { key: "plan", label: "plan", value: { kind: "text", value: parsed.plan }, visibility: "summary", priority: 100 } : undefined
  ];
  return details.filter((detail) => detail !== undefined);
}
function stringDetail(key, label, value, priority) {
  return typeof value === "string" && value.length > 0 ? { key, label, value: { kind: "text", value }, visibility: "detail", priority } : undefined;
}
function booleanDetail(key, label, value, priority) {
  return typeof value === "boolean" ? { key, label, value: { kind: "flag", value }, visibility: "detail", priority } : undefined;
}
function numberDetail(key, label, value, priority) {
  return typeof value === "number" && Number.isFinite(value) ? { key, label, value: { kind: "number", value }, visibility: "debug", priority } : undefined;
}
function arrayDetail(key, label, value, priority) {
  return Array.isArray(value) ? { key, label, value: { kind: "text", value: `items[${value.length}]` }, visibility: "debug", priority } : undefined;
}
function collectWhamProperties(data) {
  const credits = asRecord(data.credits);
  const spendControl = asRecord(data.spend_control);
  const resetCredits = asRecord(data.rate_limit_reset_credits);
  return {
    ...flattenObject("credits", credits),
    ...flattenObject("spendControl", spendControl),
    ...flattenObject("rateLimitResetCredits", resetCredits)
  };
}
function parseAdditionalLimits(raw) {
  if (!Array.isArray(raw))
    return [];
  return raw.flatMap((entry) => {
    const data = asRecord(entry);
    if (!data)
      return [];
    const rateLimit = asRecord(data.rate_limit);
    const label = readString(data.metered_feature) ?? readString(data.limit_name) ?? "limit";
    return [{ label, limitReached: rateLimit?.limit_reached === true }];
  });
}
function flattenObject(prefix, value) {
  if (!value)
    return {};
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [
    `${prefix}${capitalize(key)}`,
    val
  ]));
}
function secondsToLabel(seconds) {
  if (seconds === undefined || seconds <= 0)
    return "rolling";
  if (seconds % 86400 === 0)
    return `${seconds / 86400}d`;
  if (seconds % 3600 === 0)
    return `${seconds / 3600}h`;
  if (seconds % 60 === 0)
    return `${seconds / 60}m`;
  return `${seconds}s`;
}
function resetAfterToEpochMs(seconds, nowMs) {
  return seconds === undefined ? undefined : nowMs + seconds * 1000;
}
function capitalize(value) {
  return value.length === 0 ? value : `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

// src/views/zai-view.ts
function zaiProviderToView(provider) {
  const status = statusView(provider);
  if (status)
    return status;
  const metrics = [
    ...provider.windows.filter((window) => isKnownWindow(window.label)).map((window) => windowMetric(window, priorityForWindow(window.label))),
    ...providerDetailsToMetrics(provider.details)
  ].filter((metric) => metric !== undefined);
  return {
    id: provider.id,
    title: provider.displayName,
    status: provider.staleAt !== undefined ? "stale" : toViewStatus(provider.status),
    summary: metricSummary(metrics),
    metrics,
    fetchedAt: provider.lastGoodAt ?? provider.fetchedAt,
    ...provider.staleAt !== undefined ? { stale: true } : {}
  };
}
function priorityForWindow(label) {
  if (label === "week")
    return 90;
  if (label === "5h")
    return 80;
  if (label === "month")
    return 70;
  return 50;
}
function isKnownWindow(label) {
  return label === "week" || label === "5h" || label === "month";
}

// src/providers/zai.ts
var QUOTA_PATH = "/api/monitor/usage/quota/limit";
var ZAI_BASE_URL = "https://api.z.ai";
var ZHIPU_BASE_URL = "https://open.bigmodel.cn";
var statusProvider3 = createStatusProvider("zai", "z.ai");
var ENTERPRISE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]*$/;
var ZAI_ENTERPRISE_ID_MAX_LENGTH = 128;
var zaiProviderDefinition = defineProvider({
  metadata: {
    id: "zai",
    displayName: "z.ai",
    catalogOrder: 20,
    officialApi: {
      baseUrls: [ZAI_BASE_URL, ZHIPU_BASE_URL],
      documentationUrl: "https://docs.z.ai/guides/overview/usage",
      endpoints: [
        { method: "GET", path: QUOTA_PATH },
        { method: "GET", path: `${QUOTA_PATH}?type=2` }
      ]
    }
  },
  credentialPolicy: {
    allowedSources: ["opencode", "env"],
    defaultCandidates: [
      { source: "opencode", variant: "zai", name: "zai-coding-plan" },
      { source: "opencode", variant: "zai", name: "zai" },
      { source: "opencode", variant: "zhipu", name: "zhipu" },
      { source: "env", variant: "zai", name: "ZAI_API_KEY" },
      { source: "env", variant: "zai", name: "ZAI_CODING_PLAN_API_KEY" },
      { source: "env", variant: "zhipu", name: "ZHIPU_API_KEY" },
      { source: "env", variant: "zhipu", name: "ZHIPUAI_API_KEY" }
    ]
  },
  parseOptions: parseZaiOptions,
  fetchUsage: fetchZaiUsage,
  present: zaiProviderToView,
  resolveCacheScopeMetadata: ({ options, metadata }) => {
    if (options.plan !== "enterprise" || !options.organizationId || !options.projectId)
      return null;
    const credentialVariant = metadata.readAccountIdentifier("credential_variant");
    if (!isZaiCredentialVariant(credentialVariant))
      return null;
    return {
      accountId: JSON.stringify([options.organizationId, options.projectId]),
      credentialVariant,
      dataShape: { plan: "enterprise" }
    };
  }
});
var zaiLegacyBridge = {
  configKey: "show_zai",
  isAvailable: () => true,
  resolve: resolveLegacyZaiContext
};
var zaiUsageAdapter = new LegacyAdapterFacade(zaiProviderDefinition.registration, zaiLegacyBridge);
async function fetchZaiUsage(context) {
  if (context.signal.aborted)
    return statusProvider3("error", "cancelled");
  if (!isZaiCredentialVariant(context.credential.variant)) {
    return statusProvider3("error", "invalid credential variant");
  }
  const baseUrl = context.credential.variant === "zhipu" ? ZHIPU_BASE_URL : ZAI_BASE_URL;
  const path = context.options.plan === "enterprise" ? `${QUOTA_PATH}?type=2` : QUOTA_PATH;
  const headers = createZaiHeaders(context);
  const controller = createTimeoutController(context.timeoutMs, context.signal);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers,
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403)
      return statusProvider3("forbidden", "forbidden");
    if (!response.ok)
      return statusProvider3("error", `api ${response.status}`);
    return normalizeZaiQuota(await response.json(), baseUrl);
  } catch (error) {
    const message = context.signal.aborted ? "cancelled" : controller.signal.aborted ? "timeout" : sanitizeCredentialError(error, context.credential.secret);
    return statusProvider3("error", message);
  } finally {
    controller.dispose();
  }
}
function createZaiHeaders(context) {
  const headers = {
    Authorization: context.credential.secret,
    Accept: "application/json"
  };
  if (context.options.plan !== "enterprise")
    return headers;
  return {
    ...headers,
    "Bigmodel-Organization": context.options.organizationId ?? "",
    "Bigmodel-Project": context.options.projectId ?? ""
  };
}
function resolveLegacyZaiContext(context, signal) {
  const credential = resolveLegacyZaiCredential(context);
  if (!credential.ok)
    return { ok: false, status: "missing-auth", message: credential.message };
  const organizationId = resolveSetting(context.config.zai_organization_id, context.env.ZHIPU_ORGANIZATION_ID);
  const projectId = resolveSetting(context.config.zai_project_id, context.env.ZHIPU_PROJECT_ID);
  const enterprise = organizationId !== undefined && projectId !== undefined;
  return {
    ok: true,
    options: enterprise ? { plan: "enterprise", organization_id: organizationId, project_id: projectId } : { plan: "personal" },
    fetchContext: {
      credential: {
        secret: credential.secret,
        source: credential.source,
        variant: credential.variant,
        epoch: 0
      },
      signal,
      timeoutMs: context.timeoutMs
    }
  };
}
function resolveLegacyZaiCredential(context) {
  const authCredential = discoverZaiCredential(context.auth, {});
  if ("token" in authCredential)
    return toLegacyZaiCredential(authCredential, "opencode");
  const envCredential = discoverZaiCredential({}, context.env);
  if ("token" in envCredential)
    return toLegacyZaiCredential(envCredential, "env");
  return { ok: false, message: envCredential.message };
}
function toLegacyZaiCredential(credential, source) {
  return {
    ok: true,
    secret: credential.token,
    source,
    variant: credential.baseUrl === ZHIPU_BASE_URL ? "zhipu" : "zai"
  };
}
function resolveSetting(configValue, envValue) {
  if (typeof configValue === "string" && configValue.length > 0)
    return configValue;
  if (typeof envValue === "string" && envValue.length > 0)
    return envValue;
  return;
}
function parseZaiOptions(input) {
  const options = asOptionsObject(input);
  if (!options)
    return invalidOptions3("options", "options must be an object");
  const unknownKey = Object.keys(options).find((key) => !["plan", "organization_id", "project_id"].includes(key));
  if (unknownKey)
    return invalidOptions3(unknownKey, "unknown option");
  const plan = readOption(options, "plan") ?? "personal";
  if (plan !== "personal" && plan !== "enterprise")
    return invalidOptions3("plan", "plan must be personal or enterprise");
  const organization = parseIdentifierOption(options, "organization_id");
  if (!organization.ok)
    return organization;
  const project = parseIdentifierOption(options, "project_id");
  if (!project.ok)
    return project;
  if (plan === "personal" && (organization.present || project.present)) {
    return invalidOptions3("organization_id", "enterprise identifiers require enterprise plan");
  }
  const organizationId = organization.value;
  const projectId = project.value;
  if (plan === "enterprise" && (!organizationId || !projectId)) {
    return invalidOptions3("organization_id", "enterprise plan requires organization_id and project_id");
  }
  return {
    ok: true,
    value: { plan, ...organizationId ? { organizationId } : {}, ...projectId ? { projectId } : {} }
  };
}
function parseIdentifierOption(options, key) {
  const present = Object.hasOwn(options, key);
  if (!present)
    return { ok: true, present: false };
  const value = readOption(options, key);
  if (!isSafeEnterpriseId(value)) {
    return {
      ok: false,
      issues: Object.freeze([{ path: key, message: `${key} must be a non-empty string` }])
    };
  }
  return { ok: true, present: true, value };
}
function isSafeEnterpriseId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= ZAI_ENTERPRISE_ID_MAX_LENGTH && ENTERPRISE_ID_PATTERN.test(value) && !hasSecretPattern(value);
}
function asOptionsObject(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? input : undefined;
}
function readOption(options, key) {
  return Reflect.get(options, key);
}
function isZaiCredentialVariant(value) {
  return value === "zai" || value === "zhipu";
}
function invalidOptions3(path, message) {
  const issues = Object.freeze([{ path, message }]);
  return { ok: false, issues };
}
function normalizeZaiQuota(raw, baseUrl = "https://api.z.ai", nowMs = Date.now()) {
  const payload = extractPayload(raw);
  const plan = readString(payload.level);
  const limits = parseLimits(payload.limits);
  const windows = limits.flatMap((limit) => {
    const window = limitToWindow(limit);
    return window ? [window] : [];
  });
  const modelBreakdown = limits.flatMap((limit) => limit.usageDetails ?? []);
  const details = [
    plan ? { key: "plan", label: "plan", value: { kind: "text", value: plan }, visibility: "detail", priority: 100 } : undefined,
    ...modelBreakdown.flatMap((model, index) => {
      const value = model.used ?? model.percentage;
      return value === undefined ? [] : [{
        key: `model-${model.id}`,
        label: model.label,
        value: { kind: "number", value, unit: model.unitLabel ?? (model.used !== undefined ? "usage" : "%") },
        visibility: "detail",
        priority: 70 - index
      }];
    }),
    { key: "provider-base-url", label: "base url", value: { kind: "text", value: baseUrl }, visibility: "debug", priority: 1, tone: "muted" }
  ].filter((detail) => detail !== undefined);
  return {
    id: "zai",
    displayName: "z.ai",
    status: windows.length > 0 ? "ready" : "partial",
    ...windows.length === 0 ? { statusText: "partial data" } : {},
    ...plan ? { plan } : {},
    windows,
    details,
    ...modelBreakdown.length > 0 ? { modelBreakdown } : {},
    fetchedAt: nowMs
  };
}
function extractPayload(raw) {
  const root = asRecord(raw) ?? {};
  return asRecord(root.data) ?? root;
}
function parseLimits(raw) {
  if (!Array.isArray(raw))
    return [];
  return raw.flatMap((entry, index) => {
    const data = asRecord(entry);
    if (!data)
      return [];
    const type = readString(data.type) ?? readString(data.name) ?? `limit-${index + 1}`;
    return [{
      id: slug(`${type}-${readNumber(data.unit) ?? "u"}-${readNumber(data.number) ?? index}`),
      type,
      name: readString(data.name),
      unit: readNumber(data.unit),
      number: readNumber(data.number),
      percentage: readNumber(data.percentage),
      used: readFirstNumber(data.usage, data.used),
      limit: readFirstNumber(data.limit, data.total, data.quantity),
      remaining: readNumber(data.remaining),
      currentValue: readNumber(data.currentValue),
      nextResetTime: readNumber(data.nextResetTime),
      usageDetails: parseUsageDetails(data.usageDetails)
    }];
  });
}
function limitToWindow(limit) {
  const resetAt = normalizeEpochMs(limit.nextResetTime);
  const usage = usageForLimit(limit);
  if (!usage)
    return;
  const standard = {
    id: `zai-${limit.id}`,
    label: labelForLimit(limit),
    kind: kindForLimit(limit),
    period: periodForLimit(limit),
    usage,
    ...limit.percentage !== undefined ? { percentage: limit.percentage } : {},
    ...limit.used !== undefined ? { used: limit.used } : {},
    ...limit.limit !== undefined ? { limit: limit.limit } : {},
    ...limit.remaining !== undefined ? { remaining: limit.remaining } : {},
    ...limit.currentValue !== undefined ? { currentValue: limit.currentValue } : {},
    ...resetAt !== undefined ? { resetAt } : {},
    ...limit.type === "TIME_LIMIT" && limit.limit !== undefined ? { budgetLabel: `${limit.limit}s budget` } : {},
    ...limit.type === "TOKENS_LIMIT" ? { unitLabel: "tokens" } : {},
    ...limit.remaining === 0 || (limit.percentage ?? 0) >= 100 ? { limitReached: true } : {}
  };
  return { ...standard, severity: getWindowSeverity(standard) };
}
function usageForLimit(limit) {
  const unit = unitForLimit(limit);
  if (limit.used !== undefined && limit.limit !== undefined && limit.limit > 0) {
    return { kind: "quota", used: limit.used, limit: limit.limit, unit };
  }
  if (limit.percentage !== undefined)
    return { kind: "percent", usedPercent: limit.percentage };
  return;
}
function periodForLimit(limit) {
  if (limit.unit === 3 && limit.number)
    return { kind: "rolling", durationMs: limit.number * 60 * 60 * 1000 };
  if (limit.unit === 6 && limit.number === 1)
    return { kind: "calendar", unit: "week" };
  if (limit.unit === 5 && limit.number === 1)
    return { kind: "calendar", unit: "month" };
  return { kind: "unknown" };
}
function unitForLimit(limit) {
  if (limit.type === "TIME_LIMIT")
    return "seconds";
  if (limit.type === "TOKENS_LIMIT")
    return "tokens";
  return "units";
}
function parseUsageDetails(raw) {
  if (!Array.isArray(raw))
    return;
  const details = raw.flatMap((entry) => {
    const data = asRecord(entry);
    const modelCode = data ? readString(data.modelCode) ?? readString(data.model) : undefined;
    if (!data || !modelCode)
      return [];
    const percentage = readNumber(data.percentage);
    const used = readFirstNumber(data.usage, data.used);
    const unitLabel = readString(data.unitLabel);
    const requests = readNumber(data.requests);
    const costUsd = readNumber(data.costUsd);
    return [{
      id: slug(modelCode),
      label: modelCode,
      ...percentage !== undefined ? { percentage } : {},
      ...used !== undefined ? { used } : {},
      ...unitLabel !== undefined ? { unitLabel } : {},
      ...requests !== undefined ? { requests } : {},
      ...costUsd !== undefined ? { costUsd } : {}
    }];
  });
  return details.length > 0 ? details : undefined;
}
function labelForLimit(limit) {
  if (limit.unit === 3 && limit.number)
    return `${limit.number}h`;
  if (limit.unit === 6 && limit.number === 1)
    return "week";
  if (limit.unit === 5 && limit.number === 1)
    return "month";
  if (limit.type === "TOKENS_LIMIT")
    return limit.name ?? "tokens";
  return limit.name ?? limit.type.toLowerCase().replace(/_limit$/, "").replace(/_/g, "-");
}
function kindForLimit(limit) {
  if (limit.unit === 3)
    return "rolling";
  if (limit.unit === 6)
    return "weekly";
  if (limit.unit === 5)
    return "monthly";
  if (limit.type === "TOKENS_LIMIT")
    return "tokens";
  if (limit.type === "RATE_LIMIT" || limit.type === "TIMES_LIMIT")
    return "requests";
  return "unknown";
}
function readFirstNumber(...values) {
  return values.map(readNumber).find((value) => value !== undefined);
}

// src/providers/builtins.ts
var BUILTIN_PROVIDER_CATALOG = createProviderCatalog([
  openaiProviderDefinition.registration,
  zaiProviderDefinition.registration,
  deepseekProviderDefinition.registration
]);
function createProviderCatalog(registrations) {
  const ordered = [...registrations].sort(compareRegistrations);
  assertUniqueCatalogFields(ordered);
  return Object.freeze(ordered);
}
function compareRegistrations(left, right) {
  return left.metadata.catalogOrder - right.metadata.catalogOrder || left.metadata.id.localeCompare(right.metadata.id);
}
function assertUniqueCatalogFields(registrations) {
  const ids = new Set;
  const orders = new Set;
  for (const registration of registrations) {
    const { id, catalogOrder } = registration.metadata;
    if (ids.has(id))
      throw new Error(`Duplicate provider id: ${id}`);
    if (orders.has(catalogOrder))
      throw new Error(`Duplicate provider catalog order: ${catalogOrder}`);
    ids.add(id);
    orders.add(catalogOrder);
  }
}

// src/runtime-config.ts
var ROOT_KEYS = ["version", "enabled", "keybindings", "ui", "refresh", "diagnostics", "providers"];
var PROVIDER_KEYS = ["order", "credential", "options"];
var V1_KEYS = [
  "default_collapsed",
  "default_provider_collapsed",
  "debug",
  "max_detail_lines",
  "max_model_lines",
  "max_windows",
  "refresh_keybind",
  "refresh_ms",
  "request_timeout_ms",
  "show_deepseek",
  "show_details",
  "show_openai",
  "show_zai",
  "symbols",
  "width",
  "zai_organization_id",
  "zai_project_id"
];
var MIN_AUTOMATIC_INTERVAL_MS = 60000;
var MAX_INTERVAL_MS = 86400000;
var MIN_TIMEOUT_MS = 1000;
var MAX_TIMEOUT_MS = 120000;
var MIN_STALE_AFTER_MS = 60000;
var MAX_STALE_AFTER_MS = 604800000;
var MIN_WIDTH = 20;
var MAX_WIDTH = 120;
var MAX_PROVIDER_ORDER = 1e4;
var MAX_OPTIONS_DEPTH = 8;
var KEYBINDING_PATTERN = /^[\x20-\x7E]{1,64}$/;
var DEFAULTS = Object.freeze({
  enabled: true,
  keybindings: Object.freeze({ refresh_all: "<leader>q", refresh_provider: null }),
  ui: Object.freeze({
    width: 34,
    symbols: "unicode",
    panel_initial_state: "expanded",
    provider_initial_state: "collapsed"
  }),
  refresh: Object.freeze({
    mode: "automatic",
    interval_ms: 300000,
    timeout_ms: 15000,
    stale_after_ms: 600000
  }),
  diagnostics: Object.freeze({ debug: false })
});
function parseUsageConfigV2(input, catalog = BUILTIN_PROVIDER_CATALOG) {
  const structural = parseStructuralConfig(input, catalog);
  if (!structural.ok)
    return structural;
  return { ok: true, value: resolveConfig(structural.value) };
}
async function readUsageConfigV2(options = {}) {
  const readText = options.readText ?? readConfigText;
  const dedicated = await safelyRead(readText, options.dedicatedPath ?? CONFIG_PATH);
  if (!dedicated.ok)
    return dedicated;
  if (dedicated.value.exists)
    return parseConfigText(dedicated.value.text, "config");
  return readOmoConfig(readText, options.omoPath ?? OMO_CONFIG_PATH);
}
async function readOmoConfig(readText, path) {
  const source = await safelyRead(readText, path);
  if (!source.ok)
    return source;
  if (!source.value.exists)
    return failure("config", "Usage monitor config file not found");
  const parsed = parseJson(source.value.text, "usage_monitor");
  if (!parsed.ok)
    return parsed;
  if (!isObject(parsed.value))
    return failure("usage_monitor", "OMO config must be an object");
  const section = parsed.value.usage_monitor;
  if (section === undefined)
    return failure("usage_monitor", "usage_monitor config section is required");
  return parseUsageConfigV2(section);
}
async function safelyRead(readText, path) {
  try {
    return { ok: true, value: await readText(path) };
  } catch (error) {
    return failure("config", `Unable to read config: ${sanitizeError(error)}`);
  }
}
async function readConfigText(path) {
  const file = Bun.file(path);
  if (!await file.exists())
    return { exists: false };
  return { exists: true, text: await file.text() };
}
function parseConfigText(text, path) {
  const parsed = parseJson(text, path);
  return parsed.ok ? parseUsageConfigV2(parsed.value) : parsed;
}
function parseJson(text, path) {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, value: parsed };
  } catch (_error) {
    return failure(path, "Malformed JSON configuration");
  }
}
function parseStructuralConfig(input, catalog) {
  if (!isObject(input))
    return failure("config", "Configuration must be an object");
  if (looksLikeV1(input))
    return failure("version", "v1 config detected; migrate to version 2");
  const providerResult = parseProviders(input.providers, catalog);
  const issues = [
    ...unknownKeyIssues(input, ROOT_KEYS, ""),
    ...validateRootScalars(input),
    ...validateKeybindings(input.keybindings),
    ...validateUi(input.ui),
    ...validateRefresh(input.refresh),
    ...validateDiagnostics(input.diagnostics),
    ...!providerResult.ok ? providerResult.issues : []
  ];
  if (issues.length > 0)
    return failures(issues);
  if (!providerResult.ok)
    return providerResult;
  return { ok: true, value: buildStructuralConfig(input, providerResult.value) };
}
function validateRootScalars(input) {
  return [
    ...input.version === 2 ? [] : [makeIssue("version", "version must equal 2")],
    ...optionalTypeIssue(input.enabled, "boolean", "enabled"),
    ...input.providers === undefined ? [makeIssue("providers", "providers is required")] : []
  ];
}
function parseProviders(input, catalog) {
  if (!isObject(input))
    return failure("providers", "providers must be an object");
  const parsed = Object.entries(input).map(([id, value]) => parseProvider(id, value, catalog));
  const issues = parsed.flatMap((result) => result.ok ? [] : result.issues);
  if (issues.length > 0)
    return failures(issues);
  return { ok: true, value: Object.freeze(parsed.flatMap((result) => result.ok ? [result.value] : [])) };
}
function parseProvider(id, input, catalog) {
  const registration = catalog.find((candidate) => candidate.metadata.id === id);
  if (!registration)
    return failure(`providers.${id}`, "unknown provider id");
  if (!isObject(input))
    return failure(`providers.${id}`, "provider config must be an object");
  const path = `providers.${id}`;
  const credential = parseCredential(input.credential, `${path}.credential`);
  const issues = [
    ...unknownKeyIssues(input, PROVIDER_KEYS, path),
    ...optionalIntegerRangeIssue(input.order, 0, MAX_PROVIDER_ORDER, `${path}.order`),
    ...!credential.ok ? credential.issues : [],
    ...optionBoundaryIssues(input.options, `${path}.options`),
    ...credential.ok && credential.value && !isAllowedCredentialReference(registration, credential.value) ? [makeIssue(`${path}.credential.source`, "credential reference is not allowed for this provider")] : []
  ];
  if (issues.length > 0)
    return failures(issues);
  return {
    ok: true,
    value: Object.freeze({
      registration,
      order: typeof input.order === "number" ? input.order : registration.metadata.catalogOrder,
      ...credential.ok && credential.value ? { credential: credential.value } : {},
      options: input.options ?? {}
    })
  };
}
function isAllowedCredentialReference(registration, reference) {
  const name = reference.source === "env" ? reference.name : reference.entry;
  return registration.credentialPolicy.allowedSources.includes(reference.source) && registration.credentialPolicy.defaultCandidates.some((candidate) => candidate.source === reference.source && candidate.name === name);
}
function parseCredential(input, path) {
  if (input === undefined)
    return { ok: true, value: undefined };
  if (!isObject(input))
    return failure(path, "credential must be a reference object");
  if (input.source === "opencode")
    return parseOpencodeCredential(input, path);
  if (input.source === "env")
    return parseEnvCredential(input, path);
  return failure(`${path}.source`, "credential source must be opencode or env");
}
function parseOpencodeCredential(input, path) {
  const issues = [
    ...unknownKeyIssues(input, ["source", "entry"], path),
    ...referenceNameIssues(input.entry, `${path}.entry`, /^[A-Za-z0-9._-]+$/, "valid OpenCode entry")
  ];
  if (issues.length > 0)
    return failures(issues);
  return { ok: true, value: Object.freeze({ source: "opencode", entry: readString2(input.entry) }) };
}
function parseEnvCredential(input, path) {
  const issues = [
    ...unknownKeyIssues(input, ["source", "name"], path),
    ...referenceNameIssues(input.name, `${path}.name`, /^[A-Z][A-Z0-9_]{0,127}$/, "environment variable name")
  ];
  if (issues.length > 0)
    return failures(issues);
  return { ok: true, value: Object.freeze({ source: "env", name: readString2(input.name) }) };
}
function referenceNameIssues(input, path, pattern, description) {
  if (typeof input !== "string" || input.length === 0 || input.length > 128) {
    return [makeIssue(path, `${description} is required`)];
  }
  if (input.includes("${") || !pattern.test(input))
    return [makeIssue(path, `must be a ${description} without interpolation`)];
  return [];
}
function validateKeybindings(input) {
  if (input === undefined)
    return [];
  if (!isObject(input))
    return [makeIssue("keybindings", "keybindings must be an object")];
  return [
    ...unknownKeyIssues(input, ["refresh_all", "refresh_provider"], "keybindings"),
    ...keybindingIssues(input.refresh_all, "keybindings.refresh_all"),
    ...keybindingIssues(input.refresh_provider, "keybindings.refresh_provider")
  ];
}
function keybindingIssues(input, path) {
  if (input === undefined || input === null)
    return [];
  return typeof input === "string" && KEYBINDING_PATTERN.test(input) ? [] : [makeIssue(path, "keybinding must be null or 1 to 64 printable single-line characters")];
}
function optionBoundaryIssues(input, path, depth = 0) {
  if (!Array.isArray(input) && !isObject(input))
    return [];
  if (depth > MAX_OPTIONS_DEPTH)
    return [makeIssue(path, "options exceed maximum nesting depth")];
  if (Array.isArray(input)) {
    return input.flatMap((value, index) => optionBoundaryIssues(value, `${path}.${index}`, depth + 1));
  }
  return Object.entries(input).flatMap(([key, value]) => {
    const fieldPath = `${path}.${key}`;
    if (looksSecretKey(key))
      return [makeIssue(fieldPath, "raw credential-like option field is not allowed")];
    return optionBoundaryIssues(value, fieldPath, depth + 1);
  });
}
function validateUi(input) {
  if (input === undefined)
    return [];
  if (!isObject(input))
    return [makeIssue("ui", "ui must be an object")];
  return [
    ...unknownKeyIssues(input, ["width", "symbols", "panel_initial_state", "provider_initial_state"], "ui"),
    ...optionalIntegerRangeIssue(input.width, MIN_WIDTH, MAX_WIDTH, "ui.width"),
    ...optionalEnumIssue(input.symbols, ["unicode", "ascii"], "ui.symbols"),
    ...optionalEnumIssue(input.panel_initial_state, ["expanded", "collapsed"], "ui.panel_initial_state"),
    ...optionalEnumIssue(input.provider_initial_state, ["expanded", "collapsed"], "ui.provider_initial_state")
  ];
}
function validateRefresh(input) {
  if (input === undefined)
    return [];
  if (!isObject(input))
    return [makeIssue("refresh", "refresh must be an object")];
  const mode = input.mode ?? DEFAULTS.refresh.mode;
  const intervalMinimum = mode === "automatic" ? MIN_AUTOMATIC_INTERVAL_MS : 0;
  return [
    ...unknownKeyIssues(input, ["mode", "interval_ms", "timeout_ms", "stale_after_ms"], "refresh"),
    ...optionalEnumIssue(input.mode, ["automatic", "manual"], "refresh.mode"),
    ...optionalIntegerRangeIssue(input.interval_ms, intervalMinimum, MAX_INTERVAL_MS, "refresh.interval_ms"),
    ...optionalIntegerRangeIssue(input.timeout_ms, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, "refresh.timeout_ms"),
    ...optionalIntegerRangeIssue(input.stale_after_ms, MIN_STALE_AFTER_MS, MAX_STALE_AFTER_MS, "refresh.stale_after_ms")
  ];
}
function validateDiagnostics(input) {
  if (input === undefined)
    return [];
  if (!isObject(input))
    return [makeIssue("diagnostics", "diagnostics must be an object")];
  return [
    ...unknownKeyIssues(input, ["debug"], "diagnostics"),
    ...optionalTypeIssue(input.debug, "boolean", "diagnostics.debug")
  ];
}
function resolveConfig(input) {
  const providers = Object.freeze(input.providers.map(resolveProvider).sort(compareResolvedProviders));
  return Object.freeze({
    version: 2,
    enabled: input.enabled,
    keybindings: Object.freeze({ ...DEFAULTS.keybindings, ...input.keybindings }),
    ui: Object.freeze({ ...DEFAULTS.ui, ...input.ui }),
    refresh: Object.freeze({ ...DEFAULTS.refresh, ...input.refresh }),
    diagnostics: Object.freeze({ ...DEFAULTS.diagnostics, ...input.diagnostics }),
    providers
  });
}
function resolveProvider(input) {
  const parsed = input.registration.parseOptions(input.options);
  const common = {
    id: input.registration.metadata.id,
    order: input.order,
    registration: input.registration,
    ...input.credential ? { credential: input.credential } : {}
  };
  if (parsed.ok)
    return Object.freeze({ ...common, ok: true, binding: parsed.value });
  const issues = Object.freeze(parsed.issues.map((issue) => Object.freeze({
    path: `providers.${input.registration.metadata.id}.options.${sanitizeError(issue.path)}`,
    message: sanitizeError(issue.message)
  })));
  return Object.freeze({ ...common, ok: false, issues });
}
function compareResolvedProviders(left, right) {
  return left.order - right.order || left.registration.metadata.catalogOrder - right.registration.metadata.catalogOrder || left.id.localeCompare(right.id);
}
function buildStructuralConfig(input, providers) {
  return Object.freeze({
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULTS.enabled,
    keybindings: isObject(input.keybindings) ? input.keybindings : {},
    ui: isObject(input.ui) ? input.ui : {},
    refresh: isObject(input.refresh) ? input.refresh : {},
    diagnostics: isObject(input.diagnostics) ? input.diagnostics : {},
    providers
  });
}
function unknownKeyIssues(input, allowed, parent) {
  return Object.keys(input).filter((key) => !allowed.includes(key)).map((key) => makeIssue(parent ? `${parent}.${key}` : key, "unknown field"));
}
function optionalTypeIssue(input, expected, path) {
  return input === undefined || typeof input === expected ? [] : [makeIssue(path, `must be a ${expected}`)];
}
function optionalEnumIssue(input, allowed, path) {
  return input === undefined || allowed.includes(typeof input === "string" ? input : "") ? [] : [makeIssue(path, `must be one of ${allowed.join(", ")}`)];
}
function optionalIntegerRangeIssue(input, minimum, maximum, path) {
  if (input === undefined)
    return [];
  return typeof input === "number" && Number.isInteger(input) && input >= minimum && input <= maximum ? [] : [makeIssue(path, `must be an integer between ${minimum} and ${maximum}`)];
}
function looksLikeV1(input) {
  return input.version === 1 || input.version === undefined && V1_KEYS.some((key) => (key in input));
}
function isObject(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function readString2(input) {
  return typeof input === "string" ? input : "";
}
function makeIssue(path, message) {
  return Object.freeze({ path: sanitizeError(path), message: sanitizeError(message) });
}
function failure(path, message) {
  return failures([makeIssue(path, message)]);
}
function failures(issues) {
  return { ok: false, issues: Object.freeze([...issues]) };
}

// src/views/index.ts
function providerToView(provider) {
  if (provider.id === "openai")
    return openAIProviderToView(provider);
  if (provider.id === "zai")
    return zaiProviderToView(provider);
  if (provider.id === "deepseek")
    return deepseekProviderToView(provider);
  const status = statusView(provider);
  if (status)
    return status;
  const metrics = [
    stringMetric("plan", "plan", provider.plan, 100, { compact: true }),
    ...provider.windows.map((window, index) => windowMetric(window, 80 - index))
  ].filter((metric) => metric !== undefined);
  return {
    id: provider.id,
    title: provider.displayName,
    status: provider.staleAt !== undefined ? "stale" : toViewStatus(provider.status),
    summary: metricSummary(metrics),
    metrics,
    fetchedAt: provider.lastGoodAt ?? provider.fetchedAt,
    ...provider.staleAt !== undefined ? { stale: true } : {}
  };
}

// src/tui.ts
function element(tag, props, children = []) {
  const node = createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined)
      setProp(node, key, value);
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false)
      insert(node, child);
  }
  return node;
}
function text(props, children) {
  return element("text", props, children);
}
function box(props, children = []) {
  return element("box", props, children);
}
function createRefreshGuard() {
  let active = false;
  return {
    get isActive() {
      return active;
    },
    start: () => {
      if (active)
        return false;
      active = true;
      return true;
    },
    finish: () => {
      active = false;
    }
  };
}
function renderUsagePanel(config, providers, collapsed, collapsedProviderIds, expandedDetailIds, onToggleCollapsed, onToggleProvider, onToggleDetails, theme) {
  const width = resolveWidth(config);
  const right = buildHeaderRight(providers);
  const headerLine = formatHeader(Object.keys(providers).length, right, collapsed, width, config.symbols);
  const header = box({ width: "100%", onMouseDown: onToggleCollapsed }, [
    renderText(headerLine.text, colorForSeverity(headerLine.severity, theme))
  ]);
  if (collapsed || config.enabled === false)
    return renderPanel([header]);
  const rows = orderedProviders(providers).map((provider) => renderProviderBlock(providerToView(provider), config, collapsedProviderIds, expandedDetailIds, onToggleProvider, onToggleDetails, theme));
  return renderPanel([header, ...rows]);
}
function toggleProviderCollapse(current, clicked) {
  if (current.has(clicked)) {
    return new Set([...current].filter((id) => id !== clicked));
  }
  return new Set([...current, clicked]);
}
var toggleExpandedProviderId = toggleProviderCollapse;
function renderProviderBlock(view, config, collapsedProviderIds, expandedDetailIds, onToggleProvider, onToggleDetails, theme) {
  const width = resolveWidth(config);
  const providerCollapsed = collapsedProviderIds.has(view.id);
  if (providerCollapsed) {
    return box({
      width: "100%",
      flexDirection: "column",
      onMouseDown: () => onToggleProvider(view.id)
    }, renderLines([formatCollapsedSummary(view, width)], theme));
  }
  const showDetails = expandedDetailIds.has(view.id);
  const titleLine = formatProviderTitle(view, false, width);
  const metrics = formatProviderMetricsForState(view, config, width, showDetails);
  const titleEl = box({ width: "100%", onMouseDown: () => onToggleProvider(view.id) }, renderLines([titleLine], theme));
  const metricEls = metrics.map((line) => box({ width: "100%", onMouseDown: () => onToggleDetails(view.id) }, renderLines([line], theme)));
  return box({ width: "100%", flexDirection: "column" }, [
    titleEl,
    ...metricEls
  ]);
}
function renderLines(lines, theme) {
  return lines.map((line) => {
    if (line.suffix) {
      return box({ flexDirection: "row" }, [
        text({ fg: colorForSeverity(line.severity, theme) }, [
          truncateTo(line.text, line.text.length)
        ]),
        text({ fg: theme.textMuted }, [
          truncateTo(` \xB7 ${line.suffix}`, line.suffix.length + 3)
        ])
      ]);
    }
    return renderText(line.text, colorForSeverity(line.severity, theme));
  });
}
function renderText(value, color) {
  return text({ fg: color }, [truncateTo(value, value.length)]);
}
function renderPanel(children) {
  return box({
    width: "100%",
    flexDirection: "column",
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0
  }, children);
}
function colorForSeverity(severity, theme) {
  if (severity === "warning")
    return theme.accent;
  if (severity === "critical")
    return theme.error ?? theme.accent;
  if (severity === "muted")
    return theme.textMuted;
  return theme.text;
}
function buildHeaderRight(providers) {
  const timestamps = Object.values(providers).flatMap((provider) => {
    if (provider.fetchedAt !== undefined)
      return [provider.fetchedAt];
    if (provider.lastGoodAt !== undefined)
      return [provider.lastGoodAt];
    return [];
  });
  if (timestamps.length === 0)
    return "";
  const now = Date.now();
  const newest = Math.max(...timestamps);
  return formatAge(newest, now);
}
function orderedProviders(providers) {
  const preferred = ["openai", "zai", "deepseek"];
  return Object.values(providers).sort((left, right) => {
    const leftIndex = preferred.indexOf(left.id);
    const rightIndex = preferred.indexOf(right.id);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}
function resolveWidth(config) {
  return Number.isFinite(config.width) && config.width > 0 ? config.width : CONFIG_DEFAULTS.width;
}
function withPreviousGood(next, previous) {
  return Object.fromEntries(Object.entries(next).map(([id, provider]) => {
    const previousProvider = previous[id];
    if (provider.status !== "error" || previousProvider?.fetchedAt === undefined)
      return [id, provider];
    return [id, { ...provider, lastGoodAt: previousProvider.fetchedAt }];
  }));
}
async function readRuntimeConfig() {
  const v2 = await readUsageConfigV2();
  if (v2.ok && v2.value.providers.length > 0) {
    const render = renderConfigFromV2(v2.value);
    return {
      config: v2.value,
      render,
      providers: {},
      fingerprint: configFingerprint(render)
    };
  }
  const message = v2.ok ? "No providers configured" : formatConfigIssues(v2.issues);
  return configErrorRuntime(message);
}
function createRuntimeCoordinator(config) {
  return createRefreshCoordinator({
    providers: config.providers,
    policy: config.refresh,
    credentialResolver: createCredentialResolver(),
    cache: createProviderCacheV2()
  });
}
function renderConfigFromV2(config) {
  return {
    ...CONFIG_DEFAULTS,
    enabled: config.enabled,
    default_collapsed: config.ui.panel_initial_state === "collapsed",
    refresh_ms: config.refresh.interval_ms,
    request_timeout_ms: config.refresh.timeout_ms,
    show_openai: config.providers.some((provider) => provider.id === "openai"),
    show_zai: config.providers.some((provider) => provider.id === "zai"),
    show_deepseek: config.providers.some((provider) => provider.id === "deepseek"),
    default_provider_collapsed: config.ui.provider_initial_state === "collapsed",
    debug: config.diagnostics.debug,
    width: config.ui.width,
    symbols: config.ui.symbols,
    refresh_keybind: config.keybindings.refresh_all ?? CONFIG_DEFAULTS.refresh_keybind
  };
}
function runtimeStatesToProviders(states, previous) {
  return withPreviousGood(Object.fromEntries(states.map((state) => [
    state.id,
    runtimeStateToProvider(state, previous[state.id])
  ])), previous);
}
function runtimeStateToProvider(state, previous) {
  if (state.snapshot)
    return snapshotForRuntimeState(state, previous);
  const status = state.status === "needs_auth" ? "missing-auth" : state.status === "loading" || state.status === "refreshing" ? "loading" : "error";
  return {
    id: state.id,
    displayName: state.id,
    status,
    statusText: state.message,
    errorMessage: state.message,
    windows: [],
    ...previous?.fetchedAt ? { lastGoodAt: previous.fetchedAt } : {}
  };
}
function snapshotForRuntimeState(state, previous) {
  const snapshot = state.snapshot;
  if (!snapshot)
    return runtimeStateToProvider({ ...state, snapshot: undefined }, previous);
  if (state.status === "stale")
    return { ...snapshot, staleAt: state.lastAttemptAt ?? Date.now() };
  if (state.status === "refreshing")
    return {
      ...snapshot,
      ...previous?.fetchedAt ? { lastGoodAt: previous.fetchedAt } : {}
    };
  return snapshot;
}
function configErrorRuntime(message) {
  return {
    render: { ...CONFIG_DEFAULTS, default_provider_collapsed: false },
    providers: {
      config: {
        id: "config",
        displayName: "config",
        status: "error",
        statusText: message,
        errorMessage: message,
        windows: []
      }
    },
    fingerprint: `config-error:${message}`
  };
}
function formatConfigIssues(issues) {
  return issues.slice(0, 3).map((issue) => `${issue.path}: ${issue.message}`).join("; ");
}
var plugin = {
  id: "usage-monitor:tui",
  tui: async (api, _options, _meta) => {
    const initialRuntime = await readRuntimeConfig();
    if (initialRuntime.render.enabled === false)
      return;
    const [getConfig, setConfig] = createSignal(initialRuntime.render);
    const [getProviders, setProviders] = createSignal({});
    const [getCollapsed, setCollapsed] = createSignal(initialRuntime.render.default_collapsed);
    const [getCollapsedProviderIds, setCollapsedProviderIds] = createSignal(new Set);
    const [getExpandedDetailIds, setExpandedDetailIds] = createSignal(new Set);
    let configWatcher;
    let fingerprint = initialRuntime.fingerprint;
    let unregisterRefreshCommand;
    let providerCollapseInitialized = false;
    let coordinator = initialRuntime.config ? createRuntimeCoordinator(initialRuntime.config) : undefined;
    const requestRender = () => api.renderer.requestRender();
    const setProvidersWithInitialCollapse = (providers) => {
      setProviders(providers);
      if (providerCollapseInitialized || !getConfig().default_provider_collapsed || Object.keys(providers).length === 0)
        return;
      providerCollapseInitialized = true;
      setCollapsedProviderIds(new Set(Object.keys(providers)));
    };
    let unsubscribe = coordinator?.subscribe((states) => {
      setProvidersWithInitialCollapse(runtimeStatesToProviders(states, getProviders()));
      requestRender();
    }) ?? (() => {
      return;
    });
    setProvidersWithInitialCollapse(initialRuntime.providers);
    const reloadConfig = async () => {
      const nextRuntime = await readRuntimeConfig();
      const nextFingerprint = nextRuntime.fingerprint;
      if (nextFingerprint === fingerprint)
        return;
      fingerprint = nextFingerprint;
      setConfig(nextRuntime.render);
      if (!nextRuntime.config) {
        unsubscribe();
        coordinator?.dispose();
        coordinator = undefined;
        unsubscribe = () => {
          return;
        };
        setProvidersWithInitialCollapse(nextRuntime.providers);
        requestRender();
        return;
      }
      if (coordinator) {
        coordinator.reconfigure(nextRuntime.config.providers, nextRuntime.config.refresh);
      } else {
        coordinator = createRuntimeCoordinator(nextRuntime.config);
        unsubscribe = coordinator.subscribe((states) => {
          setProvidersWithInitialCollapse(runtimeStatesToProviders(states, getProviders()));
          requestRender();
        });
      }
      setProvidersWithInitialCollapse(nextRuntime.providers);
      coordinator.refreshAll();
      requestRender();
    };
    const debounceConfigReload = createDebounced(() => void reloadConfig(), 100);
    try {
      configWatcher = watch(CONFIG_PATH, () => debounceConfigReload());
    } catch {
      configWatcher = undefined;
    }
    const toggleCollapsed = () => {
      setCollapsed(!getCollapsed());
      requestRender();
    };
    const toggleProvider = (id) => {
      setCollapsedProviderIds(toggleProviderCollapse(getCollapsedProviderIds(), id));
      requestRender();
    };
    const toggleDetails = (id) => {
      const current = getExpandedDetailIds();
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setExpandedDetailIds(next);
      requestRender();
    };
    coordinator?.refreshAll();
    api.lifecycle.onDispose(() => {
      debounceConfigReload.cancel();
      configWatcher?.close();
      unsubscribe();
      coordinator?.dispose();
      unregisterRefreshCommand?.();
    });
    api.slots.register({
      order: 840,
      slots: {
        sidebar_content() {
          try {
            return renderUsagePanel(getConfig(), getProviders(), getCollapsed(), getCollapsedProviderIds(), getExpandedDetailIds(), toggleCollapsed, toggleProvider, toggleDetails, api.theme.current);
          } catch (renderErr) {
            const theme = api.theme.current;
            return box({ width: "100%" }, [
              text({ fg: theme.error ?? theme.textMuted }, [
                `usage-monitor render error: ${String(renderErr).slice(0, 80)}`
              ])
            ]);
          }
        }
      }
    });
    unregisterRefreshCommand = api.command?.register(() => [
      {
        title: "Refresh Usage Data",
        value: "usage-monitor:refresh",
        description: "Force refresh usage data from all providers",
        category: "usage-monitor",
        keybind: getConfig().refresh_keybind,
        slash: { name: "usage-refresh" },
        onSelect: async (_dialog) => {
          try {
            if (!coordinator)
              throw new Error("usage monitor config is invalid");
            await coordinator.refreshAll();
            api.ui.toast({
              title: "Usage Monitor",
              message: "Usage data refreshed",
              variant: "success",
              duration: 2000
            });
          } catch (error) {
            api.ui.toast({
              title: "Usage Monitor",
              message: `Usage data refresh failed: ${sanitizeError(error)}`,
              variant: "error",
              duration: 2000
            });
          }
        }
      }
    ]);
  }
};
function createDebounced(callback, delayMs) {
  let timer;
  const debounced = () => {
    if (timer !== undefined)
      clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
  debounced.cancel = () => {
    if (timer !== undefined)
      clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}
var tui_default = plugin;
export {
  toggleProviderCollapse,
  toggleExpandedProviderId,
  runtimeStatesToProviders,
  renderUsagePanel,
  tui_default as default,
  createRefreshGuard
};
