"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";

interface ChatMessage {
	id: string;
	content: string;
	pageNumber: number;
	role: string;
}

interface ChatInterfaceProps {
	messages: ChatMessage[];
	currentPage: number;
	isLoading: boolean;
	onSendMessage: (message: string) => void;
	pdfFileName: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
	messages,
	currentPage,
	isLoading,
	onSendMessage,
}) => {
	const [inputMessage, setInputMessage] = useState<string>("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputMessage.trim() && !isLoading) {
			onSendMessage(inputMessage);
			setInputMessage("");
		}
	};

	return (
		<div className="backdrop-blur-xl bg-white rounded-3xl flex flex-col h-full border border-white">
			{/* Header */}
		

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
				{messages.length === 0 ? (
					<div className="text-center text-gray-400 mt-8">
						<p>Start asking questions about your PDF...</p>
					</div>
				) : (
					messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] p-3 rounded-2xl shadow-md backdrop-blur-sm border border-white/40 text-gray-900 ${
									message.role === "user"
										? "bg-gradient-to-br from-blue-100/60 via-white/60 to-purple-100/60"
										: "bg-gradient-to-br from-cyan-50/80 via-white/80 to-indigo-50/80"
								}`}
							>
								<p className="text-sm">{message.content}</p>
							</div>
						</div>
					))
				)}

				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-gradient-to-br from-cyan-50/80 via-white/80 to-indigo-50/80 p-3 rounded-2xl shadow-md border border-white/40">
							<div className="flex items-center space-x-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
								<span className="text-sm text-gray-500">
									Thinking...
								</span>
							</div>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="p-4 border-t bg-white/60 rounded-b-3xl  backdrop-blur-sm">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<input
						type="text"
						value={inputMessage}
						onChange={(e) => setInputMessage(e.target.value)}
						placeholder={`Ask about page ${currentPage}...`}
						disabled={isLoading}
						className="flex-1 px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-white/40 bg-white/80 backdrop-blur-sm border-white/40 text-gray-900 placeholder-gray-400"
					/>
					<button
						type="submit"
						disabled={isLoading || !inputMessage.trim()}
						className="px-4 py-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-2xl shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:bg-gray-300"
					>
						  <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
					</button>
				</form>
			</div>
		</div>
	);
};

export default ChatInterface;
