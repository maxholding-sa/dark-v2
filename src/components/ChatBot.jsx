"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, ExternalLink, Car } from "lucide-react";
import { getChatbotResponse } from "@/actions/chatbot";
import Link from "next/link";
import Image from "next/image";
import { formatSaudiRiyalText } from "@/lib/helper";

const PROACTIVE_GREETING =
  "👋 أهلاً، أنا مساعد MAX AI\nأقدر أرشح لك سيارة حسب راتبك أو ميزانيتك";

/** First show and repeat interval when chat is closed (ms). */
const PROACTIVE_INTERVAL_MS = 8000;

export default function ChatBot({ onOpenChange }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "مرحباً! أنا مساعد ماكس موتورز الذكي. كيف يمكنني مساعدتك اليوم؟ 🚗",
      sender: "bot",
      timestamp: new Date(),
      cars: [],
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showStarterMessages, setShowStarterMessages] = useState(true);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const messagesEndRef = useRef(null);
  const proactiveTimersRef = useRef({ hide: null, next: null });
  const scheduleNextBubbleRef = useRef(null);

  // Starter message options - aligned with chatbot's search capabilities
  const starterMessages = [
    {
      id: 1,
      text: "هل يوجد سيارات فاخرة لديكم؟",
      icon: "✨",
      description: "سيارات فاخرة"
    },
    {
      id: 2,
      text: "أبحث عن أحدث عروض السيارات المتوفرة حالياً؟",
      icon: "🚗",
      description: "أحدث العروض"
    },
    {
      id: 3,
      text: "ما هي أفضل سيارة اقتصادية في السعر والوقود؟",
      icon: "💰",
      description: "اقتصادية في السعر والوقود"
    },
    {
      id: 4,
      text: "أريد مقارنة بين موديلات السيارات المختلفة",
      icon: "📊",
      description: "مقارنة الموديلات"
    },
    {
      id: 5,
      text: "هل يوجد تقسيط أو تمويل بنكي؟ وما هي الشروط؟",
      icon: "🏦",
      description: "التقسيط والتمويل البنكي"
    },
    {
      id: 6,
      text: "أريد التواصل بخصوص عروض الشركات والمؤسسات؟",
      icon: "🏢",
      description: "عروض الشركات والمؤسسات"
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

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
      proactiveTimersRef.current.next = setTimeout(
        showBubble,
        PROACTIVE_INTERVAL_MS
      );
    };

    scheduleNextBubbleRef.current = scheduleNextBubble;

    proactiveTimersRef.current.next = setTimeout(
      showBubble,
      PROACTIVE_INTERVAL_MS
    );

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
    if (scheduleNext) {
      scheduleNextBubbleRef.current?.();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Hide starter messages after user sends first message
  useEffect(() => {
    const userMessages = messages.filter(msg => msg.sender === "user");
    if (userMessages.length > 0) {
      setShowStarterMessages(false);
    }
  }, [messages]);

  const formatMessageText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|https?:\/\/[^\s]+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold">
            {boldText}
          </strong>
        );
      }
      
      const markdownLinkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (markdownLinkMatch) {
        const linkText = markdownLinkMatch[1];
        const linkUrl = markdownLinkMatch[2];
        return (
          <a
            key={index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {linkText}
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

  const handleStarterMessageClick = async (messageText) => {
    // Create user message
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setShowStarterMessages(false);
    setIsTyping(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
        cars: msg.cars || [],
      }));

      const result = await getChatbotResponse(messageText, conversationHistory);

      const botResponse = {
        id: Date.now() + 1,
        text: result.success
          ? result.message
          : "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى. 😊",
        sender: "bot",
        timestamp: new Date(),
        cars: result.success && result.cars ? result.cars : [],
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً. 🙏",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isTyping) return;

    const userMessageText = inputMessage.trim();

    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setShowStarterMessages(false);

    try {
      const conversationHistory = messages.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
        cars: msg.cars || [],
      }));

      const result = await getChatbotResponse(userMessageText, conversationHistory);

      const botResponse = {
        id: Date.now() + 1,
        text: result.success
          ? result.message
          : "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى. 😊",
        sender: "bot",
        timestamp: new Date(),
        cars: result.success && result.cars ? result.cars : [],
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً. 🙏",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return !mounted ? null : (
    <>
      {!isOpen && (
        <div className="fixed z-[60] left-[max(1rem,env(safe-area-inset-left,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] md:left-6 md:bottom-6">
          {/* w-fit = عرض الزر فقط؛ الفقاعة محاذية من يسار الزر */}
          <div className="relative w-fit">
            {showProactiveBubble && (
              <div
                className="absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-[min(13.5rem,calc(100vw-1.5rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))] animate-in fade-in slide-in-from-bottom-2 duration-300 md:mb-2 md:max-w-[min(17rem,calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))]"
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
        <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto w-full md:w-96 h-[80vh] md:h-[600px] bg-zinc-950 text-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col z-50 border-t md:border border-white/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-yellow-600 text-white rounded-t-2xl md:rounded-t-2xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-full overflow-hidden shrink-0">
                <Image
                  src="/chatbot-logo.png"
                  alt="مساعد ماكس موتورز"
                  width={40}
                  height={40}
                  className="h-9 w-9 md:h-10 md:w-10 object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg">مساعد ماكس موتورز</h3>
                <p className="text-xs text-gray-300">متصل الآن</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-gray-800 rounded-full p-2 transition"
              aria-label="إغلاق الدردشة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-zinc-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[75%] rounded-2xl p-2.5 md:p-3 ${
                    message.sender === "user"
                      ? "bg-yellow-600 text-white rounded-bl-none"
                      : "bg-white text-gray-900 rounded-br-none shadow-md border border-gray-200"
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-line break-words overflow-wrap-anywhere">
                    {formatMessageText(message.text)}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user"
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {message.cars && message.cars.length > 0 && (
                  <div className="mt-2 space-y-2 w-full max-w-[90%]">
                    {message.cars.map((car) => (
                      <Link
                        key={car.id}
                        href={`/cars/${car.id}`}
                        className="block bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        <div className="flex gap-2">
                          <div className="w-24 h-24 relative flex-shrink-0">
                            {car.images && car.images[0] ? (
                              <Image
                                src={car.images[0]}
                                alt={`${car.make} ${car.model}`}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Car className="h-8 w-8 text-gray-400" />
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
                            {car.featured && (
                              <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full mt-1">
                                ⭐ مميزة
                              </span>
                            )}
                          </div>

                          <div className="flex items-center px-2">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Starter Messages - Show only at the beginning */}
            {showStarterMessages && messages.length === 1 && (
              <div className="space-y-2 animate-in fade-in-50 duration-500">
                <p className="text-sm text-white text-center mb-3">
                  اختر أحد الخيارات للبدء:
                </p>
                {starterMessages.map((starter) => (
                  <button
                    key={starter.id}
                    onClick={() => handleStarterMessageClick(starter.text)}
                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-3 text-right transition-all duration-200 hover:shadow-md hover:border-gray-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{starter.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-black">
                          {starter.text}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {starter.description}
                        </p>
                      </div>
                      <Send className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl rounded-br-none p-2.5 md:p-3 shadow-md border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 md:p-4 bg-zinc-950 border-t border-white/10 md:rounded-b-2xl rounded-b-none"
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
                className="rounded-full bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:scale-105 h-10 w-10 md:h-11 md:w-11"
                disabled={isTyping || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}