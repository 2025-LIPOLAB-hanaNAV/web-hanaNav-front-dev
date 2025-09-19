import { RAGFLOW_BASE_URL, RAGFLOW_API_KEY, USE_PROXY, PROXY_BASE_URL } from '../config';

type ListDatasetsParams = {
  page?: number;
  page_size?: number;
  orderby?: 'create_time' | 'update_time';
  desc?: boolean;
  name?: string;
  id?: string;
};

export type Dataset = {
  id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  embedding_model?: string;
  create_time?: number;
  update_time?: number;
};

type ApiResponse<T> = { code: number; data?: T; message?: string };

async function ragFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let url: string;
  let headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };

  if (USE_PROXY) {
    // 프록시 서버 사용
    url = `/api/ragflow${path}`;
  } else {
    // 직접 연결
    if (!RAGFLOW_BASE_URL) throw new Error('Missing VITE_RAGFLOW_BASE_URL');
    if (!RAGFLOW_API_KEY) throw new Error('Missing VITE_RAGFLOW_API_KEY');
    url = new URL(path, RAGFLOW_BASE_URL).toString();
    headers['Authorization'] = `Bearer ${RAGFLOW_API_KEY}`;
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });
  const json = await res.json() as ApiResponse<any>;
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json.data as T;
}

export async function listDatasets(params: ListDatasetsParams = {}): Promise<Dataset[]> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.orderby) query.set('orderby', params.orderby);
  if (typeof params.desc === 'boolean') query.set('desc', String(params.desc));
  if (params.name) query.set('name', params.name);
  if (params.id) query.set('id', params.id);
  const data = await ragFetch<Dataset[]>(`/api/v1/datasets?${query.toString()}`);
  return data ?? [];
}

type CreateDatasetBody = {
  name: string;
  avatar?: string;
  description?: string;
  embedding_model?: string;
  permission?: string;
  chunk_method?: string;
  parser_config?: Record<string, any>;
};

