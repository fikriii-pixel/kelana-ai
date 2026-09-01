'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { askAssistant } from '@/lib/api';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useToast } from '@/lib/toast-context';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: string;
}

const SUGGESTIONS = [
  'Do I need a visa for Japan?',
  'Is the JR Pass worth it?',
  'What are the onsen rules?',
  'Best areas to stay in Tokyo?',
];

export default function AssistantPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(router, {
    showToast: true,
    toastMessage: 'Log in to use the AI travel assistant.',
  });

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const submitQuestion = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmedInput = input.trim();

    if (trimmedInput.length < 3) {
      setError('Ask a question with at least 3 characters.');
      return;
    }

    setError(null);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      sender: 'user',
      text: trimmedInput,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await askAssistant(trimmedInput);

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        sender: 'assistant',
        text: result.answer,
        sources: result.sources || [],
        timestamp: getFormattedTime(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (caughtError) {
      const errorText =
        caughtError instanceof Error ? caughtError.message : 'Could not reach the assistant.';
      setError(errorText);

      // Add error message to chat
      const errorMessage: Message = {
        id: generateId(),
        sender: 'assistant',
        text: `⚠️ ${errorText}`,
        timestamp: getFormattedTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    setError(null);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div 
      className="h-dvh w-full flex flex-col bg-[#f4f4f0] text-black overflow-hidden" 
      style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
    >
      <Navbar backHref="/" backLabel="← Home" actionHref="/trips" actionLabel="Trip Archive" />

      {/* Minimalist Header */}
      <div className="flex-shrink-0 border-b border-black/10 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">
              KelanaAI Assistant
            </h1>
            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-green-600">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <button
            onClick={clearChat}
            className="text-xs sm:text-sm font-bold text-black/60 hover:text-black transition-colors px-2 py-1"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Scrollable Chat Stream */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto w-full"
      >
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-center py-12">
              <div className="mb-6">
                <span className="text-6xl sm:text-7xl block mb-3">🤖</span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase mb-2">Hello!</h2>
                <p className="text-sm sm:text-base font-medium text-black/60 max-w-md">
                  Ask me anything about your Japan trip
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="border-2 border-black bg-white px-3 py-2 text-xs sm:text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {message.sender === 'assistant' && (
                    <div className="mr-3 flex-shrink-0 text-2xl">🤖</div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] border-2 border-black rounded-2xl px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                      message.sender === 'user'
                        ? 'rounded-tr-sm bg-[#FFE600] text-sm sm:text-base font-medium text-black'
                        : 'rounded-tl-sm bg-white text-sm sm:text-base text-gray-800'
                    }`}
                  >
                    {message.sender === 'assistant' ? (
                      <div className="prose prose-sm max-w-none text-inherit">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="leading-relaxed my-1">{children}</p>,
                            strong: ({ children }) => (
                              <strong className="font-black text-black bg-yellow-200 px-1 rounded-sm">
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside space-y-1.5 my-2 font-medium">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside space-y-1.5 my-2 font-medium">
                                {children}
                              </ol>
                            ),
                            hr: () => null,
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    )}

                    {/* Citation Badges */}
                    {message.sender === 'assistant' && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-black/10">
                        <div className="flex flex-wrap gap-1.5">
                          {message.sources.map((src, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-mono font-bold bg-yellow-100 border border-black px-2 py-0.5 rounded-md"
                            >
                              📄 {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="mt-1.5 text-[10px] text-black/40 font-semibold">
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="mr-3 flex-shrink-0 text-2xl">🤖</div>
                  <div className="bg-white border-2 border-black rounded-2xl rounded-tl-sm px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-black"></span>
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-black animation-delay-200"></span>
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-black animation-delay-400"></span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-black/60">Searching documents...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mx-auto max-w-xl rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2">
                  <p className="text-xs sm:text-sm font-bold text-red-600">⚠️ {error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Floating Input Capsule */}
      <div className="flex-shrink-0 sticky bottom-0 pb-4 pt-3 bg-gradient-to-t from-[#f4f4f0] via-[#f4f4f0]/95 to-transparent">
        <div className="max-w-3xl mx-auto w-full px-4">
          <form onSubmit={submitQuestion} className="relative flex items-center bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-4 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about visas, trains, attractions..."
              rows={1}
              maxLength={500}
              disabled={loading}
              className="flex-1 border-none focus:ring-0 resize-none bg-transparent text-sm sm:text-base font-medium text-black placeholder:text-black/40 outline-none py-2 min-h-[44px] max-h-[120px]"
              style={{ lineHeight: '1.5' }}
            />
            <button
              type="submit"
              disabled={loading || input.trim().length < 3}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#FFE600] border-2 border-black font-black text-sm sm:text-base flex items-center justify-center hover:bg-yellow-400 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#FFE600] ml-2"
            >
              {loading ? '...' : '➔'}
            </button>
          </form>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] sm:text-xs font-medium text-black/40">
              Shift+Enter • new line
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-black/40">
              {input.length}/500
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        textarea {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        textarea::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}