import React, { useState } from "react";
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Trash2, 
  Type as TypeIcon, 
  Paintbrush, 
  RefreshCcw, 
  Copy,
  Sliders,
  ChevronsUpDown,
  Compass,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { TranslationZone } from "../types";

interface SidebarRightProps {
  selectedZone: TranslationZone | null;
  onUpdateZone: (updatedZone: TranslationZone) => void;
  onDeleteZone: (id: string) => void;
  onDuplicateZone: (zone: TranslationZone) => void;
  targetLang: string;
  translationStyle: string;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  selectedZone,
  onUpdateZone,
  onDeleteZone,
  onDuplicateZone,
  targetLang,
  translationStyle
}) => {
  const [isTranslatingLocal, setIsTranslatingLocal] = useState(false);

  if (!selectedZone) {
    return (
      <aside id="sidebar-right" className="w-80 flex flex-col border-l border-slate-200 bg-white text-slate-800 shrink-0 select-none">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-600">Bộ Chỉnh Sửa</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-150">
            <Sliders className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Chọn một khung thoại</p>
          <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
            Nhấp trực tiếp vào bất kỳ khung thoại nào trên Canvas hoặc vẽ tay một ô hộp mới trên trang truyện để chỉnh sửa chữ & định dạng.
          </p>
        </div>
      </aside>
    );
  }

  const updateField = (key: keyof TranslationZone, value: any) => {
    onUpdateZone({
      ...selectedZone,
      [key]: value
    });
  };

  // Re-run single bubble manual translation
  const translateSingleBubble = async () => {
    if (!selectedZone.originalText.trim()) return;
    setIsTranslatingLocal(true);

    try {
      const response = await fetch("/api/translate-zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedZone.originalText,
          sourceLang: "Auto",
          targetLang,
          translationStyle
        })
      });
      
      const resData = await response.json();
      if (resData.translatedText) {
        updateField("translatedText", resData.translatedText);
      }
    } catch (err: any) {
      console.error("Single translate error:", err);
      alert("Dịch tự động bong bóng này thất bại: " + err.message);
    } finally {
      setIsTranslatingLocal(false);
    }
  };

  return (
    <aside id="sidebar-right" className="w-80 flex flex-col border-l border-slate-200 bg-white text-slate-800 shrink-0 overflow-y-auto">
      {/* Title */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-sm text-indigo-700 flex items-center gap-1.5">
          <Sliders className="w-4 h-4" />
          Cấu Hình Khung Thoại
        </h3>
        <button
          onClick={() => onDeleteZone(selectedZone.id)}
          className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
          title="Xóa bong bóng"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Content Section */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 shadow-xs">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
            Nội dung chữ
          </h4>
          
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">Gốc (Japanese/Nguồn):</span>
              <textarea
                value={selectedZone.originalText}
                onChange={(e) => updateField("originalText", e.target.value)}
                placeholder="Nhập chữ gốc..."
                rows={2}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 focus:outline-none resize-none shadow-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 block">Dịch (Tiếng Việt/Target):</span>
                <button
                  onClick={translateSingleBubble}
                  disabled={isTranslatingLocal || !selectedZone.originalText}
                  className="text-[9px] text-indigo-600 hover:text-indigo-750 flex items-center gap-1 font-mono hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RefreshCcw className={`w-2.5 h-2.5 ${isTranslatingLocal ? "animate-spin" : ""}`} />
                  {isTranslatingLocal ? "Đang dịch..." : "Dịch lại ô này"}
                </button>
              </div>
              <textarea
                value={selectedZone.translatedText}
                onChange={(e) => updateField("translatedText", e.target.value)}
                placeholder="Chưa dịch..."
                rows={3}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 focus:outline-none resize-y shadow-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Font Style Section */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase block">Phông chữ & Định dạng</label>
          
          <div className="space-y-2.5">
            {/* Custom font family mapping based on styles */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">Style phông chữ:</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  onClick={() => {
                    updateField("fontSize", 24);
                    updateField("bold", true);
                    updateField("italic", false);
                  }}
                  className={`p-1.5 rounded-lg border text-center font-bold transition shadow-xs cursor-pointer ${
                    selectedZone.fontSize > 35 
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700" 
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Sound Effects (To)
                </button>
                <button
                  onClick={() => {
                    updateField("fontSize", 13);
                    updateField("bold", true);
                    updateField("borderRadius", 24);
                  }}
                  className={`p-1.5 rounded-lg border text-center transition shadow-xs cursor-pointer ${
                    selectedZone.fontSize <= 18 && selectedZone.bold 
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700" 
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Đối thoại chuẩn
                </button>
              </div>
            </div>

            {/* Slider for font-size */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Cỡ chữ:</span>
                <span className="font-mono font-bold text-indigo-600">{selectedZone.fontSize}px</span>
              </div>
              <input
                type="range"
                min="8"
                max="72"
                value={selectedZone.fontSize}
                onChange={(e) => updateField("fontSize", parseInt(e.target.value))}
                className="w-full accent-indigo-650 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Formatting checkboxes (Bold, Italic) */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={selectedZone.bold}
                  onChange={(e) => updateField("bold", e.target.checked)}
                  className="rounded border-slate-350 bg-white text-indigo-600 focus:ring-0"
                />
                <span className="font-bold">In Đậm (B)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={selectedZone.italic}
                  onChange={(e) => updateField("italic", e.target.checked)}
                  className="rounded border-slate-350 bg-white text-indigo-600 focus:ring-0"
                />
                <span className="italic">In Nghiêng (I)</span>
              </label>
            </div>

            {/* Text alignment controls */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div>
                <span className="block mb-1">Canh lề ngang:</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-xs">
                  <button
                    onClick={() => updateField("textAlign", "left")}
                    className={`flex-1 flex justify-center py-1 rounded-md cursor-pointer transition ${
                      selectedZone.textAlign === "left" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => updateField("textAlign", "center")}
                    className={`flex-1 flex justify-center py-1 rounded-md cursor-pointer transition ${
                      selectedZone.textAlign === "center" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => updateField("textAlign", "right")}
                    className={`flex-1 flex justify-center py-1 rounded-md cursor-pointer transition ${
                      selectedZone.textAlign === "right" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <span className="block mb-1">Canh dọc:</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-xs">
                  <button
                    onClick={() => updateField("verticalAlign", "top")}
                    className={`flex-1 flex justify-center py-1 text-[9px] font-bold rounded-md cursor-pointer transition ${
                      selectedZone.verticalAlign === "top" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    Trùm
                  </button>
                  <button
                    onClick={() => updateField("verticalAlign", "center")}
                    className={`flex-1 flex justify-center py-1 rounded-md cursor-pointer transition ${
                      selectedZone.verticalAlign === "center" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => updateField("verticalAlign", "bottom")}
                    className={`flex-1 flex justify-center py-1 text-[9px] font-bold rounded-md cursor-pointer transition ${
                      selectedZone.verticalAlign === "bottom" ? "bg-white text-indigo-600 shadow-xs border border-slate-150" : "hover:bg-slate-50 text-slate-450"
                    }`}
                  >
                    Dưới
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Speech Bubble Mask Colors */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase block">Bong bóng & Phông che</label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">Màu nền phông:</span>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={selectedZone.backgroundColor === "transparent" ? "#ffffff" : selectedZone.backgroundColor}
                  onChange={(e) => updateField("backgroundColor", e.target.value)}
                  disabled={selectedZone.backgroundColor === "transparent"}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-transparent block cursor-pointer disabled:opacity-30"
                />
                <button
                  onClick={() => {
                    if (selectedZone.backgroundColor === "transparent") {
                      updateField("backgroundColor", "#ffffff");
                    } else {
                      updateField("backgroundColor", "transparent");
                    }
                  }}
                  className={`text-[10px] p-1.5 rounded-lg border transition font-semibold cursor-pointer shadow-xs ${
                    selectedZone.backgroundColor === "transparent"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {selectedZone.backgroundColor === "transparent" ? "Có Nền" : "Trong Suốt"}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block mb-1">Màu chữ:</span>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={selectedZone.fontColor}
                  onChange={(e) => updateField("fontColor", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-transparent block cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <button 
                    onClick={() => updateField("fontColor", "#000000")}
                    className="text-[9px] text-slate-500 font-medium hover:text-indigo-650 hover:underline text-left cursor-pointer transition-colors"
                  >
                    Mặc định đen
                  </button>
                  <button 
                    onClick={() => updateField("fontColor", "#ffffff")}
                    className="text-[9px] text-slate-500 font-medium hover:text-indigo-650 hover:underline text-left cursor-pointer transition-colors"
                  >
                    Mặc định trắng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sliders for Outline / Padding / Border Radius */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          {/* Border Radius */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Độ bo góc bong bóng:</span>
              <span className="font-mono font-bold text-indigo-600">{selectedZone.borderRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={selectedZone.borderRadius}
              onChange={(e) => updateField("borderRadius", parseInt(e.target.value))}
              className="w-full accent-indigo-650 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
            />
          </div>

          {/* Border Width / Border Color */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Độ dày viền bong bóng:</span>
              <span className="font-mono font-bold text-indigo-600">{selectedZone.borderWidth}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={selectedZone.borderWidth}
              onChange={(e) => updateField("borderWidth", parseFloat(e.target.value))}
              className="w-full accent-indigo-650 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
            />
            {selectedZone.borderWidth > 0 && (
              <div className="mt-2 flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-150 inline-flex shadow-xs">
                <span className="text-[10px] text-slate-500 font-medium ml-1">Màu viền:</span>
                <input
                  type="color"
                  value={selectedZone.borderColor}
                  onChange={(e) => updateField("borderColor", e.target.value)}
                  className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Padding */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Độ đệm lề chữ (Padding):</span>
              <span className="font-mono font-bold text-indigo-600">{selectedZone.padding}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={selectedZone.padding}
              onChange={(e) => updateField("padding", parseInt(e.target.value))}
              className="w-full accent-indigo-650 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
            />
          </div>

          {/* Rotation */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                Góc xoay chữ (Xoay dọc/chéo):
              </span>
              <span className="font-mono font-bold text-indigo-600">{selectedZone.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={selectedZone.rotation}
              onChange={(e) => updateField("rotation", parseInt(e.target.value))}
              className="w-full accent-indigo-650 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Quick duplicator and layering */}
        <div className="pt-3 border-t border-slate-100 flex gap-2">
          <button
            onClick={() => onDuplicateZone(selectedZone)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-semibold transition cursor-pointer shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            Nhân bản ô
          </button>
          
          <button
            onClick={() => onDeleteZone(selectedZone.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[11px] text-red-600 font-semibold transition cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-505" />
            Xóa bỏ ô
          </button>
        </div>
      </div>
    </aside>
  );
};
