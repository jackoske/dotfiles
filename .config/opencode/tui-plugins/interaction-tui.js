import { createElement, insert, setProp } from "@opentui/solid";

const safeArray = (fn, fallback = []) => {
  try {
    const value = fn();
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const text = (value, color) => {
  const node = createElement("text");
  if (color !== undefined) setProp(node, "fg", color);
  insert(node, String(value));
  return node;
};

const panel = (lines, theme) => {
  const node = createElement("box");
  setProp(node, "width", "100%");
  setProp(node, "flexDirection", "column");
  for (const [value, color] of lines) insert(node, text(value, color));
  return node;
};

const short = (value, limit = 48) => {
  const oneLine = String(value ?? "").replace(/[\r\n]/g, " ");
  return oneLine.length > limit ? `${oneLine.slice(0, limit - 1)}…` : oneLine;
};

const eventSessionID = (event) => event?.properties?.sessionID ?? event?.properties?.info?.id;

export default {
  id: "interaction-tui",
  tui: async (api) => {
    const unsubs = [];
    const notified = new Set();
    let disposed = false;

    const render = (sessionID) => {
      try {
        const state = api.state;
        const todos = safeArray(() => state.session.todo(sessionID));
        const permissions = safeArray(() => state.session.permission(sessionID));
        const questions = safeArray(() => state.session.question(sessionID));
        const status = state.session.status(sessionID)?.type ?? "unknown";
        const branch = state.vcs?.branch ?? "no branch";
        const directory = state.path?.directory ?? "unknown directory";
        const lsp = safeArray(() => state.lsp());
        const mcp = safeArray(() => state.mcp());
        const lspIssues = lsp.filter((item) => item?.status === "error").length;
        const mcpIssues = mcp.filter((item) => !["connected", "disabled"].includes(item?.status)).length;
        const pendingTodos = todos.filter((item) => ["pending", "in_progress"].includes(item?.status)).length;
        const theme = api.theme.current;
        const issueColor = lspIssues + mcpIssues ? theme.warning : theme.textMuted;
        return panel([
          [`Todo ${pendingTodos}/${todos.length} pending`, pendingTodos ? theme.accent : theme.textMuted],
          [`Ask ${questions.length}  Perm ${permissions.length}`, questions.length + permissions.length ? theme.warning : theme.textMuted],
          [`Session ${status}`, status === "error" ? theme.error : theme.text],
          [`${short(branch, 26)} · ${short(directory, 30)}`, theme.textMuted],
          [`LSP ${lspIssues}  MCP ${mcpIssues}`, issueColor]
        ], theme);
      } catch (error) {
        return panel([[`interaction status unavailable: ${short(error, 54)}`, api.theme.current.textMuted]], api.theme.current);
      }
    };

    const notify = (event, title, message, sound) => {
      const properties = event?.properties ?? {};
      const identity = event?.id ?? properties.id ?? properties.requestID;
      if (!identity) return;
      const key = `${event?.type}:${identity}`;
      if (notified.has(key)) return;
      notified.add(key);
      if (notified.size > 128) notified.delete(notified.values().next().value);
      const safeMessage = short(message, 120);
      void api.attention
        .notify({ title, message: safeMessage, sound: { name: sound } })
        .catch(() => {});
    };

    const onEvent = (event) => {
      if (disposed) return;
      const type = event?.type;
      if (type === "question.asked") notify(event, "Question waiting", "A question needs your answer", "question");
      else if (type === "permission.asked") notify(event, "Permission waiting", "A permission request needs your answer", "permission");
      else if (type === "session.error") notify(event, "Session Error", "The session reported an error", "error");
      else if (type === "session.compacted") notify(event, "Context compacted", "Checkpoint continuity: briefly restate the current plan if needed", "default");
      else if (type === "session.idle" || type === "session.done") {
        const id = eventSessionID(event);
        const session = id ? api.state.session.get(id) : undefined;
        if (session?.parentID) {
          notify(event, "Subagent done", "A subagent finished", "subagent_done");
        }
      }
      try { api.renderer.requestRender(); } catch {}
    };

    // 1.18.18's typed event union omits asked/done, but the runtime bus can safely ignore unknown names.
    for (const type of ["question.asked", "permission.asked", "session.error", "session.idle", "session.done", "session.compacted", "session.status", "todo.updated", "permission.updated", "permission.replied", "lsp.updated", "mcp.updated"]) {
      try {
        const unsubscribe = api.event.on(type, onEvent);
        if (typeof unsubscribe === "function") unsubs.push(unsubscribe);
      } catch {}
    }

    api.slots.register({
      order: 830,
      slots: {
        sidebar_footer(props) {
          return render(props?.session_id);
        }
      }
    });

    api.lifecycle.onDispose(() => {
      disposed = true;
      for (const unsubscribe of unsubs.splice(0)) {
        try { unsubscribe(); } catch {}
      }
    });
  }
};
