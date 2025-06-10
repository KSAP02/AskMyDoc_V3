"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";

interface ChatMessage {
	id: string;
	content: string;
	pageNumber: number;
	isUser: boolean;
}

interface ChatInterfaceProps {
	messages: ChatMessage[];
	currentPage: number;
	totalPages: number;
	isLoading: boolean;
	onSendMessage: (message: string) => void;
	pdfFileName: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
	messages,
	currentPage,
	isLoading,
	onSendMessage,
	pdfFileName,
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
		<div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b bg-gray-50 rounded-t-lg">
				<h2 className="text-lg font-semibold text-gray-900">
					Chat with Document
				</h2>
				<p className="text-sm text-gray-600 truncate">{pdfFileName}</p>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 ? (
					<div className="text-center text-gray-500 mt-8">
						<p>Start asking questions about your PDF...</p>
					</div>
				) : (
					messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] p-3 rounded-lg ${
									message.isUser
										? "bg-blue-500 text-white"
										: "bg-gray-100 text-gray-900"
								}`}
							>
								<p className="text-sm">{message.content}</p>
								<div className="flex items-center justify-between mt-2 text-xs opacity-70">
									<span>Page {message.pageNumber}</span>
								</div>
							</div>
						</div>
					))
				)}

				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-gray-100 p-3 rounded-lg">
							<div className="flex items-center space-x-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
								<span className="text-sm text-gray-600">
									Thinking...
								</span>
							</div>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="p-4 border-t bg-gray-50 rounded-b-lg">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<input
						type="text"
						value={inputMessage}
						onChange={(e) => setInputMessage(e.target.value)}
						placeholder={`Ask about page ${currentPage}...`}
						disabled={isLoading}
						className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
					/>
					<button
						type="submit"
						disabled={isLoading || !inputMessage.trim()}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
					>
						Send
					</button>
				</form>
			</div>
		</div>
	);
};

export default ChatInterface;
