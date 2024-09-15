"use client";

import { ChatSection } from "@/app/components/chat/ChatSection";
import { ChatTopSection } from "@/app/components/chat/ChatTopSection";
import { SearchHistorySection } from "@/app/components/chat/SearchHistorySection";
import { ChatHistory, Result } from "@/app/components/chat/types";
import { Message, useChat } from "ai/react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

export const Chat = () => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(true);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadChatHistories = () => {
    const histories = JSON.parse(localStorage.getItem("chatHistories") || "[]");
    return histories;
  };

  const { messages, input, handleInputChange, handleSubmit, setMessages } =
    useChat({
      initialMessages: [
        //   {
        //     id: "initial",
        //     role: "assistant",
        //     content: "Hej, czego dzisiaj poszukujesz?",
        //   },
      ],
    });

  useEffect(() => {
    const histories = loadChatHistories();
    setChatHistories(histories);

    if (histories.length > 0) {
      const lastChat = histories[histories.length - 1];
      setCurrentChatId(lastChat.id);

      setMessages(lastChat.messages);
      setResults(lastChat.results || []);
    } else {
      startNewChat();
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      const updatedMessages = chatHistories.map((history) =>
        history.id === currentChatId ? { ...history, messages } : history,
      );
      localStorage.setItem("chatHistories", JSON.stringify(updatedMessages));
    }
  }, [messages]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const startNewChat = () => {
    setIsLoading(false);
    setResults([]);
    const newChatId = Date.now().toString();
    const newChat: ChatHistory = {
      id: newChatId,
      title: `Chat ${chatHistories.length + 1}`,
      results: [],
      messages: [
        {
          id: "initial",
          role: "assistant",
          content: "Hej, czego dzisiaj poszukujesz?",
        },
      ],
    };
    if (messages.length > 1) {
      const updatedHistories = [...chatHistories, newChat];
      localStorage.setItem("chatHistories", JSON.stringify(updatedHistories));
      setChatHistories(updatedHistories);
    }

    setCurrentChatId(newChatId);
    setMessages(newChat.messages);
    localStorage.setItem(
      "chatHistories",
      JSON.stringify([...chatHistories, newChat]),
    );
  };

  const selectChat = (chatId: string) => {
    const selectedChat = chatHistories.find((history) => history.id === chatId);
    if (selectedChat) {
      setCurrentChatId(chatId);
      setMessages(selectedChat.messages);
      setResults(selectedChat.results || []);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    const updatedMessages = [...messages, userMessage];

    const updatedHistories = chatHistories.map((history) =>
      history.id === currentChatId
        ? { ...history, messages: updatedMessages }
        : history,
    );
    localStorage.setItem("chatHistories", JSON.stringify(updatedHistories));
    setChatHistories(updatedHistories);

    await handleSubmit(e);
    setMessages(updatedMessages);
  };

  useEffect(() => {
    const getResults = async () => {
      if (messages.length === 0) return;
      const lastMessage = messages[messages.length - 1].content;

      if (
        lastMessage.includes("Teraz szukam dla ciebie najlepszych propozycji!")
      ) {
        setIsLoading(true);
        const userQuery = lastMessage
          .replace("Teraz szukam dla ciebie najlepszych propozycji!", "")
          .trim();

        try {
          const tavilyResponse = await axios.post("/api/tavily", { userQuery });
          const newResults = tavilyResponse.data.answer;
          const updatedHistories = chatHistories.map((history) =>
            history.id === currentChatId
              ? { ...history, results: newResults }
              : history,
          );
          localStorage.setItem(
            "chatHistories",
            JSON.stringify(updatedHistories),
          );
          setIsLoading(false);
          setChatHistories(updatedHistories);
          setResults(newResults);
        } catch (error) {
          console.error("Error fetching results:", error);
          setIsLoading(false);
        }
      }
    };

    getResults();
  }, [messages, currentChatId]);

  return (
    <div className="h-dvh min-h-dvh px-4 pb-20 pt-8 xl:px-16">
      <section className="flex h-full flex-col justify-between gap-10 lg:flex-row xl:gap-20">
        <SearchHistorySection
          chatHistories={chatHistories}
          selectChat={selectChat}
          currentChatId={currentChatId}
        />
        <ChatSection
          loader={isLoading}
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleFormSubmit={handleFormSubmit}
          results={results}
          isPopupVisible={isPopupVisible}
          setIsPopupVisible={setIsPopupVisible}
          chatEndRef={chatEndRef}
        />
        <ChatTopSection startNewChat={startNewChat} />
      </section>
    </div>
  );
};
