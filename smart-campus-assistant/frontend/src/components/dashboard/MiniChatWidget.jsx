import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What is my current attendance across subjects?',
  'Am I eligible for upcoming placement drives?',
  'Summarize the university exam attendance policy.',
];

export default function MiniChatWidget() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) return;
    navigate('/chatbot', { state: { initialPrompt: q } });
  };

  return (
    <div className="campus-card p-5 bg-gradient-to-br from-[#131d19] via-[#141a22] to-[#141a22] border-emerald-500/25">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Smart Campus Assistant</h3>
            <p className="text-xs text-slate-400">Multi-agent RAG, SQLite records & multimodal analysis</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-emerald-400" />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about attendance, marks, placements, library, or docs..."
          className="campus-input flex-1"
        />
        <button type="submit" className="campus-btn-primary shrink-0">
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTED_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => navigate('/chatbot', { state: { initialPrompt: q } })}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#10161d] hover:bg-emerald-500/15 border border-[#253040] hover:border-emerald-500/35 text-slate-300 hover:text-emerald-300 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

