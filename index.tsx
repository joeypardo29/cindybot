// index.tsx
/**
 * OpenAI swap: post to a proxy that calls the Responses API.
 */
import { marked } from 'marked';

// DOM hooks (unchanged)
const chatHistory = document.getElementById('chat-history') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;

if (!chatHistory || !chatForm || !chatInput || !sendButton) {
  throw new Error('Required DOM elements not found');
}

// ✅ Set this to your Apps Script Web App URL
const OPENAI_PROXY_URL = "https://script.google.com/macros/s/AKfycbyhSZY1DyzD0ehJuklefhIsDkCEH0dkFiE6btU4lmvTQbnZb4bLM4cXueQPhnGXkvuu/exec";

// Render helper (unchanged)
function addMessageToHistory(role: 'user' | 'model', text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.classList.add('message', role === 'user' ? 'user-message' : 'model-response');
  el.innerHTML = marked.parse(text) as string;
  chatHistory.appendChild(el);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return el;
}

async function handleFormSubmit(event: SubmitEvent) {
  event.preventDefault();
  const userInput = chatInput.value.trim();
  if (!userInput) return;

  // UI prep
  chatInput.disabled = true;
  sendButton.disabled = true;

  addMessageToHistory('user', userInput);
  const modelEl = addMessageToHistory('model', '');
  modelEl.classList.add('thinking');

  try {
    // Request OpenAI Responses API via your proxy
    const res = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: userInput
      })
    });

    const data = await res.json();

    // Extract text (handles different shapes defensively)
    const text =
      data.output_text ??
      data.output?.map((p: any) =>
        p.content?.map((c: any) => c?.text ?? '').join('')
      ).join('') ??
      data.response?.output_text ??
      JSON.stringify(data);

    // Clear input and show answer
    chatInput.value = '';
    chatInput.style.height = 'auto';
    modelEl.innerHTML = marked.parse(text) as string;
  } catch (err) {
    console.error(err);
    modelEl.innerHTML = marked.parse('🔴 Sorry, something went wrong. Please try again.') as string;
  } finally {
    modelEl.classList.remove('thinking');
    chatInput.disabled = false;
    chatInput.focus();
    sendButton.disabled = !chatInput.value.trim() || chatInput.disabled;
  }
}

// Events (unchanged)
chatForm.addEventListener('submit', handleFormSubmit);
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${chatInput.scrollHeight}px`;
  sendButton.disabled = !chatInput.value.trim() || chatInput.disabled;
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendButton.disabled) chatForm.requestSubmit();
  }
});
