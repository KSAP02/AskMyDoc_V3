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
	onPageChange: (pageNumber: number) => void;
	totalPages: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
	messages,
	currentPage,
	isLoading,
	onSendMessage,
	onPageChange,
	totalPages
}) => {
	const [inputMessage, setInputMessage] = useState<string>("");
	const [pageSelected, setPageSelected] = useState<boolean>(currentPage > 0);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Update pageSelected state when currentPage changes
	useEffect(() => {
		setPageSelected(currentPage > 0);
	}, [currentPage]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputMessage.trim() && !isLoading && pageSelected) {
			onSendMessage(inputMessage);
			setInputMessage("");
			
			// Focus back on input after sending
			setTimeout(() => {
				inputRef.current?.focus();
			}, 0);
		}
	};

	const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const pageNumber = parseInt(e.target.value);
		onPageChange(pageNumber);
		setPageSelected(true);
	};
	
	// Handle input resize
	const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		setInputMessage(textarea.value);
		
		// Reset height to auto to get the right scrollHeight
		textarea.style.height = 'auto';
		
		// Set new height based on scrollHeight (with max height limit)
		const newHeight = Math.min(textarea.scrollHeight, 120);
		textarea.style.height = `${newHeight}px`;
	};
	
	// Handle keyboard shortcuts
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Submit on Enter without Shift key
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<div className="backdrop-blur-xl bg-white rounded-3xl flex flex-col h-full border border-white">
			{/* Header with page selector */}
			<div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
				<div className="flex items-center justify-between">
					<div className="text-sm font-medium text-gray-700 truncate">
						First, enter the page number
					</div>
					<div className="flex items-center">
						<label htmlFor="page-select" className="text-sm text-gray-600 mr-2">
						</label>
						<select
							id="page-select"
							value={currentPage || ""}
							onChange={handlePageSelect}
							disabled={isLoading || totalPages <= 0}
							className="px-3 py-1 text-sm border rounded-lg bg-white shadow-sm border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
						>
							<option value="" disabled>
								Select
							</option>
							{Array.from(
								{ length: totalPages },
								(_, i) => i + 1
							).map((page) => (
								<option key={page} value={page}>
									{page}
								</option>
							))}
						</select>
					</div>
				</div>
				
				{!pageSelected && (
					<div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2 shadow-inner">
						Please select a page to start your conversation
					</div>
				)}
			</div>

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
			<div className="p-4 border-t bg-white/60 rounded-b-3xl backdrop-blur-sm">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<div className="relative flex-1">
						<textarea
							ref={inputRef}
							value={inputMessage}
							onChange={handleTextareaInput}
							onKeyDown={handleKeyDown}
							placeholder={pageSelected ? `You are asking about page ${currentPage}...` : "Select a page first to ask questions..."}
							disabled={isLoading || !pageSelected}
							rows={1}
							className="w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-white/40 bg-white/80 backdrop-blur-sm border-white/40 text-gray-900 placeholder-gray-400 resize-none overflow-auto"
							style={{ minHeight: "44px", maxHeight: "120px" }}
						/>
					</div>
					
					<button
						type="submit"
						disabled={isLoading || !inputMessage.trim() || !pageSelected}
						className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-2xl shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 self-end"
					>
						<svg
							className="w-5 h-5"
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
