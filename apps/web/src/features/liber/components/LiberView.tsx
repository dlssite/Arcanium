// @ts-nocheck
// TODO: Full TypeScript typing — tracked as M5 in web-app-audit.md.
// File was converted from .jsx during the M1 view relocation sprint.
// Proper prop interfaces and return types to be added in the Phase 4 TS pass.
import React, { useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Paperclip,
  Mic,
  Send,
  Sparkles,
  BookMarked,
  BookOpen,
  Volume2,
  RefreshCw,
  Scroll,
} from 'lucide-react';
import liberHeroImg from '../../../assets/liber.jpeg';
import { avatarImg, LIBER_VERSION } from '../../../mocks/mockData.js';
import { useLiberChat } from '../../../hooks/useLiberChat.js';
import { features } from '../../../config/features.ts';
import { FormattedMessage } from './FormattedMessage';

export default function LiberView({ onBack }) {
  const chat = useLiberChat();
  const chatBottomRef = useRef(null);

  // Scroll to bottom whenever messages change or Liber starts typing
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.isTyping]);

  // Auto-speak the last Liber message when it follows a "Read passage" action.
  // We detect this by checking if the previous user message was "Read passage".
  const prevUserActionRef = useRef(null);
  useEffect(() => {
    const msgs = chat.messages;
    if (msgs.length < 2) return;

    const last = msgs[msgs.length - 1];
    const secondLast = msgs[msgs.length - 2];

    // Track what the last user message was
    if (secondLast?.sender === 'user') {
      prevUserActionRef.current = secondLast.text;
    }

    // If Liber just replied and the user asked for a passage — speak it
    if (
      last?.sender === 'liber' &&
      last.text &&
      prevUserActionRef.current === 'Read passage' &&
      features.voiceInput
    ) {
      chat.speakPassage(last.text);
    }
  }, [chat.messages]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-[#FAF8F5] dark:bg-[#120E18] pb-24 lg:pb-0 text-[#2D223B] dark:text-[#F1ECF7] flex flex-col select-none px-4 sm:px-6 lg:px-0 transition-colors duration-200">

      {/* Mobile-Only Sticky Header */}
      <header className="flex lg:hidden sticky top-0 bg-[#FAF8F5]/95 dark:bg-[#15101C]/95 backdrop-blur-md z-30 pt-3 pb-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-[#EFEBE4] dark:border-[#2E243A] items-center justify-between shadow-2xs">
        <button
          onClick={onBack}
          aria-label="Back to Dashboard"
          className="w-9 h-9 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] transition-all hover:bg-stone-50 dark:hover:bg-[#251D30] active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2] -ml-0.5" />
        </button>

        <div className="text-center">
          <h1 className="font-serif font-bold text-sm tracking-[0.18em] text-[#43335A] dark:text-[#F1ECF7] uppercase">
            LIBER THE LIBRARIAN
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-[#80778B] dark:text-[#9F94AC] font-medium tracking-wide">
              Living Archive Companion
            </span>
          </div>
        </div>

        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#DE9B35] dark:border-[#DE9B35] shadow-2xs ring-1 ring-[#ECE7DF] dark:ring-[#47395D]">
          <img src={liberHeroImg} alt="Liber the Librarian" className="w-full h-full object-cover object-top" />
        </div>
      </header>

      {/* Dual-Column Layout on Desktop */}
      <div className="pt-3 lg:pt-0 flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 w-full lg:h-full lg:min-h-0">

        {/* Left Column: Portrait + Suggested Prompts */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 mb-4 lg:mb-0 lg:h-full lg:min-h-0 lg:overflow-hidden">

          {/* Liber Portrait Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(67,50,88,0.06)] dark:shadow-dark-card border border-[#ECE7DF] dark:border-[#352B44] bg-white dark:bg-[#1D1726] group flex-shrink-0">
            <div className="relative aspect-square w-full overflow-hidden bg-[#2D2335]">
              <img
                src={liberHeroImg}
                alt="Liber the Librarian Scholar"
                className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#201826]/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#1D1726]/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#43335A] dark:text-[#FFDE88] shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#DE9B35] fill-[#DE9B35]" />
                  <span>Master of the Archives</span>
                </div>
                <span className="text-[10px] text-stone-200 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md font-mono">
                  {LIBER_VERSION}
                </span>
              </div>
            </div>
            <div className="p-3.5 xl:p-4 bg-white dark:bg-[#1D1726] border-t border-stone-100 dark:border-[#352B44]">
              <p className="text-xs text-[#6B6177] dark:text-[#A095AC] italic leading-relaxed">
                "Every manuscript in the vault is a mirror. Tell me what echoes in your thoughts, and I shall fetch the right glass."
              </p>
            </div>
          </div>

          {/* Suggested Inquiries (Desktop only) */}
          <div className="bg-white dark:bg-[#1D1726] rounded-3xl p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hidden lg:flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#43335A] dark:text-[#FFDE88] uppercase tracking-wider mb-2.5 flex-shrink-0">
              <Scroll className="w-3.5 h-3.5 text-[#DE9B35]" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0 no-scrollbar pr-0.5">
              {chat.suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => chat.handleSend(p.prompt)}
                  className="w-full text-left p-2.5 rounded-xl border border-stone-200/70 dark:border-[#362B45] hover:border-[#51406B] dark:hover:border-[#8E72B8] hover:bg-[#FAF6EE] dark:hover:bg-[#251D30] text-xs transition-all group active:scale-98"
                >
                  <p className="font-semibold text-[#2D223B] dark:text-[#F1ECF7] group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88]">
                    {p.title}
                  </p>
                  <p className="text-[11px] text-[#80778B] dark:text-[#9F94AC] truncate mt-0.5">
                    {p.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Conversation Salon */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col flex-1 lg:h-full lg:min-h-0">
          <div className="bg-white dark:bg-[#1D1726] lg:rounded-3xl lg:border lg:border-[#ECE7DF] dark:lg:border-[#352B44] lg:shadow-[0_4px_28px_rgba(67,50,88,0.06)] dark:lg:shadow-dark-card flex flex-col flex-1 lg:h-full lg:min-h-0 overflow-hidden">

            {/* Desktop Card Header */}
            <div className="flex-shrink-0 hidden lg:flex items-center justify-between px-6 py-3.5 border-b border-[#ECE7DF] dark:border-[#352B44] bg-[#FAF8F5]/80 dark:bg-[#17121F]/80 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[#DE9B35] dark:border-[#DE9B35] ring-2 ring-purple-900/10">
                  <img src={liberHeroImg} alt="Liber" className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#43335A] dark:text-[#F1ECF7]">
                    Liber the Librarian
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-[#80778B] dark:text-[#9F94AC]">
                      Connected to Arcanium Codex
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={chat.handleReset}
                className="text-xs text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Scrollable Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar pb-20 lg:pb-6">
              {chat.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] p-3.5 px-4 sm:p-4 sm:px-5 rounded-2xl text-[13.5px] sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#43335A] dark:bg-[#5D427C] text-white rounded-tr-sm shadow-sm'
                          : 'bg-[#F3EFEA] dark:bg-[#251D30] text-[#2D223B] dark:text-[#F1ECF7] rounded-tl-sm border border-[#E7E2DA] dark:border-[#3D3050] shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <p>{msg.text}</p>
                      ) : (
                        <FormattedMessage text={msg.text} />
                      )}
                    </div>

                    {/* Action Pills */}
                    {!isUser && msg.actions && (
                      <div className="flex flex-wrap gap-2 mt-2.5 max-w-[95%]">
                        {msg.actions.map((act, idx) => (
                          <button
                            key={idx}
                            onClick={() => chat.handleAction(act)}
                            className="bg-white dark:bg-[#1E1728] hover:bg-[#FAF6EE] dark:hover:bg-[#2A2038] text-[#51406B] dark:text-[#D4C8E2] text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#DDD5C7] dark:border-[#3E3052] shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            {act === 'Tell me more' && <BookOpen className="w-3.5 h-3.5 text-[#51406B] dark:text-[#D4C8E2]" />}
                            {act === 'Add to Library' && <BookMarked className="w-3.5 h-3.5 text-[#DE9B35]" />}
                            {act === 'Read passage' && <Volume2 className="w-3.5 h-3.5 text-[#43335A] dark:text-[#DE9B35]" />}
                            <span>{act}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {chat.isTyping && (
                <div className="self-start bg-[#F3EFEA] dark:bg-[#251D30] text-[#80778B] dark:text-[#9F94AC] border border-[#E7E2DA] dark:border-[#3D3050] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-xs text-xs">
                  <span className="w-1.5 h-1.5 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#675482] dark:bg-[#9B7BBF] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-medium text-[#726485] dark:text-[#C5BACF]">
                    Liber is contemplating...
                  </span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="flex-shrink-0 fixed lg:static bottom-0 left-0 right-0 w-full max-w-lg mx-auto lg:max-w-none bg-[#FAF8F5]/95 dark:bg-[#15101C]/95 lg:bg-[#FAF8F5]/80 dark:lg:bg-[#17121F]/80 backdrop-blur-md lg:backdrop-blur-none px-4 lg:px-6 py-2.5 lg:py-3.5 pb-safe border-t border-[#ECE7DF] dark:border-[#352B44] z-40 lg:rounded-b-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  chat.handleSend();
                }}
                className="bg-white dark:bg-[#1E1728] rounded-full border border-[#DFD8CC] dark:border-[#3A2D4C] shadow-xs px-3 sm:px-4 py-2 flex items-center gap-2 focus-within:border-[#51406B] dark:focus-within:border-[#8E72B8] focus-within:ring-2 focus-within:ring-purple-900/10 transition-all"
              >
                <button
                  type="button"
                  aria-label="Add attachment"
                  className="w-8 h-8 rounded-full text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#281F36] flex items-center justify-center transition-colors active:scale-90"
                >
                  <Paperclip className="w-4 h-4 rotate-45 stroke-[2]" />
                </button>

                <input
                  type="text"
                  value={chat.inputValue}
                  onChange={(e) => chat.setInputValue(e.target.value)}
                  placeholder="Ask Liber about any tome, author, or passage..."
                  className="flex-1 bg-transparent text-xs sm:text-[13.5px] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9B91A6] dark:placeholder-[#766A82] outline-none py-1"
                />

                {/* Stop speaking button — only visible while TTS is active */}
                {chat.isSpeaking && features.voiceInput && (
                  <button
                    type="button"
                    onClick={chat.stopSpeaking}
                    aria-label="Stop reading aloud"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#DE9B35] hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20 transition-all active:scale-90 animate-pulse"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={chat.toggleVoice}
                  aria-label={chat.activeVoice ? 'Stop listening' : 'Start voice input'}
                  title={
                    !chat.voiceSupported
                      ? 'Voice input not supported in this browser'
                      : chat.activeVoice
                      ? 'Stop listening'
                      : 'Speak to Liber'
                  }
                  disabled={!chat.voiceSupported}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    chat.activeVoice
                      ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse'
                      : !chat.voiceSupported
                      ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
                      : 'text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#281F36]'
                  } ${!features.voiceInput ? 'hidden' : ''}`}
                >
                  <Mic className="w-4 h-4 stroke-[2]" />
                </button>

                <button
                  type="submit"
                  disabled={!chat.inputValue.trim()}
                  aria-label="Send message"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    chat.inputValue.trim()
                      ? 'bg-[#43335A] dark:bg-[#8E72B8] text-white shadow-xs active:scale-90'
                      : 'bg-stone-100 dark:bg-[#271E34] text-stone-300 dark:text-stone-600 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 ml-0.5 stroke-[2]" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
