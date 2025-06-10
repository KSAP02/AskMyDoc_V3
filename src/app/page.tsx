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
}

export default function Home() {
	const [pdfFile, setPdfFile] = useState<File | null>(null);
	const [pdfUrl, setPdfUrl] = useState<null | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(0);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(0);

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (file && file.type === "application/pdf") {
			setPdfFile(file);
			const url = URL.createObjectURL(file);
			setPdfUrl(url);

			//Reset state when file is opened
			setCurrentPage(1);
			setTotalPages(0);
			setChatMessages([]);
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
	};

	const handlePageChange = useCallback((pageNumber: number) => {
		setCurrentPage(pageNumber);
	}, []);

	const handleTotalPagesChange = useCallback((total: number) => {
		setTotalPages(total);
	}, []);

	const handleSendMessage = (message: string) => {
		setIsLoading(true);

		// Add user's message
		const userMessage = {
			id: crypto.randomUUID(),
			content: message,
			pageNumber: currentPage,
			isUser: true,
		};

		// Simulate a response message
		const botMessage = {
			id: crypto.randomUUID(),
			content: `You said: "${message}"`, 
			pageNumber: currentPage,
			isUser: false,
		};

		// Add both to messages with a slight delay to mimic response
		setChatMessages((prev) => [...prev, userMessage]);

		setTimeout(() => {
			setChatMessages((prev) => [...prev, botMessage]);
			setIsLoading(false); // ✅ turn off loading
		}, 1000); // 1s delay for realism
	};

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

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto p-4">
				<div className="mb-4 flex items-center justify-between">
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
