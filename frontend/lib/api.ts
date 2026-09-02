/**
 * lib/api.ts
 * Authenticated fetch wrapper for KelanaAI.
 *
 * - Automatically reads the JWT from localStorage and injects
 *   `Authorization: Bearer <token>` into every request.
 * - On 401 Unauthorized: clears the token and redirects to /login.
 * - Safe to call from any client-side context (browser only).
 */

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

export interface AssistantResponse {
  question: string;
  answer: string;
  sources: string[];
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

// ── Core authenticated fetch ──────────────────────────────────────────────────

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Token expired or invalid — clear it and force re-login
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
}

export async function askAssistant(question: string): Promise<AssistantResponse> {
  const response = await fetchWithAuth("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    let detail = "The assistant could not retrieve an answer.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Keep the useful fallback when the server returns a non-JSON response.
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to use the travel assistant.");
    }
    throw new Error(detail);
  }

  return (await response.json()) as AssistantResponse;
}

// ── Conversation API (Multi-turn Chat) ─────────────────────────────────────────

export interface CreateConversationResponse {
  conversation_id: number;
}

export interface MessageResponse {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  sources: string[];
  created_at: string;
}

export interface ConversationListItem {
  id: number;
  title: string;
  created_at: string;
}

export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
}

export interface ConversationUpdateRequest {
  title: string;
}

/**
 * Create a new conversation for the authenticated user.
 */
export async function createConversation(title?: string): Promise<CreateConversationResponse> {
  const response = await fetchWithAuth("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: title || null }),
  });

  if (!response.ok) {
    let detail = "Failed to create conversation.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as CreateConversationResponse;
}

/**
 * Fetch all conversations for the authenticated user.
 */
export async function getConversations(
  limit: number = 50,
  offset: number = 0
): Promise<ConversationListResponse> {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const response = await fetchWithAuth(`/conversations?${params}`);

  if (!response.ok) {
    let detail = "Failed to fetch conversations.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as ConversationListResponse;
}

/**
 * Send a message to a conversation and receive an AI response.
 * This orchestrates the full 7-step backend pipeline.
 */
export async function sendMessage(
  conversationId: number,
  content: string
): Promise<MessageResponse> {
  const response = await fetchWithAuth(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    let detail = "Failed to send message.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as MessageResponse;
}

/**
 * Fetch all messages from an existing conversation.
 * Use this to load chat history when resuming or switching conversations.
 */
export async function getConversationMessages(
  conversationId: number
): Promise<MessageResponse[]> {
  const response = await fetchWithAuth(
    `/conversations/${conversationId}/messages`
  );

  if (!response.ok) {
    let detail = "Failed to fetch conversation messages.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as MessageResponse[];
}

/**
 * Rename an existing conversation title.
 */
export async function updateConversationTitle(
  conversationId: number,
  title: string
): Promise<ConversationListItem> {
  const response = await fetchWithAuth(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    let detail = "Failed to rename conversation.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as ConversationListItem;
}

/**
 * Delete an existing conversation and its messages.
 */
export async function deleteConversation(conversationId: number): Promise<void> {
  const response = await fetchWithAuth(`/conversations/${conversationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let detail = "Failed to delete conversation.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {}
    throw new Error(detail);
  }
}
