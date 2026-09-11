import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  BookMarked,
  Volume2,
  Maximize2,
} from 'lucide-react';
import liberHeroImg from '../../assets/liber_hero.jpg';
import { avatarImg } from '../../mocks/mockData.js';
import { useLiberChat } from '../../hooks/useLiberChat.js';

/**
 * LiberCompanionDock — the right-rail chat panel visible on desktop Home & Explore tabs.
 *
 * Previously maintained its own duplicate messages state and handler logic.
 * Now delegates entirely to useLiberChat(), which reads from the shared useLiberStore.
 * Any message sent here is instantly visible in the full LiberView and vice-versa.
 */
export default function LiberCompanionDock({ onExpandFull }) {
  const chat = useLiberChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.isTyping]);

  return (
    <div className="w-80 xl:w-96 bg-white dark:bg-[#15101C] border-l border-[#ECE7DF] dark:border-[#2C2338] h-screen sticky top-0 flex flex-col select-none shadow-sm transition-colors duration-200">

      {/* Dock Header */}
      <div className="p-4 border-b border-[#ECE7DF] dark:border-[#2C2338] bg-[#FAF8F5]/80 dark:bg-[#17111F]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700 ring-2 ring-purple-900/10">
            <img src={avatarImg} alt="Liber" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#43335A] dark:text-[#F1ECF7] tracking-wider uppercase">
              LIBER COMPANION
            </h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[#80778B] dark:text-[#9A8FA7]">Living Intelligence</span>
            </div>
          </div>
        </div>

        {onExpandFull && (
          <button
            onClick={onExpandFull}
            title="Expand Fullscreen"
            className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-[#251D30] flex items-center justify-center text-[#80778B] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hero Mini Banner */}
      <div className="p-3 border-b border-[#ECE7DF] dark:border-[#2C2338] bg-gradient-to-b from-[#F5F0E8] to-[#FAF8F5] dark:from-[#211A29] dark:to-[#17111F]">
        <div className="relative rounded-xl overflow-hidden h-28 border border-stone-200 dark:border-stone-700/60 shadow-xs">
          <img src={liberHeroImg} alt="Liber" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
            <span className="text-[11px] font-semibold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFDE88] fill-[#FFDE88]" />
              Keeper of the Archives
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar text-xs">
        {chat.messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3 rounded-2xl max-w-[90%] leading-relaxed ${
                  isUser
                    ? 'bg-[#43335A] dark:bg-[#5D427C] text-white rounded-tr-sm'
                    : 'bg-[#F3EFEA] dark:bg-[#251D30] text-[#2D223B] dark:text-[#F1ECF7] border border-[#E8E2D8] dark:border-[#382C48] rounded-tl-sm'
                }`}
              >
                {m.text}
              </div>

              {!isUser && m.actions && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => chat.handleAction(a)}
                      className="bg-white dark:bg-[#1F1828] hover:bg-stone-50 dark:hover:bg-[#2A2036] border border-[#DDD5C7] dark:border-[#3B2D4B] text-[#51406B] dark:text-[#D4C8E2] font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                    >
                      {a === 'Tell me more' && <BookOpen className="w-2.5 h-2.5" />}
                      {a === 'Add to Library' && <BookMarked className="w-2.5 h-2.5 text-[#DE9B35]" />}
                      {a === 'Read passage' && <Volume2 className="w-2.5 h-2.5" />}
                      <span>{a}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {chat.isTyping && (
          <div className="self-start bg-[#F3EFEA] dark:bg-[#251D30] text-[#80778B] dark:text-[#9A8EA6] border border-[#E8E2D8] dark:border-[#382C48] px-3 py-2 rounded-xl text-xs flex items-center gap-1">
            <span className="w-1 h-1 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce" />
            <span className="w-1 h-1 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1 h-1 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[10px] ml-1">Liber is pondering...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          chat.handleSend();
        }}
        className="p-3 border-t border-[#ECE7DF] dark:border-[#2C2338] bg-[#FAF8F5] dark:bg-[#17111F]"
      >
        <div className="bg-white dark:bg-[#1F1828] rounded-full border border-[#DDD5C7] dark:border-[#382C48] px-3 py-1.5 flex items-center gap-2 shadow-xs focus-within:border-[#51406B] dark:focus-within:border-[#8E72B8] focus-within:ring-2 focus-within:ring-purple-900/10 transition-all">
          <input
            type="text"
            value={chat.inputValue}
            onChange={(e) => chat.setInputValue(e.target.value)}
            placeholder="Ask Liber..."
            className="w-full bg-transparent text-xs text-[#2D223B] dark:text-[#F1ECF7] outline-none placeholder-[#A096AA] dark:placeholder-[#766A82]"
          />
          <button
            type="submit"
            disabled={!chat.inputValue.trim()}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              chat.inputValue.trim()
                ? 'bg-[#43335A] dark:bg-[#8E72B8] text-white'
                : 'bg-stone-100 dark:bg-[#281F33] text-stone-300 dark:text-stone-600'
            }`}
          >
            <Send className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
