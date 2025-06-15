"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { Input } from "@/components/Input";
import PDFViewer from "@/components/PDFViwer";
import ChatInterface from "@/components/ChatInterface";

interface ChatMessage {
	id: string;
	content: string;
	pageNumber: number;
	isUser: boolean;
	role: 'user' | 'assistant';
}

interface BackendChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export default function Home() {
	const [pdfFile, setPdfFile] = useState<File | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(0);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isPdfParsing, setIsPdfParsing] = useState<boolean>(false);
	const [documentId, setDocumentId] = useState<string | null>(null); // Store document ID from parsing

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (file && file.type === "application/pdf") {
			setPdfFile(file);
			const url = URL.createObjectURL(file);
			setPdfUrl(url);

			// Reset state when new file is uploaded
			setCurrentPage(1);
			setTotalPages(0);
			setChatMessages([]);
			setDocumentId(null);

			// Parse PDF immediately after upload
			await parsePDF(file);
		}
	};

	const parsePDF = async (file: File) => {
		setIsPdfParsing(true);
		
		try {
			const formData = new FormData();
			formData.append('file', file);

			const parseResponse = await fetch('/api/parse_pdf', {
				method: 'POST',
				body: formData,
			});

			if (!parseResponse.ok) {
				throw new Error('Failed to parse PDF');
			}

			const parseData = await parseResponse.json();
			
			// Store the document ID for future queries
			if (parseData.document_id) {
				setDocumentId(parseData.document_id);
			}

			console.log('PDF parsed successfully:', parseData);
			
			// You can also set total pages here if returned from backend
			if (parseData.total_pages) {
				setTotalPages(parseData.total_pages);
			}

		} catch (error) {
			console.error('Error parsing PDF:', error);
			// Handle error - maybe show a toast notification
			alert('Failed to parse PDF. Please try again.');
			
			// Reset state on parse failure
			setPdfFile(null);
			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
			}
			setPdfUrl(null);
		} finally {
			setIsPdfParsing(false);
		}
	};

	const handleRemovePDF = () => {
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
		}
		setPdfFile(null);
		setPdfUrl(null);
		setCurrentPage(1);
		setTotalPages(0);
		setChatMessages([]);
		setDocumentId(null);
	};

	const handlePageChange = useCallback((pageNumber: number) => {
		setCurrentPage(pageNumber);
	}, []);

	const handleTotalPagesChange = useCallback((total: number) => {
		setTotalPages(total);
	}, []);

	// Convert frontend chat messages to backend format
	const formatChatHistoryForBackend = (messages: ChatMessage[]): BackendChatMessage[] => {
		return messages.map(msg => ({
			role: msg.role,
			content: msg.content
		}));
	};

	const handleSendMessage = async (message: string) => {
		if (!message.trim() || !pdfFile || !documentId) {
			console.error('Missing required data for sending message');
			return;
		}

		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			content: message,
			pageNumber: currentPage,
			isUser: true,
			role: 'user'
		};

		setChatMessages(prev => [...prev, userMessage]);
		setIsLoading(true);

		try {
			const requestBody = {
				query: message,
				page_num: currentPage - 1, // Convert to 0-based indexing for backend
				chat_history: formatChatHistoryForBackend([...chatMessages, userMessage])
			};

			// Since PDF is already parsed, just query for response
			const response = await fetch('/api/query_response', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error('Failed to get response');
			}

			const data = await response.json();

			// Add bot response
			const botMessage: ChatMessage = {
				id: `bot-${Date.now()}`,
				content: data.response || data,
				pageNumber: currentPage,
				isUser: false,
				role: 'assistant',
			};

			setChatMessages(prev => [...prev, botMessage]);

		} catch (error) {
			console.error("Error sending message:", error);
			
			// Add error message to chat
			const errorMessage: ChatMessage = {
				id: `error-${Date.now()}`,
				content: 'Sorry, something went wrong. Please try again.',
				pageNumber: currentPage,
				isUser: false,
				role: 'assistant',
			};
			setChatMessages(prev => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	// Show loading state while PDF is being parsed
	if (isPdfParsing) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Processing PDF...
					</h2>
					<p className="text-gray-600">
						Please wait while we analyze your document
					</p>
				</div>
			</div>
		);
	}

	if (!pdfFile || !pdfUrl) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="mb-8">
						<h1 className="text-2xl font-semibold text-gray-900 mb-2">
							AskMyDoc
						</h1>
						<p className="text-gray-600 mb-8">
							Upload a PDF to start chatting about its content
						</p>
					</div>

					<label htmlFor="pdf-upload">
						<Input
							id="pdf-upload"
							type="file"
							accept=".pdf"
							onChange={handleFileUpload}
						/>
					</label>
				</div>
			</div>
		);
	}

	// Don't render the main interface until document is parsed
	if (!documentId) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Preparing Document...
					</h2>
					<p className="text-gray-600">
						Setting up your PDF for interaction
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto p-4">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">
							AskMyDoc - {pdfFile.name}
						</h1>
						<p className="text-sm text-gray-600">
							Page {currentPage} of {totalPages}
						</p>
						{documentId && (
							<p className="text-xs text-gray-500">
								Document ID: {documentId.substring(0, 8)}...
							</p>
						)}
					</div>
					<button
						onClick={handleRemovePDF}
						className="px-5 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
					>
						Remove PDF
					</button>
				</div>

				<div className="flex gap-4 h-[calc(100vh-140px)]">
					{/* PDF Viewer - 70% width */}
					<div className="w-[70%]">
						<PDFViewer
							fileUrl={pdfUrl}
							onPageChange={handlePageChange}
							onTotalPagesChange={handleTotalPagesChange}
						/>
					</div>

					{/* Chat Section - 30% width */}
					<div className="w-[30%]">
						<ChatInterface
							messages={chatMessages}
							currentPage={currentPage}
							totalPages={totalPages}
							isLoading={isLoading}
							onSendMessage={handleSendMessage}
							pdfFileName={pdfFile.name}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
