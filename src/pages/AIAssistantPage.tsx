import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Bot, User } from "lucide-react";
import { API_BASE_URL } from "../api/client";

interface AIAssistantPageProps {
  onBack: () => void;
}

interface Message {
  id: number;
  role: "assistant" | "user";
  content: string;
}

interface ChatResponse {
  reply: string;
}

const API_URL = `${API_BASE_URL}/api/chat`;

function AIAssistantPage({ onBack: _onBack }: AIAssistantPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm your YourArogyum wellness assistant. 🌿 Ask me about nutrition, physical activity, sleep, hydration, or preventive wellness. Let's explore practical, everyday habits together.",
    },
  ]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your session may have expired. Please log in again."
          );
        }

        if (response.status === 400) {
          throw new Error("Please check your message and try again.");
        }

        throw new Error(
          "The assistant could not respond. Please try again."
        );
      }

      const data: ChatResponse = await response.json();

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The assistant returned an empty response.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to connect to the assistant. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <main className="h-full min-h-0 w-full overflow-hidden bg-[#F6F2E9] p-3 text-[#30382F] sm:p-5">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#344C3D]/15 bg-white shadow-sm">
        {/* Chat panel header */}
        <header className="flex shrink-0 items-center gap-4 border-b border-[#344C3D]/10 bg-[#344C3D] px-5 py-4 text-white sm:px-7">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10">
            <Bot size={26} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#DCE3D5]">
              PERSONAL WELLNESS
            </p>
            <h1 className="mt-1 font-serif text-xl sm:text-2xl">
              AI Health Assistant
            </h1>
            <p className="mt-1 text-xs text-white/70 sm:text-sm">
              Your space for everyday health and wellness.
            </p>
          </div>
        </header>

        {/* Conversation area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FCFBF8]">
          <div
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-8 lg:px-12 lg:py-9"
            aria-label="Conversation"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 sm:gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    message.role === "assistant"
                      ? "bg-[#DCE3D5] text-[#344C3D]"
                      : "bg-[#E9E1D1] text-[#8A663F]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>

                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[75%] sm:px-5 sm:py-4 sm:text-[15px] ${
                    message.role === "assistant"
                      ? "rounded-tl-sm border border-[#344C3D]/5 bg-[#F1F0E8] text-[#424A40]"
                      : "rounded-tr-sm bg-[#344C3D] text-white"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#DCE3D5] text-[#344C3D]">
                  <Bot size={20} />
                </div>
                <div
                  role="status"
                  className="rounded-2xl rounded-tl-sm bg-[#F1F0E8] px-4 py-3 text-sm text-[#424A40]"
                >
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Fixed message composer */}
          <div className="shrink-0 border-t border-[#344C3D]/10 bg-white px-4 py-4 sm:px-7 sm:py-5 lg:px-10">
            {notice && (
              <p
                role="alert"
                className="mb-3 text-xs leading-5 text-[#8A663F]"
              >
                {notice}
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex items-end gap-3 rounded-xl border border-[#344C3D]/20 bg-[#FCFBF8] p-2 transition focus-within:border-[#71846B] focus-within:ring-2 focus-within:ring-[#DCE3D5]/60 sm:p-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading}
                  placeholder="Type your health or wellness question..."
                  aria-label="Your message"
                  className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-[#30382F] outline-none placeholder:text-[#999A90] disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#344C3D] text-white transition hover:bg-[#263A2E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={21} />
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-[#898A80]">
                General wellness information only.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AIAssistantPage;
