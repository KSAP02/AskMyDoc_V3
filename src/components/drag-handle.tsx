"use client"

import type React from "react"

import { useRef, useCallback, useEffect } from "react"

interface DragHandleProps {
  onDrag: (newWidth: number) => void
  onDoubleClick: () => void
  sidebarWidth: number
}

const DragHandle = ({ onDrag, onDoubleClick, sidebarWidth }: DragHandleProps) => {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = sidebarWidth

      // Capture pointer to handle movement outside the element
      ;(e.target as Element).setPointerCapture(e.pointerId)

      // Prevent text selection during drag
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    },
    [sidebarWidth],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - startX.current
      const containerWidth = window.innerWidth - 48 // Account for padding
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = startWidth.current - deltaPercent // Subtract because we're dragging from right

      onDrag(newWidth)
    },
    [onDrag],
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    document.body.style.userSelect = ""
    document.body.style.cursor = ""
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        onDrag(Math.max(20, sidebarWidth - 5))
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        onDrag(Math.min(80, sidebarWidth + 5))
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onDoubleClick()
      }
    },
    [onDrag, onDoubleClick, sidebarWidth],
  )

  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  return (
    <div
      className="group flex items-center justify-center cursor-col-resize select-none transition-all duration-150 relative"
      style={{
        width: "4px",
        backgroundColor: "#D9D9D9",
        minHeight: "100%",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={sidebarWidth}
      aria-valuemin={20}
      aria-valuemax={80}
      aria-label="Resize sidebar"
      title="Drag to resize sidebar, double-click to collapse"
    >
      <div
        className="w-full h-full group-hover:w-2 transition-all duration-150 rounded-full"
        style={{ backgroundColor: "#D9D9D9" }}
      />

      {/* Focus indicator */}
      <div
        className="absolute inset-0 rounded-sm opacity-0 focus-within:opacity-100 transition-opacity"
        style={{
          backgroundColor: "rgba(74, 124, 42, 0.2)",
          outline: "2px solid #4A7C2A",
          outlineOffset: "2px",
        }}
      />
    </div>
  )
}

export default DragHandle
