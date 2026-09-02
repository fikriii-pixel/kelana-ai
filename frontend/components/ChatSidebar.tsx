'use client';

import { useState } from 'react';
import { ConversationListItem } from '@/lib/api';

interface ChatSidebarProps {
  conversations: ConversationListItem[];
  activeConversationId: number | null;
  isLoading?: boolean;
  onNewChat: () => void;
  onSelectConversation: (conversationId: number) => void;
  onRenameConversation: (conversationId: number, title: string) => Promise<void>;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${month} ${day}, ${time}`;
}

function truncateTitle(title: string, maxLength = 28): string {
  return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  isLoading = false,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const saveRename = async (conversationId: number) => {
    const title = draftTitle.trim();

    if (!title) {
      setEditingId(null);
      setDraftTitle('');
      return;
    }

    try {
      await onRenameConversation(conversationId, title);
    } finally {
      setEditingId(null);
      setDraftTitle('');
    }
  };

  return (
    <aside className="w-72 border-r-2 border-black bg-white h-screen flex flex-col shadow-[2px_0px_0px_0px_rgba(0,0,0,1)]">
      <div className="p-4">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full px-4 py-3 bg-yellow-400 text-black border-2 border-black font-black uppercase rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-500 active:translate-y-0.5 transition-transform text-sm"
        >
          ➕ New Chat
        </button>
      </div>

      <div className="mx-4 border-t-2 border-black" />

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No conversations yet</div>
        ) : (
          conversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id;
            const isEditing = editingId === conversation.id;

            return (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded-md border-2 p-2 transition-all ${
                  isActive
                    ? 'bg-yellow-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'border-gray-300 bg-white hover:border-black'
                }`}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={() => saveRename(conversation.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void saveRename(conversation.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setDraftTitle('');
                      }
                    }}
                    className="w-full border-2 border-black px-2 py-1 text-sm bg-white focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-bold text-xs uppercase text-black truncate">
                        {truncateTitle(conversation.title || 'New Conversation')}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {formatTimestamp(conversation.created_at)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(conversation.id);
                        setDraftTitle(conversation.title || 'New Conversation');
                      }}
                      className="shrink-0 border-2 border-black bg-white px-2 py-1 text-xs font-bold rounded-md shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200"
                      aria-label={`Rename conversation ${conversation.title}`}
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
