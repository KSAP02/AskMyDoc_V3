"use client";

import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

// Import styles
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";

interface PDFViewerProps {
	fileUrl: string;
	onPageChange?: (pageNumber: number) => void;
	onTotalPagesChange?: (totalPages: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
	fileUrl,
	onPageChange,
	onTotalPagesChange,
}) => {
	const pageNavigationPluginInstance = pageNavigationPlugin();
	const { jumpToPage } = pageNavigationPluginInstance;

	// Create new plugin instance
	const defaultLayoutPluginInstance = defaultLayoutPlugin();

	const handleDocumentLoad = (e: any) => {
		onTotalPagesChange(e.doc.numPages);
	};

	const handlePageChange = (e: any) => {
		const pageNumber = e.currentPage + 1;
		onPageChange(pageNumber);
	};

	return (
		<div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
			<Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
				<div className="h-[calc(100%-40px)]">
					<Viewer
						fileUrl={fileUrl}
						plugins={[
							defaultLayoutPluginInstance,
							pageNavigationPluginInstance,
						]}
						onDocumentLoad={handleDocumentLoad}
						onPageChange={handlePageChange}
					/>
				</div>
			</Worker>
		</div>
	);
};

export default PDFViewer;
