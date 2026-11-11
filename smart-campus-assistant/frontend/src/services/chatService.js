import api, { API_BASE_URL, getAccessToken, setAccessToken } from './api';
import axios from 'axios';

export const chatService = {
  async getConversations() {
    const { data } = await api.get('/chatbot/conversations');
    return data;
  },

  async createConversation(title = 'New Campus Chat') {
    const { data } = await api.post('/chatbot/conversations', { title });
    return data;
  },

  async getMessages(conversationId) {
    const { data } = await api.get(`/chatbot/conversations/${conversationId}/messages`);
    return data;
  },

  async deleteConversation(conversationId) {
    const { data } = await api.delete(`/chatbot/conversations/${conversationId}`);
    return data;
  },

  async sendMessage(payload) {
    const { data } = await api.post('/chatbot/message', payload);
    return data;
  },

  async streamMessage(payload, handlers = {}) {
    const { onMeta, onAgentStep, onToken, onDone, onError } = handlers;

    const doFetch = (token) =>
      fetch(`${API_BASE_URL}/chatbot/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

    let response = await doFetch(getAccessToken());
    if (response.status === 401) {
      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshRes.data?.access_token;
        if (newToken) {
          setAccessToken(newToken);
          response = await doFetch(newToken);
        }
      } catch {
        setAccessToken(null);
      }
    }

    if (!response.ok) {
      let detail = `Streaming request failed (${response.status})`;
      try {
        const errJson = await response.json();
        detail = errJson.detail || detail;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(detail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const processEventBlock = (block) => {
      const lines = block.split('\n');
      let eventName = 'message';
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) return;
      const rawData = dataLines.join('\n');
      let parsed = rawData;
      try {
        parsed = JSON.parse(rawData);
      } catch {
        // keep string
      }

      if (eventName === 'meta' && onMeta) onMeta(parsed);
      else if (eventName === 'agent_step' && onAgentStep) onAgentStep(parsed);
      else if (eventName === 'token' && onToken) onToken(parsed);
      else if (eventName === 'done' && onDone) onDone(parsed);
      else if (eventName === 'error' && onError) onError(parsed);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        if (part.trim()) processEventBlock(part);
      }
    }

    if (buffer.trim()) {
      processEventBlock(buffer);
    }
  },
};
