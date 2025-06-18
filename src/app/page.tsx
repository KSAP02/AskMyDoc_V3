"use client";

import type React from "react";
import { useCallback, useState, useRef } from "react";
import PDFViewer from "@/components/PDFViwer";
import ChatInterface from "@/components/ChatInterface";
import DragHandle from "@/components/drag-handle";
import {Button } from "@/components/button"

import { Card, CardContent } from "@/components/card";
import {
	Upload,
	FileText,
	Trash2,
	PanelRightClose,
	PanelRightOpen,
} from "lucide-react";

interface ChatMessage {
	id: string;
	content: string;
	pageNumber: number;
	role: "user" | "assistant";
}

interface BackendChatMessage {
	role: "user" | "assistant";
	content: string;
}

export default function Home() {
	const [pdfFile, setPdfFile] = useState<File | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isPdfParsing, setIsPdfParsing] = useState<boolean>(false);
	const [sidebarWidth, setSidebarWidth] = useState(30); // Percentage
	const [isCollapsed, setIsCollapsed] = useState(false);
	  const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];

		if (!file || file.type !== "application/pdf") {
			alert("Please select a valid PDF file");
			return;
		}

		setPdfFile(file);
		const url = URL.createObjectURL(file);
		setPdfUrl(url);

		// Reset state when new file is uploaded
		setCurrentPage(1);
		setChatMessages([]);

		// Parse PDF immediately after upload
		await parsePDF(file);
	};

	const parsePDF = async (file: File) => {
		setIsPdfParsing(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const parseResponse = await fetch("/api/parse_pdf", {
				method: "POST",
				body: formData,
			});

			if (!parseResponse.ok) {
				throw new Error("Failed to parse PDF");
			}

			const parseData = await parseResponse.json();

			console.log("PDF parsed successfully:", parseData);

		} catch (error) {
			console.error("Error parsing PDF:", error);
			// Handle error - maybe show a toast notification
			alert("Failed to parse PDF. Please try again.");

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
		setChatMessages([]);
	};

	const handlePageChange = useCallback((pageNumber: number) => {
		setCurrentPage(pageNumber);
	}, []);


	const handleDrag = (newWidth: number) => {
		setSidebarWidth(Math.max(20, Math.min(80, newWidth)));
	};

	const toggleCollapse = () => {
		setIsCollapsed(!isCollapsed);
	};

	const handleDoubleClick = () => {
		setIsCollapsed(!isCollapsed);
	};

	// Convert frontend chat messages to backend format
	const formatChatHistoryForBackend = (
		messages: ChatMessage[]
	): BackendChatMessage[] => {
		return messages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));
	};

	const handleSendMessage = async (message: string) => {
		if (!message.trim()) {
			console.error("Message is empty");
			return;
		}
		
		if (!pdfFile) {
			console.error("No PDF file loaded");
			return;
		}
		

		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			content: message,
			pageNumber: currentPage,
			role: "user",
		};

		setChatMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);

		try {
			const requestBody = {
				query: message,
				page_num: currentPage,
				chat_history: formatChatHistoryForBackend([
					...chatMessages,
					userMessage,
				]),
			};

			// Since PDF is already parsed, just query for response
			const response = await fetch("/api/query_response", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error("Failed to get response");
			}

			const data = await response.json();
			console.log(data)


			// Add bot response
			const botMessage: ChatMessage = {
				id: `bot-${Date.now()}`,
				content: JSON.parse(data.response) || "No response received",
				pageNumber: currentPage,
				role: "assistant",
			};

			setChatMessages((prev) => [...prev, botMessage]);
		} catch (error) {
			console.error("Error sending message:", error);

			// Add error message to chat
			const errorMessage: ChatMessage = {
				id: `error-${Date.now()}`,
				content: "Sorry, something went wrong. Please try again.",
				pageNumber: currentPage,
				role: "assistant",
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	// Show loading state while PDF is being parsed
	if (isPdfParsing) {
		return (
			<div
				className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50"
			>
				<Card
					className="w-96"
					style={{
						backgroundColor: "#FFFFFF",
						boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
					}}
				>
					<CardContent className="flex flex-col items-center p-8">
						<div className="animate-spin rounded-full h-12 w-12 border-2 border-[#4A7C2A] border-t-transparent mb-4"></div>
						<h2
							className="text-xl font-semibold mb-2 font-ui"
							style={{ color: "#2F2F2F" }}
						>
							Processing PDF...
						</h2>
						<p
							className="text-center font-body"
							style={{ color: "#2F2F2F" }}
						>
							Please wait while we analyze your document
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!pdfFile || !pdfUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
        {/* Aurora Gradient Floating Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        <div className="relative z-10 container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <h2
                className="text-4xl font-bold mb-4 font-body bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent"
                style={{ lineHeight: "1.5" }}
              >
                Chat with Your PDF Documents
              </h2>
              <p
                className="text-xl mb-8 font-body text-gray-600"
                style={{ lineHeight: "1.5" }}
              >
                Upload a PDF and start asking questions about its content. Get instant answers powered by AI.
              </p>
            </div>
            <Card
              className="frosted-glass"
              style={{
                background: "rgba(255,255,255,0.3)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: 24,
              }}
            >
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div
                    className="p-4 rounded-full bg-gradient-to-br from-purple-100 via-white to-pink-100 shadow-lg"
                  >
                    <Upload className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <h3
                      className="text-lg font-semibold mb-2 font-ui text-gray-900"
                    >
                      Upload your PDF
                    </h3>
                    <p
                      className="mb-4 font-body text-gray-600"
                    >
                      Select a PDF file to begin
                    </p>
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        style={{ display: "none" }} // Hide default input
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center rounded-full px-6 py-2 text-sm font-medium font-ui transition-all bg-gradient-to-r from-purple-400 to-blue-400 text-white shadow-lg border-0"
                        style={{}}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.opacity = "0.9")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload PDF
                      </Button>
                    </div>
                  </div>
                </div>
                <div
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-ui text-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400/40 to-pink-400/40"></div>
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400/40 to-cyan-400/40"></div>
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30"></div>
                    <span>Instant Results</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }



  const pdfWidth = isCollapsed ? 100 : 100 - sidebarWidth
  const chatWidth = isCollapsed ? 0 : sidebarWidth


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <div className="border-b" style={{ borderColor: "#D2B48C", background: "rgba(255,255,255,0.3)" }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" style={{ color: "#A0522D" }} />
                <h1 className="text-xl font-semibold font-ui" style={{ color: "#333333" }}>
                  AskMyDoc
                </h1>
              </div>
         
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="rounded-full"
                style={{ color: "#A0522D" }}
                aria-label={isCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                {isCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemovePDF}
                className="flex items-center space-x-2 font-ui"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)", color: "#fff", border: 0 }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="h-[calc(100vh-80px)] flex" style={{ padding: "24px" }}>
        {/* PDF Viewer */}
        <div
          className="transition-all duration-200 ease-in-out"
          style={{
            width: `${pdfWidth}%`,
            paddingRight: isCollapsed ? "0" : "10px",
          }}
        >
						<PDFViewer
							fileUrl={pdfUrl}
							onPageChange={handlePageChange}
						/>
        </div>

        {/* Drag Handle */}
        {!isCollapsed && (
          <DragHandle onDrag={handleDrag} onDoubleClick={handleDoubleClick} sidebarWidth={sidebarWidth} />
        )}

        {/* Chat Sidebar */}
        <div
          className="transition-all duration-200 ease-in-out overflow-hidden"
          style={{
            width: `${chatWidth}%`,
            paddingLeft: isCollapsed ? "0" : "12px",
          }}
        >
          {!isCollapsed && (
						<ChatInterface
							messages={chatMessages}
							currentPage={currentPage}
							isLoading={isLoading}
							onSendMessage={handleSendMessage}
							pdfFileName={pdfFile.name}
						/>
          )}
        </div>
      </div>
    </div>
  )

}
