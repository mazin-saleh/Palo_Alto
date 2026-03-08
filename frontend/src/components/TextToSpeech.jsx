import { useState, useEffect, useCallback, useRef } from 'react';

export default function TextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const getPageText = useCallback(() => {
    const main = document.getElementById('main-content');
    if (!main) return '';

    // Collect text from visible, non-decorative elements
    const walker = document.createTreeWalker(
      main,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          // Skip hidden, aria-hidden, and sr-only elements
          if (el.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
          if (el.closest('.sr-only')) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          const text = node.textContent.trim();
          if (!text) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const parts = [];
    let node;
    while ((node = walker.nextNode())) {
      parts.push(node.textContent.trim());
    }
    return parts.join('. ').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ');
  }, []);

  const handleToggle = useCallback(() => {
    if (!supported) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = getPageText();
    if (!text) return;

    // Cancel any prior speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = 'en-US';

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [supported, speaking, getPageText]);

  // Stop speech on page navigation
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={handleToggle}
      className={`fixed bottom-20 md:bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-warm-lg flex items-center justify-center transition-all duration-200 ${
        speaking
          ? 'bg-coral text-white hover:bg-coral/90 animate-pulse'
          : 'bg-white text-sage border border-sand/60 hover:bg-sage-light hover:shadow-warm-xl'
      }`}
      aria-label={speaking ? 'Stop reading page aloud' : 'Read page aloud'}
      title={speaking ? 'Stop reading' : 'Read page aloud'}
    >
      {speaking ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12v12H6z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75a.75.75 0 01-.75-.75V6a.75.75 0 011.22-.585l4.03 3.224H19.5a.75.75 0 01.75.75v5.222a.75.75 0 01-.75.75h-2.998L12.47 18.585A.75.75 0 0112 18.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
        </svg>
      )}
    </button>
  );
}
