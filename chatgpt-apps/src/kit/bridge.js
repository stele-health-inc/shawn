/*
 * Widget runtime shared by every app. Injected into <head> by kit/widget.ts.
 *
 * Primary path: the open MCP Apps bridge (JSON-RPC 2.0 over postMessage,
 * spec 2026-01-26): ui/initialize → ui/notifications/initialized, then the
 * host pushes ui/notifications/tool-input and ui/notifications/tool-result.
 *
 * Additive path: ChatGPT's `window.openai` globals (toolOutput, theme …) and
 * the `openai:set_globals` event, used when present so older ChatGPT builds
 * still render.
 *
 * Exposes `window.Widget`.
 */
(function () {
  "use strict";
  var parent = window.parent;
  var state = { output: null, meta: null, input: null, host: null, ready: false };
  var handlers = { result: [], input: [], context: [] };
  var rpcId = 0;
  var pending = new Map();

  function emit(kind) {
    handlers[kind].forEach(function (fn) {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  function notify(method, params) {
    parent.postMessage({ jsonrpc: "2.0", method: method, params: params || {} }, "*");
  }

  function request(method, params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var id = ++rpcId;
      var timer = timeoutMs
        ? setTimeout(function () { pending.delete(id); reject(new Error(method + " timed out")); }, timeoutMs)
        : null;
      pending.set(id, { resolve: function (v) { if (timer) clearTimeout(timer); resolve(v); }, reject: reject });
      parent.postMessage({ jsonrpc: "2.0", id: id, method: method, params: params || {} }, "*");
    });
  }

  function applyHost(ctx) {
    if (!ctx) return;
    state.host = Object.assign(state.host || {}, ctx);
    var theme = state.host.theme || (window.openai && window.openai.theme);
    if (theme) document.documentElement.dataset.theme = theme;
    var vars = state.host.styles && state.host.styles.variables;
    if (vars) {
      Object.keys(vars).forEach(function (k) { document.documentElement.style.setProperty(k, vars[k]); });
    }
    var fonts = state.host.styles && state.host.styles.css && state.host.styles.css.fonts;
    if (fonts && !document.getElementById("host-fonts")) {
      var s = document.createElement("style"); s.id = "host-fonts"; s.textContent = fonts; document.head.appendChild(s);
    }
  }

  window.addEventListener("message", function (ev) {
    if (ev.source !== parent) return;
    var m = ev.data;
    if (!m || m.jsonrpc !== "2.0") return;

    // Response to one of our requests.
    if (m.id != null && !m.method) {
      var p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.error) p.reject(m.error); else p.resolve(m.result);
      return;
    }

    switch (m.method) {
      case "ui/notifications/tool-result":
        state.output = (m.params && m.params.structuredContent) || null;
        state.meta = (m.params && m.params._meta) || null;
        emit("result");
        break;
      case "ui/notifications/tool-input":
        state.input = (m.params && m.params.arguments) || null;
        emit("input");
        break;
      case "ui/notifications/host-context-changed":
        applyHost(m.params);
        emit("context");
        break;
    }
    // Host → view requests (ping, ui/resource-teardown …) need a reply.
    if (m.id != null && m.method) {
      parent.postMessage({ jsonrpc: "2.0", id: m.id, result: {} }, "*");
    }
  });

  // ChatGPT compatibility globals.
  function readOpenAi() {
    var o = window.openai;
    if (!o) return;
    if (o.toolOutput && o.toolOutput !== state.output) {
      state.output = o.toolOutput;
      state.meta = o.toolResponseMetadata || state.meta;
      emit("result");
    }
    if (o.toolInput && o.toolInput !== state.input) { state.input = o.toolInput; emit("input"); }
    applyHost({ theme: o.theme, displayMode: o.displayMode, locale: o.locale });
    emit("context");
  }
  window.addEventListener("openai:set_globals", readOpenAi);

  // Report our size so inline widgets get the right height.
  var lastH = 0;
  function reportSize() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (h && h !== lastH) {
      lastH = h;
      notify("ui/notifications/size-changed", { height: h });
      if (window.openai && window.openai.notifyIntrinsicHeight) window.openai.notifyIntrinsicHeight(h);
    }
  }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.documentElement);

  request("ui/initialize", {
    appInfo: { name: document.title || "widget", version: "1.0.0" },
    appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
    protocolVersion: "2026-01-26",
  }, 3000).then(function (res) {
    applyHost(res && res.hostContext);
    notify("ui/notifications/initialized", {});
    state.ready = true;
    emit("context");
    reportSize();
  }).catch(function () { /* host without the bridge; window.openai path may still work */ });

  document.addEventListener("DOMContentLoaded", readOpenAi);
  readOpenAi();

  function openAi() { return window.openai || null; }

  window.Widget = {
    get output() { return state.output; },
    get meta() { return state.meta; },
    get input() { return state.input; },
    get host() { return state.host || {}; },
    get theme() { return (state.host && state.host.theme) || (openAi() && openAi().theme) || "light"; },

    /** Run `fn` now if a result is already present, and again on every new result. */
    onResult: function (fn) { handlers.result.push(fn); if (state.output) fn(); },
    onInput: function (fn) { handlers.input.push(fn); if (state.input) fn(); },
    onContext: function (fn) { handlers.context.push(fn); if (state.host) fn(); },

    callTool: function (name, args) {
      return request("tools/call", { name: name, arguments: args || {} }, 60000).catch(function (e) {
        if (openAi() && openAi().callTool) return openAi().callTool(name, args || {});
        throw e;
      });
    },

    openLink: function (url) {
      return request("ui/open-link", { url: url }, 2000).catch(function () {
        if (openAi() && openAi().openExternal) return openAi().openExternal({ href: url });
        window.open(url, "_blank", "noopener");
      });
    },

    sendMessage: function (text) {
      return request("ui/message", { role: "user", content: [{ type: "text", text: text }] }, 5000).catch(function () {
        if (openAi() && openAi().sendFollowUpMessage) return openAi().sendFollowUpMessage({ prompt: text });
      });
    },

    updateModelContext: function (text) {
      return request("ui/update-model-context", { content: [{ type: "text", text: text }] }, 5000).catch(function () {});
    },

    requestDisplayMode: function (mode) {
      return request("ui/request-display-mode", { mode: mode }, 2000).catch(function () {
        if (openAi() && openAi().requestDisplayMode) return openAi().requestDisplayMode({ mode: mode });
      });
    },

    copy: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
      return Promise.resolve();
    },

    reportSize: reportSize,
  };
})();
