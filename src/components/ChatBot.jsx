"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  ExternalLink,
  Car,
  History,
  Plus,
  Banknote,
  ChevronRight,
} from "lucide-react";
import { getChatbotResponse } from "@/actions/chatbot";
import {
  listChatConversations,
  loadChatConversation,
  createNewChatConversation,
  ensureChatConversation,
} from "@/actions/chat-conversation";
import Link from "next/link";
import Image from "next/image";
import { formatSaudiRiyalText } from "@/lib/helper";

const PROACTIVE_GREETING =
  "👋 أهلاً، أنا مساعد MAX AI\nتكلّم بحرية — أقدر أساعدك بأي استفسار عن السيارات أو التمويل";
const PROACTIVE_INTERVAL_MS = 8000;
const SESSION_KEY = "max_chat_session_id";
const CONVERSATION_KEY = "max_chat_conversation_id";
const WELCOME_TEXT =
  "مرحباً! أنا مساعد ماكس موتورز 🚗\nمحادثة حرة — اسألني عن أي سيارة، مقارنة، قسط حسب راتبك، أو التمويل.\nكيف أقدر أساعدك؟";

function cleanPhoneNumber(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function ChatContactActions({ contactActions }) {
  if (!contactActions) return null;

  const { phone, whatsapp, email, mandebs = [] } = contactActions;
  const hasStoreContact = phone || whatsapp || email;

  if (!hasStoreContact && mandebs.length === 0) return null;

  return (
    <div className="mt-2 w-full max-w-[95%] space-y-2">
      {hasStoreContact ? (
        <div className="flex flex-col gap-2">
          {phone ? (
            <a
              href={`tel:${cleanPhoneNumber(phone)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 w-fit max-w-full"
            >
              📞 هاتف: {phone}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={`https://wa.me/${cleanPhoneNumber(whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 w-fit max-w-full"
            >
              💬 واتساب: {whatsapp}
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 w-fit max-w-full break-all"
            >
              ✉️ بريد: {email}
            </a>
          ) : null}
        </div>
      ) : null}

      {mandebs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">مناديب المبيعات:</p>
          {mandebs.map((mandeb) => (
            <div
              key={mandeb.id}
              className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm"
            >
              <p className="text-sm font-semibold text-gray-900">{mandeb.name}</p>
              <p className="text-xs text-gray-500 mb-2">{mandeb.city}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${cleanPhoneNumber(mandeb.phone)}`}
                  className="inline-flex items-center rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700"
                >
                  اتصال
                </a>
                <a
                  href={`https://wa.me/${cleanPhoneNumber(mandeb.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  واتساب
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompareResult({ comparison }) {
  if (!comparison?.rows?.length) return null;

  const shortLabel = (label, fallback) => {
    const text = String(label || fallback || "").trim();
    if (text.length <= 22) return text;
    return `${text.slice(0, 20)}…`;
  };

  return (
    <div className="mt-2 w-full max-w-[95%] space-y-2">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-right text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-zinc-900 text-white">
                <th className="px-2 py-2 font-semibold whitespace-nowrap">المواصفة</th>
                <th className="px-2 py-2 font-semibold">
                  {shortLabel(comparison.car1Label, "السيارة 1")}
                </th>
                <th className="px-2 py-2 font-semibold">
                  {shortLabel(comparison.car2Label, "السيارة 2")}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr
                  key={row.key || row.label}
                  className={`border-t border-gray-100 ${
                    row.differs ? "bg-amber-50/80" : "bg-white"
                  } ${row.highlight ? "font-semibold" : ""}`}
                >
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{row.label}</td>
                  <td className="px-2 py-1.5 text-gray-900 [overflow-wrap:anywhere]">{row.a}</td>
                  <td className="px-2 py-1.5 text-gray-900 [overflow-wrap:anywhere]">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-100 bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
          الصفوف المظللة = اختلاف بين السيارتين
        </p>
      </div>
    </div>
  );
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function mapLoadedMessages(rows) {
  if (!rows?.length) {
    return [
      {
        id: "welcome",
        text: WELCOME_TEXT,
        sender: "bot",
        timestamp: new Date(),
        cars: [],
        offers: [],
      },
    ];
  }
  return rows.map((msg) => ({
    id: msg.id,
    text: msg.text || msg.content,
    sender: msg.sender || (msg.role === "user" ? "user" : "bot"),
    timestamp: new Date(msg.createdAt || Date.now()),
    cars: msg.cars || msg.payload?.cars || [],
    offers: msg.offers || msg.payload?.offers || [],
    fieldPrompt: msg.fieldPrompt || msg.payload?.fieldPrompt || null,
    loanSubmitted: msg.loanSubmitted || msg.payload?.loanSubmitted || null,
    contactActions: msg.contactActions || msg.payload?.contactActions || null,
    carSelectAction:
      msg.carSelectAction || msg.payload?.carSelectAction || null,
    comparison: msg.comparison || msg.payload?.comparison || null,
  }));
}

export default function ChatBot({ onOpenChange }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showStarterMessages, setShowStarterMessages] = useState(true);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const proactiveTimersRef = useRef({ hide: null, next: null });
  const scheduleNextBubbleRef = useRef(null);

  const starterMessages = [
    {
      id: 1,
      text: "هل يوجد سيارات فاخرة لديكم؟",
      icon: "✨",
      description: "سيارات فاخرة",
    },
    {
      id: 2,
      text: "أبحث عن أحدث عروض السيارات المتوفرة حالياً؟",
      icon: "🚗",
      description: "أحدث العروض",
    },
    {
      id: 3,
      text: "ما هي أفضل سيارة اقتصادية في السعر والوقود؟",
      icon: "💰",
      description: "اقتصادية في السعر والوقود",
    },
    {
      id: 4,
      text: "اريد مقارنة بين سيارتين",
      icon: "⚖️",
      description: "مقارنة بين سيارتين",
    },
    {
      id: 5,
      text: "رشّح لي سيارة حسب راتبي 7000 ريال",
      icon: "💼",
      description: "ترشيح حسب الراتب",
    },
    {
      id: 6,
      text: "أبي سيارة قسطها 1500 كحد أقصى",
      icon: "🏦",
      description: "حسب القسط الشهري",
    },
    {
      id: 7,
      text: "أريد التواصل بخصوص عروض الشركات والمؤسسات؟",
      icon: "🏢",
      description: "عروض الشركات",
    },
    {
      id: 8,
      text: "أبي أرقام التواصل",
      icon: "📞",
      description: "بيانات التواصل",
    },
  ];

  const refreshHistory = useCallback(async (sid) => {
    if (!sid) return;
    setHistoryLoading(true);
    try {
      const items = await listChatConversations(sid);
      setHistoryItems(items || []);
    } catch (error) {
      console.error("Failed to load chat history", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);
    setMounted(true);

    (async () => {
      try {
        const savedConversationId = localStorage.getItem(CONVERSATION_KEY);
        if (savedConversationId) {
          const loaded = await loadChatConversation(savedConversationId, sid);
          if (loaded.success) {
            setConversationId(loaded.conversation.id);
            setMessages(mapLoadedMessages(loaded.conversation.messages));
            setShowStarterMessages(
              !(loaded.conversation.messages || []).some((m) => m.sender === "user" || m.role === "user")
            );
            return;
          }
        }
        const conversation = await ensureChatConversation(sid, {
          title: "محادثة جديدة",
        });
        setConversationId(conversation.id);
        localStorage.setItem(CONVERSATION_KEY, conversation.id);
        setMessages(mapLoadedMessages([]));
      } catch (error) {
        console.error("Failed to init chat conversation", error);
        setMessages(mapLoadedMessages([]));
      }
    })();
  }, []);

  useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (isOpen && sessionId) refreshHistory(sessionId);
  }, [isOpen, sessionId, refreshHistory]);

  useEffect(() => {
    if (!mounted || isOpen) {
      setShowProactiveBubble(false);
      return;
    }

    const clearProactiveTimers = () => {
      if (proactiveTimersRef.current.hide) {
        clearTimeout(proactiveTimersRef.current.hide);
        proactiveTimersRef.current.hide = null;
      }
      if (proactiveTimersRef.current.next) {
        clearTimeout(proactiveTimersRef.current.next);
        proactiveTimersRef.current.next = null;
      }
    };

    const showBubble = () => {
      setShowProactiveBubble(true);
      if (proactiveTimersRef.current.hide) {
        clearTimeout(proactiveTimersRef.current.hide);
      }
      proactiveTimersRef.current.hide = setTimeout(() => {
        setShowProactiveBubble(false);
        scheduleNextBubble();
      }, 12000);
    };

    const scheduleNextBubble = () => {
      if (proactiveTimersRef.current.next) {
        clearTimeout(proactiveTimersRef.current.next);
      }
      proactiveTimersRef.current.next = setTimeout(showBubble, PROACTIVE_INTERVAL_MS);
    };

    scheduleNextBubbleRef.current = scheduleNextBubble;
    proactiveTimersRef.current.next = setTimeout(showBubble, PROACTIVE_INTERVAL_MS);

    return () => {
      clearProactiveTimers();
      scheduleNextBubbleRef.current = null;
    };
  }, [mounted, isOpen]);

  const dismissProactiveBubble = (scheduleNext = true) => {
    setShowProactiveBubble(false);
    if (proactiveTimersRef.current.hide) {
      clearTimeout(proactiveTimersRef.current.hide);
      proactiveTimersRef.current.hide = null;
    }
    if (scheduleNext) scheduleNextBubbleRef.current?.();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const userMessages = messages.filter((msg) => msg.sender === "user");
    if (userMessages.length > 0) setShowStarterMessages(false);
  }, [messages]);

  const formatMessageText = (text) => {
    const parts = String(text || "").split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|https?:\/\/[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const markdownLinkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (markdownLinkMatch) {
        return (
          <a
            key={index}
            href={markdownLinkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {markdownLinkMatch[1]}
          </a>
        );
      }
      if (part.match(/^https?:\/\//)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            🔗
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const applyBotResult = (result) => {
    if (result?.conversationId) {
      setConversationId(result.conversationId);
      localStorage.setItem(CONVERSATION_KEY, result.conversationId);
    }
    return {
      id: `${Date.now()}_bot`,
      text: result?.success
        ? result.message
        : result?.message || "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى. 😊",
      sender: "bot",
      timestamp: new Date(),
      cars: result?.cars || [],
      offers: result?.offers || [],
      fieldPrompt: result?.fieldPrompt || null,
      loanSubmitted: result?.loanSubmitted || null,
      contactActions: result?.contactActions || null,
      carSelectAction: result?.carSelectAction || null,
      comparison: result?.comparison || null,
    };
  };

  const sendMessage = async (messageText, extraOptions = {}) => {
    if (!messageText?.trim() || isTyping || !sessionId) return;

    const userMessage = {
      id: `${Date.now()}_user`,
      text: messageText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    if (!extraOptions.skipUserBubble) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setShowStarterMessages(false);
    setShowHistory(false);
    setIsTyping(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
        cars: msg.cars || [],
      }));

      const result = await getChatbotResponse(messageText.trim(), conversationHistory, {
        sessionId,
        conversationId,
        ...extraOptions,
      });

      setMessages((prev) => [...prev, applyBotResult(result)]);
      refreshHistory(sessionId);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_err`,
          text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً. 🙏",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStarterMessageClick = (messageText) => sendMessage(messageText);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;
    setInputMessage("");
    await sendMessage(text);
  };

  const handleSelectCar = async (carId, purpose = "loan") => {
    await sendMessage(
      purpose === "compare" ? "اختيار سيارة للمقارنة" : "اختيار سيارة للتمويل",
      {
        action: "select_car",
        actionPayload: { carId },
      }
    );
  };

  const handleSelectOffer = async (offerId) => {
    await sendMessage("اختيار عرض تمويلي", {
      action: "select_offer",
      actionPayload: { offerId },
    });
  };

  const handleQuickOption = async (value) => {
    setInputMessage("");
    await sendMessage(value);
  };

  const handleNewChat = async () => {
    if (!sessionId || isTyping) return;
    setIsTyping(true);
    try {
      const conversation = await createNewChatConversation(sessionId);
      setConversationId(conversation.id);
      localStorage.setItem(CONVERSATION_KEY, conversation.id);
      setMessages(mapLoadedMessages([]));
      setShowStarterMessages(true);
      setShowHistory(false);
      refreshHistory(sessionId);
    } catch (error) {
      console.error("Failed to create conversation", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLoadConversation = async (id) => {
    if (!sessionId || isTyping) return;
    setIsTyping(true);
    try {
      const loaded = await loadChatConversation(id, sessionId);
      if (!loaded.success) return;
      setConversationId(loaded.conversation.id);
      localStorage.setItem(CONVERSATION_KEY, loaded.conversation.id);
      setMessages(mapLoadedMessages(loaded.conversation.messages));
      setShowStarterMessages(false);
      setShowHistory(false);
    } catch (error) {
      console.error("Failed to load conversation", error);
    } finally {
      setIsTyping(false);
    }
  };

  return !mounted ? null : (
    <>
      {!isOpen && (
        <div className="fixed z-[60] right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] md:right-6 md:bottom-6">
          <div className="relative w-fit">
            {showProactiveBubble && (
              <div
                className="absolute bottom-full right-0 z-10 mb-1.5 w-max max-w-[min(13.5rem,calc(100vw-1.5rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))] animate-in fade-in slide-in-from-bottom-2 duration-300 md:mb-2 md:max-w-[min(17rem,calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))]"
                role="status"
                aria-live="polite"
              >
                <div
                  dir="rtl"
                  className="relative w-full min-w-0 cursor-pointer rounded-lg border border-white/15 bg-black/85 px-2.5 pb-2 pt-1.5 shadow-md backdrop-blur-md md:px-3 md:py-2 md:shadow-lg"
                  onClick={() => {
                    dismissProactiveBubble(false);
                    setIsOpen(true);
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissProactiveBubble();
                    }}
                    className="absolute top-1.5 end-1.5 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-700/95 text-gray-200 ring-1 ring-white/10 transition hover:bg-gray-600 hover:text-white touch-manipulation after:pointer-events-none after:absolute after:-inset-2 after:content-[''] md:top-2 md:end-2 md:h-5 md:w-5 md:after:hidden"
                    aria-label="إغلاق الرسالة"
                  >
                    <X className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                  </button>
                  <p className="min-w-0 pe-8 ps-1 text-start text-[0.6875rem] font-normal leading-[1.5] text-white/95 [overflow-wrap:anywhere] whitespace-pre-line sm:text-xs md:pe-7 md:text-[11px] md:leading-snug">
                    {PROACTIVE_GREETING}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                dismissProactiveBubble(false);
                setIsOpen(true);
              }}
              className="relative shrink-0 transition-transform duration-300 hover:scale-110 active:scale-105 touch-manipulation"
              aria-label="فتح الدردشة"
            >
              <Image
                src="/ai.png"
                alt="مساعد AI"
                width={160}
                height={160}
                className="h-20 w-20 md:h-32 md:w-32 lg:h-40 lg:w-40 object-contain drop-shadow-2xl"
                priority
              />
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto w-full md:w-[26rem] h-[80vh] md:h-[640px] bg-zinc-950 text-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col z-50 border-t md:border border-white/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gold text-white rounded-t-2xl p-3 md:p-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-full overflow-hidden shrink-0">
                <Image
                  src="/chatbot-logo.png"
                  alt="مساعد ماكس موتورز"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm md:text-base truncate">مساعد ماكس موتورز</h3>
                <p className="text-[11px] text-gold-light">محادثة حرة + سجل</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleNewChat}
                className="hover:bg-gold-dark rounded-full p-2 transition"
                aria-label="محادثة جديدة"
                title="محادثة جديدة"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="hover:bg-gold-dark rounded-full p-2 transition"
                aria-label="سجل المحادثات"
                title="سجل المحادثات"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:bg-gold-dark rounded-full p-2 transition"
                aria-label="إغلاق الدردشة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-3 bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">محادثاتي السابقة</h4>
                <button
                  type="button"
                  className="text-xs text-gold"
                  onClick={() => setShowHistory(false)}
                >
                  رجوع للمحادثة
                </button>
              </div>
              {historyLoading ? (
                <p className="text-sm text-white/60 text-center py-8">جاري التحميل...</p>
              ) : historyItems.length === 0 ? (
                <p className="text-sm text-white/60 text-center py-8">لا توجد محادثات بعد</p>
              ) : (
                historyItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadConversation(item.id)}
                    className={`w-full text-right rounded-xl border p-3 transition ${
                      item.id === conversationId
                        ? "border-gold bg-gold-dark/40"
                        : "border-white/10 bg-zinc-950 hover:border-gold-dark/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      {item.messageCount} رسالة ·{" "}
                      {new Date(item.updatedAt).toLocaleDateString("ar-SA")}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-zinc-900">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${
                      message.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-2.5 md:p-3 ${
                        message.sender === "user"
                          ? "bg-gold text-white rounded-bl-none"
                          : "bg-white text-gray-900 rounded-br-none shadow-md border border-gray-200"
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-line break-words">
                        {formatMessageText(message.text)}
                      </div>
                      {message.fieldPrompt?.options?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.fieldPrompt.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={isTyping}
                              onClick={() => handleQuickOption(opt.label || opt.value)}
                              className="text-xs px-2.5 py-1 rounded-full bg-gold-light text-gold-dark border border-gold-light hover:bg-gold-light"
                            >
                              {opt.label || opt.value}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === "user" ? "text-gold-light" : "text-gray-400"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {message.comparison ? (
                      <CompareResult comparison={message.comparison} />
                    ) : null}

                    {message.cars?.length > 0 && (
                      <div className="mt-2 space-y-2 w-full max-w-[95%]">
                        {message.cars.map((car) => (
                          <div
                            key={car.id}
                            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                          >
                            <Link href={`/cars/${car.id}`} className="flex gap-2">
                              <div className="w-20 h-20 relative flex-shrink-0">
                                {car.images?.[0] ? (
                                  <Image
                                    src={car.images[0]}
                                    alt={`${car.make} ${car.model}`}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <Car className="h-7 w-7 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 p-2 min-w-0">
                                <h4 className="font-bold text-sm text-gray-900 truncate">
                                  {car.make} {car.model}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {car.year} • {car.bodyType}
                                </p>
                                <p className="text-sm font-bold text-green-600 mt-1">
                                  {formatSaudiRiyalText(car.price)}
                                </p>
                              </div>
                              <div className="flex items-center px-2">
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </div>
                            </Link>
                            {message.carSelectAction !== "none" && (
                            <div className="px-2 pb-2">
                              {message.carSelectAction === "compare" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isTyping}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                  onClick={() => handleSelectCar(car.id, "compare")}
                                >
                                  اختر للمقارنة
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isTyping}
                                  className="w-full bg-gold hover:bg-gold-dark text-white text-xs"
                                  onClick={() => handleSelectCar(car.id, "loan")}
                                >
                                  <Banknote className="h-3.5 w-3.5 ml-1" />
                                  {Number(car.price) > 0
                                    ? "موّل هذه السيارة"
                                    : "تواصل مع الإدارة للتسعير"}
                                </Button>
                              )}
                            </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.offers?.length > 0 && (
                      <div className="mt-2 space-y-2 w-full max-w-[95%]">
                        {message.offers.slice(0, 8).map((offer) => (
                          <div
                            key={offer.id}
                            className="rounded-lg border border-gold-dark/70 bg-zinc-950 p-3 text-right"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold text-gold">
                                {offer.bankName}
                              </p>
                              <p className="text-xs text-white/60">
                                {Math.floor((offer.termMonths || 60) / 12)} سنوات
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center text-xs mb-2">
                              <div className="rounded bg-black/60 p-2">
                                <p className="text-white/50">القسط الشهري</p>
                                <p className="font-semibold text-white">
                                  {Math.round(offer.monthlyPayment || 0).toLocaleString("en-US")}
                                </p>
                              </div>
                              <div className="rounded bg-black/60 p-2">
                                <p className="text-white/50">الدفعة الأولى</p>
                                <p className="font-semibold text-white">
                                  {Math.round(offer.downPayment || 0).toLocaleString("en-US")}
                                </p>
                              </div>
                              <div className="rounded bg-black/60 p-2">
                                <p className="text-white/50">الدفعة الأخيرة</p>
                                <p className="font-semibold text-white">
                                  {Math.round(offer.balloonPayment || 0).toLocaleString("en-US")}
                                </p>
                              </div>
                              <div className="rounded bg-black/60 p-2">
                                <p className="text-white/50">نسبة الدفعة</p>
                                <p className="font-semibold text-white">
                                  {Number(offer.downPaymentPct || 0).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isTyping}
                              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => handleSelectOffer(offer.id)}
                            >
                              اختر هذا العرض وأكمل الطلب
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.sender === "bot" && message.contactActions ? (
                      <ChatContactActions contactActions={message.contactActions} />
                    ) : null}
                  </div>
                ))}

                {showStarterMessages && messages.length <= 1 && (
                  <div className="space-y-2 animate-in fade-in-50 duration-500">
                    <p className="text-sm text-white text-center mb-3">
                      اختر أحد الخيارات للبدء:
                    </p>
                    {starterMessages.map((starter) => (
                      <button
                        key={starter.id}
                        onClick={() => handleStarterMessageClick(starter.text)}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-3 text-right transition-all duration-200 hover:shadow-md group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{starter.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{starter.text}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{starter.description}</p>
                          </div>
                          <Send className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 rounded-2xl rounded-br-none p-2.5 shadow-md border border-gray-200">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-3 md:p-4 bg-zinc-950 border-t border-white/10 md:rounded-b-2xl"
              >
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 rounded-full border-gray-600 bg-zinc-900 focus:border-white text-base text-white placeholder:text-gray-400"
                    disabled={isTyping}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-gold hover:bg-gold-dark text-white h-10 w-10"
                    disabled={isTyping || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
