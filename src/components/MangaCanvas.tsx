import React, { useRef, useState, useEffect } from "react";
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  MousePointer, 
  Crop, 
  Sparkles,
  HelpCircle,
  HelpCircle as QuestionIcon,
  ChevronsUpDown,
  BookOpen
} from "lucide-react";
import { TranslationZone, EditorMode } from "../types";
import { generateId } from "../utils";

interface MangaCanvasProps {
  image: string | null;
  onImageLoaded: (width: number, height: number) => void;
  zones: TranslationZone[];
  setZones: React.Dispatch<React.SetStateAction<TranslationZone[]>>;
  selectedZoneId: string | null;
  setSelectedZoneId: (id: string | null) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  isTranslating: boolean;
  ocrStep?: string;
  targetLang: string;
  translationStyle: string;
  userApiKey: string;
  hoveredZoneId: string | null;
}

export const MangaCanvas: React.FC<MangaCanvasProps> = ({
  image,
  onImageLoaded,
  zones,
  setZones,
  selectedZoneId,
  setSelectedZoneId,
  editorMode,
  setEditorMode,
  isTranslating,
  ocrStep = "",
  targetLang,
  translationStyle,
  userApiKey,
  hoveredZoneId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Move / Resize tracking state
  const [dragState, setDragState] = useState<{
    type: "none" | "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";
    zoneId: string;
    startMouseX: number;
    startMouseY: number;
    startZoneXmin: number;
    startZoneYmin: number;
    startZoneXmax: number;
    startZoneYmax: number;
  }>({
    type: "none",
    zoneId: "",
    startMouseX: 0,
    startMouseY: 0,
    startZoneXmin: 0,
    startZoneYmin: 0,
    startZoneXmax: 0,
    startZoneYmax: 0,
  });

  // Keep track of dimensions
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    onImageLoaded(naturalWidth, naturalHeight);

    // Dynamic initial scale to fit container nicely
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth - 48;
      const initialScale = Math.min(1.0, containerW / naturalWidth);
      setScale(initialScale || 1.0);
    }
  };

  // Fits image to parent workbench width
  const handleZoomFit = () => {
    if (containerRef.current && imageSize.width > 0) {
      const parentW = containerRef.current.clientWidth - 48;
      const fitScale = parentW / imageSize.width;
      setScale(fitScale);
    }
  };

  // Convert client cursor coords into overlay-relative coords (0-1000)
  const getCoordinatesFromEvent = (e: React.MouseEvent) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    return {
      x: Math.max(0, Math.min(1000, x)),
      y: Math.max(0, Math.min(1000, y)),
    };
  };

  // --- Drawing / Manual Cropping handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (editorMode === "pan") return;

    // Check if clicking cursor resize handle or bubble body to avoid drawing overlapping boxes
    const target = e.target as HTMLElement;
    if (target.closest(".bubble-wrapper") || target.closest(".resize-handle")) {
      return;
    }

    if (editorMode === "draw") {
      setIsDrawing(true);
      const coords = getCoordinatesFromEvent(e);
      setStartPos(coords);
      setCurrentPos(coords);
      setSelectedZoneId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && editorMode === "draw") {
      const coords = getCoordinatesFromEvent(e);
      setCurrentPos(coords);
    } else if (dragState.type !== "none") {
      // Handle drag moving and corner resizing
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const currentMouseX = ((e.clientX - rect.left) / rect.width) * 1000;
      const currentMouseY = ((e.clientY - rect.top) / rect.height) * 1000;

      const deltaX = currentMouseX - dragState.startMouseX;
      const deltaY = currentMouseY - dragState.startMouseY;

      setZones((prevZones) =>
        prevZones.map((z) => {
          if (z.id !== dragState.zoneId) return z;

          let { ymin, xmin, ymax, xmax } = z;

          if (dragState.type === "move") {
            const width = dragState.startZoneXmax - dragState.startZoneXmin;
            const height = dragState.startZoneYmax - dragState.startZoneYmin;

            xmin = Math.max(0, Math.min(1000 - width, dragState.startZoneXmin + deltaX));
            ymin = Math.max(0, Math.min(1000 - height, dragState.startZoneYmin + deltaY));
            xmax = xmin + width;
            ymax = ymin + height;
          } else if (dragState.type === "resize-tl") {
            xmin = Math.max(0, Math.min(z.xmax - 30, dragState.startZoneXmin + deltaX));
            ymin = Math.max(0, Math.min(z.ymax - 30, dragState.startZoneYmin + deltaY));
          } else if (dragState.type === "resize-tr") {
            xmax = Math.max(z.xmin + 30, Math.min(1000, dragState.startZoneXmax + deltaX));
            ymin = Math.max(0, Math.min(z.ymax - 30, dragState.startZoneYmin + deltaY));
          } else if (dragState.type === "resize-bl") {
            xmin = Math.max(0, Math.min(z.xmax - 30, dragState.startZoneXmin + deltaX));
            ymax = Math.max(z.ymin + 30, Math.min(1000, dragState.startZoneYmax + deltaY));
          } else if (dragState.type === "resize-br") {
            xmax = Math.max(z.xmin + 30, Math.min(1000, dragState.startZoneXmax + deltaX));
            ymax = Math.max(z.ymin + 30, Math.min(1000, dragState.startZoneYmax + deltaY));
          }

          return { ...z, ymin, xmin, ymax, xmax };
        })
      );
    }
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (isDrawing && editorMode === "draw") {
      setIsDrawing(false);
      const coords = getCoordinatesFromEvent(e);

      // Clean sorting calculations
      const xmin = Math.round(Math.min(startPos.x, coords.x));
      const xmax = Math.round(Math.max(startPos.x, coords.x));
      const ymin = Math.round(Math.min(startPos.y, coords.y));
      const ymax = Math.round(Math.max(startPos.y, coords.y));

      const w = xmax - xmin;
      const h = ymax - ymin;

      // Ensure minimum draw rectangle drag width/height (ignores single accidental clicks)
      if (w > 12 && h > 12) {
        const newId = generateId();
        const newZone: TranslationZone = {
          id: newId,
          ymin,
          xmin,
          ymax,
          xmax,
          originalText: "",
          translatedText: "",
          fontSize: Math.max(12, Math.min(32, Math.round(h * 0.16))),
          fontColor: "#000000",
          backgroundColor: "#ffffff",
          borderRadius: 24, // Speech bubble circular roundness
          borderWidth: 0,
          borderColor: "#000000",
          textAlign: "center",
          verticalAlign: "center",
          bold: true,
          italic: false,
          padding: 4,
          rotation: 0,
          opacity: 100
        };

        setZones((prev) => [...prev, newZone]);
        setSelectedZoneId(newId);
        setEditorMode("select"); // Return easily to select view mode

        // Trigger automatic instant crop & translation for this single region!
        performSingleZoneOCR(newZone);
      }
    } else if (dragState.type !== "none") {
      setDragState((prev) => ({ ...prev, type: "none" }));
    }
  };

  // Perform a single bubble translation crop request on the fly!
  const performSingleZoneOCR = async (zone: TranslationZone) => {
    if (!image) return;

    try {
      // Create a temporary hidden canvas element to extract the exact rectangle portion
      const tempImg = new Image();
      tempImg.src = image;
      tempImg.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate absolute source positions
        const sx = (zone.xmin / 1000) * tempImg.naturalWidth;
        const sy = (zone.ymin / 1000) * tempImg.naturalHeight;
        const sw = ((zone.xmax - zone.xmin) / 1000) * tempImg.naturalWidth;
        const sh = ((zone.ymax - zone.ymin) / 1000) * tempImg.naturalHeight;

        canvas.width = sw;
        canvas.height = sh;

        // Crop the single bubble region
        ctx.drawImage(tempImg, sx, sy, sw, sh, 0, 0, sw, sh);
        const croppedBase64 = canvas.toDataURL("image/jpeg");

        // UI Feedback - set temp text during loading
        setZones((prev) =>
          prev.map((z) => (z.id === zone.id ? { ...z, translatedText: "...", originalText: "..." } : z))
        );

        const response = await fetch("/api/translate-zone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: croppedBase64,
            sourceLang: "Auto",
            targetLang,
            translationStyle,
            userApiKey
          })
        });

        const data = await response.json();
        if (data.originalText || data.translatedText) {
          setZones((prev) =>
            prev.map((z) =>
              z.id === zone.id
                ? {
                    ...z,
                    originalText: data.originalText || "",
                    translatedText: data.translatedText || "Dịch thất bại..."
                  }
                : z
            )
          );
        }
      };
    } catch (err) {
      console.error("Zone crop error:", err);
    }
  };

  // Initialize move or resize tracking coordinates on mouse click
  const initiateDrag = (
    e: React.MouseEvent,
    zone: TranslationZone,
    type: typeof dragState.type
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (editorMode === "pan") return;

    setSelectedZoneId(zone.id);

    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const currentMouseX = ((e.clientX - rect.left) / rect.width) * 1000;
    const currentMouseY = ((e.clientY - rect.top) / rect.height) * 1000;

    setDragState({
      type,
      zoneId: zone.id,
      startMouseX: currentMouseX,
      startMouseY: currentMouseY,
      startZoneXmin: zone.xmin,
      startZoneYmin: zone.ymin,
      startZoneXmax: zone.xmax,
      startZoneYmax: zone.ymax,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden select-none">
      {/* Canvas Toolbars */}
      <div className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-10 shadow-xs">
        {/* Editing Modes */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setEditorMode("select")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
              editorMode === "select"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Chọn & Di chuyển các ô thoại"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Chọn / Move</span>
          </button>
          
          <button
            disabled={!image}
            onClick={() => setEditorMode("draw")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
              !image
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : editorMode === "draw"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Vẽ vùng khoanh tròn hoặc chữ nhật"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Vẽ Vùng Cắt</span>
          </button>
        </div>

        {/* Status Indicators */}
        {isTranslating && (
          <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            <span>Đang xử lý AI OCR...</span>
          </div>
        )}

        {/* Zoom Controls */}
        {image && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setScale(Math.max(0.1, scale - 0.1))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 transition cursor-pointer shadow-xs"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(3.0, scale + 0.1))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 transition cursor-pointer shadow-xs"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomFit}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 transition cursor-pointer shadow-xs"
              title="Vừa khít màn hình"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 transition cursor-pointer shadow-xs"
              title="Đặt lại mức thu phóng"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Workspace Frame */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-100/60 cursor-grab active:cursor-grabbing scrollbar-thin"
      >
        {image ? (
          <div
            className={`relative border border-slate-200/80 bg-white shadow-xl transition-all h-auto origin-top-left`}
            style={{
              width: `${imageSize.width * scale}px`,
              height: `${imageSize.height * scale}px`,
            }}
          >
            {/* Manga Background Image */}
            <img
              ref={imageRef}
              src={image}
              alt="Manga translator workspace"
              onLoad={handleImageLoad}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Interactive Draw & Translate Overlays (100% size of relative canvas) */}
            <div
              ref={overlayRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`absolute top-0 left-0 w-full h-full select-none ${
                editorMode === "draw" ? "cursor-crosshair" : "cursor-default"
              }`}
            >
              {/* Render Preview of drawn rectangle */}
              {isDrawing && editorMode === "draw" && (
                <div
                  className="absolute border border-indigo-500 bg-indigo-500/15 z-30"
                  style={{
                    left: `${(Math.min(startPos.x, currentPos.x) / 1000) * 100}%`,
                    top: `${(Math.min(startPos.y, currentPos.y) / 1000) * 100}%`,
                    width: `${(Math.abs(startPos.x - currentPos.x) / 1000) * 100}%`,
                    height: `${(Math.abs(startPos.y - currentPos.y) / 1000) * 100}%`,
                  }}
                />
              )}

              {/* Render Speech Bubble Zones */}
              {zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const isHovered = hoveredZoneId === zone.id;
                
                // Calculate display coordinates in percentages
                const left = `${zone.xmin / 10}%`;
                const top = `${zone.ymin / 10}%`;
                const width = `${(zone.xmax - zone.xmin) / 10}%`;
                const height = `${(zone.ymax - zone.ymin) / 10}%`;

                // Calculate CSS proportional scaling for fonts inside this box
                const fontScale = (imageSize.width * scale) / imageSize.width;
                const displayFontSize = Math.max(7, zone.fontSize * 1.0); 

                return (
                  <div
                    key={zone.id}
                    className={`bubble-wrapper absolute z-20 select-none ${
                      isSelected ? "ring-2 ring-indigo-600 ring-offset-1 ring-offset-white border-none" : ""
                    }`}
                    style={{
                      left,
                      top,
                      width,
                      height,
                    }}
                  >
                    {/* Visual Mask covering the original text & Background border styling */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedZoneId(zone.id);
                      }}
                      onMouseDown={(e) => initiateDrag(e, zone, "move")}
                      className={`w-full h-full relative cursor-move flex select-none no-select transition-shadow ${
                        isHovered ? "shadow-[0_0_12px_rgba(99,102,241,0.55)] bg-indigo-50/5" : ""
                      }`}
                      style={{
                        backgroundColor: zone.backgroundColor,
                        borderRadius: `${zone.borderRadius}px`,
                        borderWidth: `${zone.borderWidth}px`,
                        borderColor: zone.borderColor,
                        opacity: zone.opacity / 100,
                        transform: `rotate(${zone.rotation}deg)`,
                        padding: `${zone.padding}px`,
                        alignItems: zone.verticalAlign === "top" ? "flex-start" : zone.verticalAlign === "bottom" ? "flex-end" : "center",
                        justifyContent: zone.textAlign === "left" ? "flex-start" : zone.textAlign === "right" ? "flex-end" : "center",
                      }}
                    >
                      {/* Text Inside bubble */}
                      <span
                        className={`leading-[1.2] tracking-tight selection:bg-indigo-100 break-words select-none w-full ${
                          zone.bold ? "font-bold" : ""
                        } ${zone.italic ? "italic" : ""}`}
                        style={{
                          color: zone.fontColor,
                          fontSize: `${displayFontSize}px`,
                          textAlign: zone.textAlign,
                          fontFamily: zone.fontSize > 35 
                            ? 'Bangers, var(--font-comic), sans-serif'
                            : zone.italic && !zone.bold 
                            ? "Architects Daughter, var(--font-comic), sans-serif"
                            : "Comic Neue, cursive, sans-serif"
                        }}
                      >
                        {zone.translatedText || zone.originalText || (
                          <span className="text-slate-400 opacity-40 italic text-[10px]">Vẽ lề...</span>
                        )}
                      </span>
                    </div>

                    {/* Corner resize drag handles shown ONLY on active bubble */}
                    {isSelected && editorMode !== "pan" && (
                      <>
                        <div
                          onMouseDown={(e) => initiateDrag(e, zone, "resize-tl")}
                          className="resize-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border border-indigo-600 bg-white shadow-md cursor-nwse-resize z-30 flex items-center justify-center hover:scale-110 active:scale-95 transition"
                        />
                        <div
                          onMouseDown={(e) => initiateDrag(e, zone, "resize-tr")}
                          className="resize-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-indigo-600 bg-white shadow-md cursor-nesw-resize z-30 flex items-center justify-center hover:scale-110 active:scale-95 transition"
                        />
                        <div
                          onMouseDown={(e) => initiateDrag(e, zone, "resize-bl")}
                          className="resize-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border border-indigo-600 bg-white shadow-md cursor-nesw-resize z-30 flex items-center justify-center hover:scale-110 active:scale-95 transition"
                        />
                        <div
                          onMouseDown={(e) => initiateDrag(e, zone, "resize-br")}
                          className="resize-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-indigo-600 bg-white shadow-md cursor-nwse-resize z-30 flex items-center justify-center hover:scale-110 active:scale-95 transition"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Beautiful Loading Overlay */}
            {isTranslating && (
              <div id="manga-canvas-loading-overlay" className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-40 flex flex-col items-center justify-center p-6 text-center select-none rounded-[inherit]">
                <div id="loading-card" className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full mx-4 transform transition-all flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-50/80 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
                    <Sparkles className="w-7 h-7 text-indigo-650 fill-indigo-100/40" />
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Đang Dịch Bằng AI</h3>
                  <p className="text-xs text-slate-500 mb-5 px-2 leading-relaxed">
                    Trình dịch thông minh đang phân tích bố cục, định vị và dịch các ô thoại trên trang truyện...
                  </p>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4 relative">
                    <div className="bg-indigo-650 h-full animate-pulse rounded-full" style={{ width: "80%" }} />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-700 bg-indigo-50 py-2 px-4 rounded-xl border border-indigo-100/55">
                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-650" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{ocrStep || "Đang xử lý phân tích..."}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Landing Screen / Missing Workspace screen */
          <div className="max-w-md w-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xl self-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-650 mb-6 shadow-xs">
              <BookOpen className="w-8 h-8" />
            </div>
            
            <h2 className="text-base font-bold text-slate-850 mb-2">Vùng Làm Việc Trống</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-sm">
              Tải lên bản quét manga (nhận diện được Tiếng Nhật, Hàn, Anh, Trung, v.v.). Hệ thống OCR bằng AI sẽ tự động khoanh vùng lời thoại và chèn bản dịch tiếng Việt mượt mà.
            </p>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => (document.querySelector("input[type=file]") as HTMLInputElement)?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-bold transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tải lên bản vẽ của bạn
              </button>
            </div>

            <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 animate-pulse" />
              <span>Dùng thử mô hình Gemini 2.5 Flash siêu nhanh</span>
            </div>
          </div>
        )}
      </div>

      {/* Guide Strip footer */}
      {image && (
        <div className="h-8 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[10px] text-slate-500 font-mono select-none leading-none">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Khu vực vẽ bóng đang hoạt động.</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-indigo-650 transition-colors">Canh kéo viền bằng nút TL/TR/BL/BR.</span>
            <span>Chế độ: {editorMode === "draw" ? "VẼ VIỀN (DRAW)" : "CHỌN / DI CHUYỂN (SELECT)"}</span>
          </div>
        </div>
      )}
    </div>
  );
};
