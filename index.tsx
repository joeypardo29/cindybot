// index.tsx
// Frontend for Cindybot: posts to your Apps Script proxy and renders replies.

import { marked } from "marked";

// ---- CONFIG ----
const OPENAI_PROXY_URL =
  "https://script.google.com/macros/s/AKfycbzRo0l05nMVvXYydDw9tkwSZDHP6J2LNZQ-RHo7aITnA7_pQM4hMDXUjLlZ45cdu2LI/exec"; // <-- your working Apps Script URL

console.log("cindybot: script loaded");

// ---- DOM ----
const chatHistory = document.getElementById("chat-history") as HTMLDivElement | null;
const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
const chatInput = document.getElementById("chat-input") as HTMLTextAreaElement | null;
const sendButton = document.getElementById("send-button") as HTMLButtonElement | null;

if (!chatHistory || !chatForm || !chatInput || !sendButton) {
  throw new Error("Required DOM elements not found");
}

// ---- UI helpers ----
function addMessage(role: "user" | "model", text: string) {
  const el = document.createElement("div");
  el.className = role === "user" ? "message user-message" : "message model-response";
  el.innerHTML = marked.parse(text || "") as string;
  chatHistory.appendChild(el);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return el;
}

function setFormEnabled(enabled: boolean) {
  chatInput!.disabled = !enabled;
  sendButton!.disabled = !enabled || !chatInput!.value.trim();
}

// ---- API ----
function extractOpenAIText(data: any): string {
  // a) convenience field (sometimes present)
  if (typeof data?.output_text === "string") return data.output_text;

  // b) Responses API shape (your test output)
  if (Array.isArray(data?.output)) {
    const joined = data.output
      .map((msg: any) =>
        Array.isArray(msg?.content)
          ? msg.content.map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("")
          : ""
      )
      .join("");
    if (joined.trim()) return joined;
  }

  // c) Chat Completions-like fallback
  if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  return "Unexpected response:\n```json\n" + JSON.stringify(data, null, 2) + "\n```";
}

async function askOpenAI(prompt: string): Promise<string> {
  const res = await fetch(OPENAI_PROXY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", input: prompt })
  });

  const raw = await res.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return "Proxy returned non-JSON:\n```\n" + raw.slice(0, 2000) + "\n```";
  }

  if (!res.ok || data?.error) {
    return "🔴 Proxy error:\n```json\n" + JSON.stringify(data ?? { status: res.status, raw }, null, 2) + "\n```";
  }

  return extractOpenAIText(data);
}

// ---- Events ----
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = chatInput!.value.trim();
  if (!prompt) return;

  setFormEnabled(false);

  addMessage("user", prompt);
  const thinking = addMessage("model", "_thinking…_");
  thinking.classList.add("thinking");

  try {
    const answer = await askOpenAI(prompt);
    thinking.innerHTML = marked.parse(answer) as string;
    chatInput!.value = "";
    chatInput!.style.height = "auto";
  } catch (err: any) {
    thinking.innerHTML = marked.parse(
      "🔴 Network/JS error:\n```\n" + (err?.message || String(err)) + "\n```"
    ) as string;
  } finally {
    thinking.classList.remove("thinking");
    setFormEnabled(true);
    chatInput!.focus();
  }
});

chatInput.addEventListener("input", () => {
  chatInput!.style.height = "auto";
  chatInput!.style.height = `${chatInput!.scrollHeight}px`;
  sendButton!.disabled = !chatInput!.value.trim() || chatInput!.disabled;
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendButton!.disabled) chatForm!.requestSubmit();
  }
});
