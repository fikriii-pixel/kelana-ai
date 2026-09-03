'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { Check, Copy, Menu, PanelLeftClose, Pencil, Send, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useToast } from '@/lib/toast-context';
import {
  createConversation,
  deleteConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  updateConversationTitle,
  type ConversationListItem,
} from '@/lib/api';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  created_at: string;
  failed?: boolean;
}

const formatTimestamp = (dateString: string): string => new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const truncateTitle = (title: string, maxLength = 30): string =>
  title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;

const starterPrompts = [
  ['✈️', '5-Day Tokyo Itinerary', 'Create a practical 5-day itinerary for Tokyo.'],
  ['🛂', 'Japan Visa Requirements', 'What are the current visa requirements for visiting Japan?'],
  ['🚅', 'Shinkansen Transport Guide', 'Explain how to use the Shinkansen and choose the right pass.'],
  ['🍜', 'Local Food Worth Finding', 'What local foods and neighborhoods should I explore in Japan?'],
];

export default function AssistantPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const optimisticMessageIdRef = useRef(0);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversationToDelete, setConversationToDelete] = useState<ConversationListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useAuthGuard(router, {
    showToast: true,
    toastMessage: 'Please log in to use the chat assistant.',
  });

  const refreshConversations = async () => {
    const response = await getConversations(50, 0);
    const sorted = [...response.conversations].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setConversations(sorted);
    return sorted;
  };

  const loadConversationMessages = async (conversationId: number) => {
    const loaded = await getConversationMessages(conversationId);
    setMessages(
      loaded.map((message) => ({
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        sources: message.sources || [],
        created_at: message.created_at,
      }))
    );
  };

  const selectConversation = async (conversationId: number) => {
    setActiveId(conversationId);
    setInput('');
    setError(null);
    setMessages([]);
    shouldAutoScrollRef.current = true;

    try {
      await loadConversationMessages(conversationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
      showToast(message, 'error');
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadInitialChat = async () => {
      try {
        const list = await refreshConversations();
        if (isCancelled) return;

        if (list.length > 0) {
          const newest = list[0];
          setActiveId(newest.id);
          await loadConversationMessages(newest.id);
        } else {
          const created = await createConversation();
          if (isCancelled) return;

          setActiveId(created.conversation_id);
          setMessages([]);
          await refreshConversations();
        }
      } catch (err) {
        if (isCancelled) return;

        const message = err instanceof Error ? err.message : 'Failed to initialize chat';
        setError(message);
        showToast(message, 'error');
      } finally {
        if (!isCancelled) setIsLoadingConversations(false);
      }
    };

    void loadInitialChat();

    return () => {
      isCancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer || !shouldAutoScrollRef.current) return;

    requestAnimationFrame(() => {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, isLoading]);

  const handleChatScroll = () => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    shouldAutoScrollRef.current =
      chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  const handleNewChat = async () => {
    try {
      setMessages([]);
      setInput('');
      setError(null);
      shouldAutoScrollRef.current = true;

      const created = await createConversation();
      const newId = created.conversation_id;
      setActiveId(newId);
      await refreshConversations();
      showToast('New chat created', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create a new chat';
      setError(message);
      showToast(message, 'error');
    }
  };

  const handleRenameConversation = async (conversationId: number, title: string) => {
    const previousTitle = conversations.find((conversation) => conversation.id === conversationId)?.title;
    const optimisticTitle = title.trim();

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, title: optimisticTitle } : conversation
      )
    );

    try {
      const updated = await updateConversationTitle(conversationId, optimisticTitle);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: updated.title,
                created_at: updated.created_at,
              }
            : conversation
        )
      );
      showToast('Conversation renamed', 'success');
    } catch (err) {
      if (previousTitle) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, title: previousTitle } : conversation
          )
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to rename conversation';
      setError(message);
      showToast(message, 'error');
    } finally {
      setRenameId(null);
      setDraftTitle('');
    }
  };

  const saveRename = async (conversationId: number) => {
    const cleaned = draftTitle.trim();

    if (!cleaned) {
      setRenameId(null);
      setDraftTitle('');
      return;
    }

    await handleRenameConversation(conversationId, cleaned);
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    const { id: conversationId } = conversationToDelete;
    setIsDeleting(true);
    try {
      await deleteConversation(conversationId);
      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      setConversations(remaining);

      if (activeId === conversationId) {
        if (remaining.length > 0) {
          await selectConversation(remaining[0].id);
        } else {
          const created = await createConversation();
          setActiveId(created.conversation_id);
          setMessages([]);
          await refreshConversations();
        }
      }

      showToast('Conversation deleted', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
      setConversationToDelete(null);
    }
  };

  const sendContent = async (content: string, existingMessageId?: number) => {
    if (!content.trim() || activeId === null || isLoading) return;

    const cleanContent = content.trim();
    const messageId = existingMessageId ?? --optimisticMessageIdRef.current;
    shouldAutoScrollRef.current = true;
    setError(null);

    if (existingMessageId) {
      setMessages((prev) => prev.map((message) =>
        message.id === existingMessageId ? { ...message, failed: false } : message
      ));
    } else {
      setInput('');
      setMessages((prev) => [...prev, {
        id: messageId,
        role: 'user',
        content: cleanContent,
        created_at: new Date().toISOString(),
      }]);
    }

    setIsLoading(true);
    try {
      const response = await sendMessage(activeId, cleanContent);
      setMessages((prev) => [...prev, {
        id: response.id,
        role: 'assistant',
        content: response.content,
        sources: response.sources || [],
        created_at: response.created_at,
      }]);
      await refreshConversations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setMessages((prev) => prev.map((item) =>
        item.id === messageId ? { ...item, failed: true } : item
      ));
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    void sendContent(input);
  };

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F4F4F0]">
        <Navbar
          backHref="/"
          backLabel="← Back"
          actionHref="/"
          actionLabel="+ New Trip"
          onLogoutRequest={() => setShowLogoutModal(true)}
        />

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-b-2 border-black">
        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-label="Close conversations sidebar"
          />
        )}
        <aside
          className={[
            'absolute inset-y-0 left-0 z-30 flex h-full w-72 shrink-0 flex-col border-r-2 border-black bg-white transition-all duration-300 ease-in-out lg:relative',
            isSidebarOpen ? 'translate-x-0 opacity-100 lg:w-72' : '-translate-x-full opacity-0 lg:w-0 lg:overflow-hidden lg:border-none',
          ].join(' ')}
        >
          <div className="flex h-full min-w-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-black bg-white px-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-yellow-400 text-sm font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  K
                </span>
                <span className="text-base font-black uppercase tracking-tight text-black">KelanaAI</span>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 py-3">
              <button
                type="button"
                onClick={() => void handleNewChat()}
                className="flex w-full items-center justify-center gap-2 border-2 border-black bg-yellow-400 p-2.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-yellow-500"
              >
                <span>✦</span>
                <span>New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="space-y-1.5">
                {isLoadingConversations ? (
                  <div className="py-8 text-center text-sm font-medium text-black/60">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="py-8 text-center text-sm font-medium text-black/60">No conversations yet</div>
                ) : (
                  conversations.map((conversation) => {
                    const isActive = activeId === conversation.id;
                    const isEditing = renameId === conversation.id;

                    return (
                      <div
                        key={conversation.id}
                        className={[
                          'rounded-md border transition-all',
                          isActive ? 'border border-black bg-yellow-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-transparent hover:bg-gray-100',
                        ].join(' ')}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draftTitle}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftTitle(event.target.value)}
                            onBlur={() => void saveRename(conversation.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void saveRename(conversation.id);
                              }
                              if (event.key === 'Escape') {
                                setRenameId(null);
                                setDraftTitle('');
                              }
                            }}
                            className="w-full border border-black bg-white px-2 py-1.5 text-sm font-bold text-black outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => void selectConversation(conversation.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="truncate text-[11px] font-black uppercase tracking-wide text-black">
                                {truncateTitle(conversation.title || 'New Conversation')}
                              </div>
                              <div className="mt-1 text-[10px] font-medium text-black/60">
                                {formatTimestamp(conversation.created_at)}
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setRenameId(conversation.id);
                                setDraftTitle(conversation.title || 'New Conversation');
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center border border-black bg-white text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200"
                              aria-label={`Rename conversation ${conversation.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setConversationToDelete(conversation);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center border border-black bg-red-300 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400"
                              aria-label={`Delete conversation ${conversation.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-yellow-500"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F4F4F0]">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="flex min-h-80 flex-col justify-center py-8">
                    <div className="mb-7">
                      <div className="mb-3 inline-block border-2 border-black bg-yellow-400 px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Your travel desk</div>
                      <h2 className="max-w-xl text-4xl font-black uppercase leading-none tracking-tight text-black sm:text-6xl">Where should we take you?</h2>
                      <p className="mt-4 max-w-lg text-sm font-bold leading-relaxed text-black/60">Ask for an itinerary, transport advice, or the details that make a trip feel like yours.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {starterPrompts.map(([icon, label, prompt]) => (
                        <button key={label} type="button" onClick={() => void sendContent(prompt)} className="group border-2 border-black bg-white p-4 text-left shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-[#b8f0a0]">
                          <span className="text-2xl">{icon}</span>
                          <span className="mt-3 block text-sm font-black uppercase">{label}</span>
                          <span className="mt-1 block text-xs font-bold text-black/50">Ask KelanaAI →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-md border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                        message.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-white text-black'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none text-black">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              strong: ({ children }) => (
                                <strong className="bg-yellow-200 px-1 font-black text-black">{children}</strong>
                              ),
                              ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              hr: () => null,
                              code: ({ children, className, ...props }) => (
                                <code className={`${className ?? ''} rounded bg-gray-200 px-1 py-0.5 font-mono text-xs`} {...props}>
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{message.content}</div>
                      )}

                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-black/20 pt-2">
                          {message.sources.map((source, index) => (
                            <span
                              key={`${source}-${index}`}
                              className="border border-black bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black"
                            >
                              <span aria-hidden="true">📄</span> {source}
                            </span>
                          ))}
                        </div>
                      )}

                      {message.role === 'assistant' && (
                        <div className="mt-3 flex justify-end border-t border-black/20 pt-2">
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(message.content).then(() => {
                              setCopiedId(message.id);
                              window.setTimeout(() => setCopiedId(null), 1600);
                            }).catch(() => showToast('Could not copy message', 'error'))}
                            className="inline-flex items-center gap-1 border border-black bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200"
                            aria-label="Copy assistant message"
                          >
                            {copiedId === message.id ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
                            {copiedId === message.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                    <time className="mt-1 px-1 text-xs font-bold text-black opacity-70" dateTime={message.created_at}>
                      {formatTimestamp(message.created_at)}
                      {message.failed && <>
                        <span className="ml-2 text-red-600">Send failed</span>
                        <button type="button" onClick={() => void sendContent(message.content, message.id)} className="ml-2 font-black uppercase text-red-700 underline">Retry</button>
                      </>}
                    </time>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="border-2 border-black bg-white p-3 text-sm font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      KelanaAI is thinking <span className="inline-flex gap-1 align-middle"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-black [animation-delay:-.3s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-black [animation-delay:-.15s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-black" /></span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md border-2 border-red-500 bg-red-100 p-3 text-sm font-bold text-red-700">
                    ⚠️ {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="sticky bottom-4 px-4 pb-4">
              <div className="mx-auto max-w-3xl">
                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="flex items-center gap-2 rounded-xl border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
                    onKeyDown={onTextareaKeyDown}
                    rows={1}
                    maxLength={5000}
                    disabled={isLoading || activeId === null}
                    placeholder="Ask me about travel plans..."
                    className="max-h-[120px] min-h-[40px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm font-medium text-black outline-none placeholder:text-black/50 disabled:cursor-not-allowed"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || activeId === null}
                    className="inline-flex h-10 items-center justify-center gap-2 border-2 border-black bg-yellow-400 px-3 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">{isLoading ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">
                  <span>Enter to send</span>
                  <span>{input.length}/5000</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {conversationToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-conversation-title"
        >
          <div className="w-full max-w-md border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 id="delete-conversation-title" className="text-xl font-black uppercase tracking-tight text-black">
              Delete conversation?
            </h2>
            <p className="mt-3 break-words text-sm font-medium text-black/70">
              “{conversationToDelete.title || 'New Conversation'}” and all its messages will be permanently deleted.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                disabled={isDeleting}
                className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConversation()}
                disabled={isDeleting}
                className="border-2 border-black bg-red-500 px-4 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="w-full max-w-md border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 id="logout-title" className="text-xl font-black uppercase tracking-tight text-black">Leave KelanaAI?</h2>
            <p className="mt-3 text-sm font-medium text-black/70">You can come back anytime to continue planning your trips.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowLogoutModal(false)} className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Stay</button>
              <button type="button" onClick={() => { logout(); router.push('/login'); }} className="border-2 border-black bg-red-500 px-4 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
