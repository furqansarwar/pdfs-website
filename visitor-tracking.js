/* PDFS visitor analytics — approximate IP location, no raw IP stored by PDFS */
(() => {
  const URL = "https://ifbhikajorxrslvnxmjx.supabase.co/functions/v1/visitor-tracking";
  const KEY = "sb_publishable_GZuBTRceNBx0sYIb4M4FOQ_ksWzxrq7";
  let sessionId;
  try {
    sessionId = sessionStorage.getItem("pdfs_analytics_session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("pdfs_analytics_session", sessionId);
    }
  } catch (_) {
    sessionId = "s-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  const send = async (eventType, toolSlug = null) => {
    try {
      await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json", "apikey": KEY },
        body: JSON.stringify({ event_type: eventType, page_path: window.location.pathname + window.location.hash,
          tool_slug: toolSlug, session_id: sessionId }), keepalive: true });
    } catch (_) { /* analytics must never interrupt the website */ }
  };
  send("page_view");
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const tool = target?.closest("[data-tool]");
    if (tool) send("tool_open", tool.dataset.tool || null);
    else if (target?.closest("#quickImageConvert")) send("tool_open", "jpg-pdf");
    else if (target?.closest("#processBtn") && !target.closest("#processBtn").disabled) {
      const active = document.querySelector("#modalTitle")?.textContent || "";
      const slug = Object.entries({ "Merge PDF":"merge","Split PDF":"split","Compress PDF":"compress",
        "PDF to Word":"pdf-word","Word to PDF":"word-pdf","PDF to JPG":"pdf-jpg",
        "PDF to Excel":"pdf-excel","Rotate PDF":"rotate","Watermark PDF":"watermark",
        "Protect PDF":"protect","Unlock PDF":"unlock" }).find(([name]) => name === active)?.[1] || null;
      if (slug) send("tool_process", slug);
    }
  });
})();