export async function createDataset(body: CreateDatasetBody): Promise<Dataset> {
  const data = await ragFetch<Dataset>(`/api/v1/datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return data;
}

export async function deleteDatasets(ids: string[] | null): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// Documents
export type DocumentItem = {
  id: string;
  name: string;
  size?: number;
  type?: string;
  run?: string | number;
  status?: string | number;
  progress?: number;
  progress_msg?: string;
  update_time?: number;
};

type ListDocumentsResponse = { docs: DocumentItem[]; total: number };

export async function uploadDocuments(datasetId: string, files: File[]): Promise<DocumentItem[]> {
  if (!files || files.length === 0) return [];

  let url: string;
  let headers: Record<string, string> = {};

  if (USE_PROXY) {
    // 프록시 서버 사용
    url = `/api/ragflow/api/v1/datasets/${datasetId}/documents`;
  } else {
    // 직접 연결
    if (!RAGFLOW_BASE_URL) throw new Error('Missing VITE_RAGFLOW_BASE_URL');
    if (!RAGFLOW_API_KEY) throw new Error('Missing VITE_RAGFLOW_API_KEY');
    url = new URL(`/api/v1/datasets/${datasetId}/documents`, RAGFLOW_BASE_URL).toString();
    headers['Authorization'] = `Bearer ${RAGFLOW_API_KEY}`;
  }

  const form = new FormData();
  files.forEach(f => form.append('file', f));
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
  });
  const json = await res.json() as ApiResponse<DocumentItem[]>;
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `Upload failed: ${res.status}`);
  }
  return json.data || [];
}

export async function listDocuments(datasetId: string, params: {
  page?: number; page_size?: number; orderby?: 'create_time' | 'update_time'; desc?: boolean; keywords?: string; id?: string; name?: string; create_time_from?: number; create_time_to?: number;
} = {}): Promise<ListDocumentsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.orderby) query.set('orderby', params.orderby);
  if (typeof params.desc === 'boolean') query.set('desc', String(params.desc));
  if (params.keywords) query.set('keywords', params.keywords);
  if (params.id) query.set('id', params.id);
  if (params.name) query.set('name', params.name);
  if (params.create_time_from) query.set('create_time_from', String(params.create_time_from));
  if (params.create_time_to) query.set('create_time_to', String(params.create_time_to));
  const data = await ragFetch<ListDocumentsResponse>(`/api/v1/datasets/${datasetId}/documents?${query.toString()}`);
  return data || { docs: [], total: 0 };
}

export async function parseDocuments(datasetId: string, documentIds: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets/${datasetId}/chunks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds }),
  });
}

export async function stopParsing(datasetId: string, documentIds: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets/${datasetId}/chunks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds }),
  });
}

export async function deleteDocuments(datasetId: string, ids: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets/${datasetId}/documents`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// Chunks
export type ChunkItem = {
  id: string;
  content: string;
  document_id: string;
  available?: boolean;
  important_keywords?: string | string[];
  image_id?: string;
  positions?: string[];
};

type ListChunksResponse = { chunks: ChunkItem[]; total: number };

export async function listChunks(datasetId: string, documentId: string, params: { keywords?: string; page?: number; page_size?: number; id?: string } = {}): Promise<ListChunksResponse> {
  const query = new URLSearchParams();
  if (params.keywords) query.set('keywords', params.keywords);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.id) query.set('id', params.id);
  const data = await ragFetch<{ chunks: ChunkItem[]; doc?: any; total: number }>(`/api/v1/datasets/${datasetId}/documents/${documentId}/chunks?${query.toString()}`);
  return { chunks: data?.chunks || [], total: data?.total || 0 };
}

export async function addChunk(datasetId: string, documentId: string, body: { content: string; important_keywords?: string[]; questions?: string[] }): Promise<ChunkItem> {
  const data = await ragFetch<{ chunk: ChunkItem }>(`/api/v1/datasets/${datasetId}/documents/${documentId}/chunks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.chunk;
}

export async function updateChunk(datasetId: string, documentId: string, chunkId: string, body: { content?: string; important_keywords?: string[]; available?: boolean }): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets/${datasetId}/documents/${documentId}/chunks/${chunkId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteChunks(datasetId: string, documentId: string, chunkIds: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/datasets/${datasetId}/documents/${documentId}/chunks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunk_ids: chunkIds }),
  });
}

export type RetrievalParams = {
  question: string;
  dataset_ids?: string[];
  document_ids?: string[];
  page?: number;
  page_size?: number;
  similarity_threshold?: number;
  vector_similarity_weight?: number;
  top_k?: number;
  rerank_id?: string;
  keyword?: boolean;
  highlight?: boolean;
  cross_languages?: string[];
  metadata_condition?: Record<string, any>;
};

export async function retrieveChunks(params: RetrievalParams): Promise<{ chunks: any[]; total: number }> {
  const data = await ragFetch<{ chunks: any[]; total: number }>(`/api/v1/retrieval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return { chunks: data?.chunks || [], total: (data as any)?.total || 0 };
}

// Chat Assistants
export type ChatAssistant = {
  id: string;
  name: string;
  dataset_ids?: string[];
  llm?: Record<string, any>;
  prompt?: Record<string, any>;
  update_time?: number;
};

export async function listChats(params: { page?: number; page_size?: number; orderby?: 'create_time' | 'update_time'; desc?: boolean; name?: string; id?: string } = {}): Promise<ChatAssistant[]> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.orderby) query.set('orderby', params.orderby);
  if (typeof params.desc === 'boolean') query.set('desc', String(params.desc));
  if (params.name) query.set('name', params.name);
  if (params.id) query.set('id', params.id);
  const data = await ragFetch<ChatAssistant[]>(`/api/v1/chats?${query.toString()}`);
  return data ?? [];
}

