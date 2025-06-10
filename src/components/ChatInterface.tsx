"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/button"
import { Input } from "@/components/Input"
//import { ScrollArea } from "@/components/Scroll-area"
import { Send, MessageCircle } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  pageNumber?: number
}

interface ChatInterfaceProps {
  currentPage: number
  pdfFileName: string
}

export default function ChatInterface({ currentPage, pdfFileName }: ChatInterfaceProps) {

  return (
    <div>
    </div>
  )
}

