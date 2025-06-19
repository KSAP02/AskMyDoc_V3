"use client";

import React, { useEffect, useState } from "react";

interface PDFViewerProps {
  fileUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Convert blob URL to data URL if needed
  useEffect(() => {
    const handleBlobUrl = async () => {
      setIsLoading(true);
      
      if (fileUrl.startsWith('blob:')) {
        try {
          // Fetch the blob
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          
          // Convert to data URL
          const reader = new FileReader();
          reader.onload = () => {
            setResolvedUrl(reader.result as string);
            setIsLoading(false);
          };
          reader.onerror = () => {
            console.error("Error reading blob:", reader.error);
            setIsLoading(false);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Error fetching blob:", error);
          setIsLoading(false);
        }
      } else {
        // Not a blob URL, use as is
        setResolvedUrl(fileUrl);
        setIsLoading(false);
      }
    };
    
    handleBlobUrl();
  }, [fileUrl]);

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <iframe
          src={resolvedUrl}
          className="w-full h-full"
          title="PDF Viewer"
        />
      )}
    </div>
  );
};

export default PDFViewer;
