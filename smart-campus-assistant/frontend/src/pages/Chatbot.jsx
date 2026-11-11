import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ConversationList from '../components/chatbot/ConversationList';
import ChatMessageBubble from '../components/chatbot/ChatMessageBubble';
import AttachmentUploader from '../components/chatbot/AttachmentUploader';
import { chatService } from '../services/chatService';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/formatters';

const QUICK_SUGGESTIONS = [
  'Check my attendance across all subjects',
  'Show my internal marks and performance',
  'What are the university exam rules and attendance policy?',
  'Which placement opportunities am I eligible for?',
  'What are the central library and hostel timings?',
];

export default function Chatbot() {
  const location = useLocation();
  const { toast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachedDoc, setAttachedDoc] = useState(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentStep, setAgentStep] = useState('');

  const messagesEndRef = useRef(null);
  const initialPromptHandled = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, agentStep]);

  const loadConversations = async (selectId = null) => {
    try {
      const list = await chatService.getConversations();
      setConversations(list);
      const targetId = selectId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        setActiveConvId(targetId);
        const history = await chatService.getMessages(targetId);
        setMessages(history);
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load chat conversations'));
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt;
    if (initialPrompt && !loadingConvs && !initialPromptHandled.current) {
      initialPromptHandled.current = true;
      handleSendMessage(initialPrompt, true);
    }
  }, [location.state, loadingConvs]);

  const handleSelectConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const history = await chatService.getMessages(convId);
      setMessages(history);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load conversation messages'));
    }
  };

  const handleCreateConversation = async () => {
    try {
      const created = await chatService.createConversation('New Campus Chat');
      setConversations((prev) => [created, ...prev]);
      setActiveConvId(created.id);
      setMessages([]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create conversation'));
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await chatService.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
      toast.info('Conversation deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete conversation'));
    }
  };

  const handleSendMessage = async (overrideText = null, forceNew = false) => {
    const queryText = (overrideText ?? input).trim();
    if (!queryText || sending) return;

    const currentAttachment = attachedDoc;
    if (!overrideText) setInput('');
    setAttachedDoc(null);
    setSending(true);
    setAgentStep('Supervisor Agent analyzing intent...');

    let targetConvId = forceNew ? null : activeConvId;

    const tempUserMsg = {
      id: `temp-user-${Date.now()}`,
      sender: 'user',
      content: queryText,
      attachment_name: currentAttachment?.filename || null,
      created_at: new Date().toISOString(),
    };
    const tempAiId = `temp-ai-${Date.now()}`;
    const tempAiMsg = {
      id: tempAiId,
      sender: 'assistant',
      content: '',
      agent_used: 'Supervisor',
      citations: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => (forceNew ? [tempUserMsg, tempAiMsg] : [...prev, tempUserMsg, tempAiMsg]));

    const payload = {
      message: queryText,
      conversation_id: targetConvId,
      attachment_document_id: currentAttachment?.id || null,
    };

    try {
      let streamDone = false;
      await chatService.streamMessage(payload, {
        onMeta: (meta) => {
          if (meta?.conversation_id) {
            targetConvId = meta.conversation_id;
            setActiveConvId(meta.conversation_id);
          }
        },
        onAgentStep: (step) => {
          setAgentStep(step?.detail || `${step?.node || 'Agent'} processing...`);
          if (step?.node) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempAiId ? { ...m, agent_used: step.node } : m))
            );
          }
        },
        onToken: (tok) => {
          const textChunk = typeof tok === 'string' ? tok : tok?.text || '';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAiId ? { ...m, content: m.content + textChunk } : m
            )
          );
        },
        onDone: (doneData) => {
          streamDone = true;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAiId
                ? {
                    ...m,
                    id: doneData?.message_id || m.id,
                    agent_used: doneData?.agent_used || m.agent_used,
                    citations: doneData?.citations || [],
                    guardrail_triggered: Boolean(doneData?.guardrail_triggered),
                    content: doneData?.full_text || m.content,
                  }
                : m
            )
          );
        },
        onError: (errPayload) => {
          throw new Error(errPayload?.message || 'Streaming error');
        },
      });

      if (!streamDone) {
        const res = await chatService.sendMessage(payload);
        targetConvId = res.conversation_id;
        setActiveConvId(res.conversation_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiId
              ? {
                  ...m,
                  id: res.message_id || m.id,
                  content: res.response,
                  agent_used: res.agent_used,
                  citations: res.citations || [],
                  guardrail_triggered: Boolean(res.guardrail_triggered),
                }
              : m
          )
        );
      }

      const refreshedList = await chatService.getConversations();
      setConversations(refreshedList);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to get response from Smart Campus AI.');
      toast.error(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? {
                ...m,
                content: `Unable to complete request: ${msg}`,
                agent_used: 'Error Handler',
              }
            : m
        )
      );
    } finally {
      setSending(false);
      setAgentStep('');
    }
  };

  return (
    <DashboardLayout title="AI Campus Assistant">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-8rem)]">
        {/* Conversation History Sidebar */}
        <div className="lg:col-span-1 h-48 lg:h-full">
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onCreate={handleCreateConversation}
            onDelete={handleDeleteConversation}
          />
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3 campus-card flex flex-col h-full overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#232d3b] flex items-center justify-between bg-[#10151c]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  LangGraph Multi-Agent Campus Assistant
                </h2>
                <p className="text-[11px] text-slate-400">
                  Supervisor • Academic RAG • Student Info • Placements • Campus Support • Multimodal
                </p>
              </div>
            </div>
            {agentStep && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="truncate max-w-[220px]">{agentStep}</span>
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Ask Anything About Your Campus Life
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Questions are automatically routed across your personal academic records, university RAG documents, placement eligibility, campus services, or uploaded files.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#10151c] hover:bg-emerald-500/15 border border-[#253040] hover:border-emerald-500/35 text-slate-300 hover:text-emerald-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 border-t border-[#232d3b] bg-[#10151c]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <AttachmentUploader
                attachedDoc={attachedDoc}
                onAttached={(doc) => setAttachedDoc(doc)}
                onClear={() => setAttachedDoc(null)}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about attendance, marks, exams, syllabus PDFs, placements, or upload an image..."
                className="campus-input flex-1 min-w-[200px]"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="campus-btn-primary px-5"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

