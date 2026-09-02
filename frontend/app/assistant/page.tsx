'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { Menu, PanelLeftClose, Pencil, Trash2, UserCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
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
}

const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${month} ${day}, ${time}`;
};

const truncateTitle = (title: string, maxLength = 30): string =>
  title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;

export default function AssistantPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  const handleNewChat = async () => {
    try {
      setMessages([]);
      setInput('');
      setError(null);

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
    try {
      const updated = await updateConversationTitle(conversationId, title);
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

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!input.trim() || activeId === null) return;

    const content = input.trim();

    setInput('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setIsLoading(true);

    try {
      const response = await sendMessage(activeId, content);

      setMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: 'assistant',
          content: response.content,
          sources: response.sources || [],
          created_at: response.created_at,
        },
      ]);

      await refreshConversations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F4F4F0]">
      <Navbar actionHref="/trips" actionLabel="My Trips" />

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-b-2 border-black">
        <aside
          className={[
            'flex h-full shrink-0 flex-col border-r-2 border-black bg-white transition-all duration-300 ease-in-out',
            isSidebarOpen ? 'w-72 opacity-100' : 'w-0 overflow-hidden border-none opacity-0',
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

            <div className="border-t border-black bg-[#F9F9F7] p-3">
              <div className="flex items-center gap-3 rounded-md border border-black bg-white p-2">
                <UserCircle2 className="h-7 w-7 text-black" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-wide text-black">Travel Planner</p>
                  <p className="text-[10px] font-medium text-black/60">Online</p>
                </div>
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="flex min-h-80 flex-col items-center justify-center space-y-4 text-center">
                    <div className="text-6xl">✈️</div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black uppercase tracking-tight text-black">Start planning</h2>
                      <p className="max-w-md text-sm font-medium text-black/60">
                        Ask about flights, itineraries, local tips, or visa details for your next trip.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                              {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-md border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-black [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-black [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-black" />
                      </div>
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
                    className="flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm font-medium text-black outline-none placeholder:text-black/50 disabled:cursor-not-allowed"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || activeId === null}
                    className="inline-flex items-center justify-center rounded-md border border-black bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
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
    </div>
  );
}