export async function createChat(body: { name: string; dataset_ids?: string[]; avatar?: string; llm?: Record<string, any>; prompt?: Record<string, any> }): Promise<ChatAssistant> {
  const data = await ragFetch<ChatAssistant>(`/api/v1/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data;
}

export async function updateChat(chatId: string, body: { name?: string; dataset_ids?: string[]; avatar?: string; llm?: Record<string, any>; prompt?: Record<string, any> }): Promise<void> {
  await ragFetch<void>(`/api/v1/chats/${chatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteChats(ids: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/chats`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// Chat sessions
export type ChatSessionListItem = {
  id: string;
  name?: string;
  create_time?: number;
  update_time?: number;
  messages?: { role: 'assistant' | 'user'; content: string }[];
};

export async function listChatSessions(chatId: string, params: { page?: number; page_size?: number; orderby?: 'create_time' | 'update_time'; desc?: boolean; name?: string; id?: string; user_id?: string } = {}): Promise<ChatSessionListItem[]> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.orderby) query.set('orderby', params.orderby);
  if (typeof params.desc === 'boolean') query.set('desc', String(params.desc));
  if (params.name) query.set('name', params.name);
  if (params.id) query.set('id', params.id);
  if (params.user_id) query.set('user_id', params.user_id);
  const data = await ragFetch<ChatSessionListItem[]>(`/api/v1/chats/${chatId}/sessions?${query.toString()}`);
  return data ?? [];
}

export async function updateChatSession(chatId: string, sessionId: string, body: { name: string; user_id?: string }): Promise<void> {
  await ragFetch<void>(`/api/v1/chats/${chatId}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteChatSessions(chatId: string, ids: string[]): Promise<void> {
  await ragFetch<void>(`/api/v1/chats/${chatId}/sessions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// Sessions & Completions
export type ChatSession = {
  id: string;
  chat_id: string;
  name?: string;
  messages?: { role: 'assistant' | 'user'; content: string }[];
};

export async function createChatSession(chatId: string, body: { name: string; user_id?: string }): Promise<ChatSession> {
  const data = await ragFetch<ChatSession>(`/api/v1/chats/${chatId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data;
}

export async function getChatSession(chatId: string, sessionId: string): Promise<ChatSession> {
  const data = await ragFetch<ChatSession>(`/api/v1/chats/${chatId}/sessions/${sessionId}`);
  return data;
}

function tryParseJSON(text: string): any | null {
  try { return JSON.parse(text); } catch { return null; }
}

function parseSseLikeToLastData(text: string): any | null {
  // Attempt to parse last line starting with 'data:'
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('data:')) {
      const jsonStr = line.slice(5).trim();
      const parsed = tryParseJSON(jsonStr);
      if (parsed) return parsed;
    }
  }
  return null;
}

export type CompletionResult = {
  answer?: string;
  reference?: any;
  session_id?: string;
};

export async function converseOnce(chatId: string, body: { question: string; session_id?: string; user_id?: string; stream?: boolean }): Promise<CompletionResult> {
  let url: string;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (USE_PROXY) {
    // 프록시 서버 사용
    url = `/api/ragflow/api/v1/chats/${chatId}/completions`;
  } else {
    // 직접 연결
    if (!RAGFLOW_BASE_URL) throw new Error('Missing VITE_RAGFLOW_BASE_URL');
    if (!RAGFLOW_API_KEY) throw new Error('Missing VITE_RAGFLOW_API_KEY');
    url = new URL(`/api/v1/chats/${chatId}/completions`, RAGFLOW_BASE_URL).toString();
    headers['Authorization'] = `Bearer ${RAGFLOW_API_KEY}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, stream: false }),
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try { const j = await res.json() as any; message = j?.message || message; } catch {}
    throw new Error(message);
  }
  // Try JSON first
  if (ct.includes('application/json')) {
    const j = await res.json() as any;
    // Handle RAGFlow native schema { code, data: { answer, reference, session_id } }
    if (j && typeof j === 'object' && ('data' in j)) {
      const data = j.data || {};
      if (data && typeof data === 'object') {
        if (data.answer || data.session_id) {
          return { answer: data.answer, reference: data.reference, session_id: data.session_id };
        }
      }
    }
    // Handle OpenAI-like schema { choices: [ { message: { content } } ] }
    if (j && Array.isArray(j.choices) && j.choices.length > 0) {
      const choice = j.choices[0];
      const content = choice?.message?.content ?? choice?.delta?.content ?? '';
      return { answer: content, reference: undefined, session_id: undefined };
    }
    // Unknown JSON shape
    return {};
  }
  // Fallback: parse SSE-like buffered text
  const text = await res.text();
  const last = parseSseLikeToLastData(text);
  if (last && last.data && last.data !== true) {
    return { answer: last.data.answer, reference: last.data.reference, session_id: last.data.session_id };
  }
  return {};
}
