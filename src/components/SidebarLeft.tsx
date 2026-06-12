import React, { useRef, useState } from "react";
import { 
  Upload, 
  Languages, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  FolderCheck, 
  Info,
  Loader2,
  Plus,
  Layers,
  FileCheck2,
  Key,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import { TranslationZone, LANGUAGES, MangaPage } from "../types";
import { exportMangaAsImage } from "../utils";

interface SidebarLeftProps {
  image: string | null;
  onImageUpload: (b64: string) => void;
  zones: TranslationZone[];
  setZones: (zones: TranslationZone[]) => void;
  selectedZoneId: string | null;
  setSelectedZoneId: (id: string | null) => void;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  translationStyle: string;
  setTranslationStyle: (style: string) => void;
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  isTranslating: boolean;
  setIsTranslating: (val: boolean) => void;
  loadSample: () => void;
  setHoveredZoneId: (id: string | null) => void;
  
  // Enhanced multi-page props
  pages: MangaPage[];
  setPages: React.Dispatch<React.SetStateAction<MangaPage[]>>;
  currentPageId: string | null;
  setCurrentPageId: (id: string | null) => void;
  addPages: (newPagesList: { name: string; image: string }[]) => void;
  deletePage: (id: string) => void;
  runBatchTranslate: () => Promise<void>;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  image,
  onImageUpload,
  zones,
  setZones,
  selectedZoneId,
  setSelectedZoneId,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  translationStyle,
  setTranslationStyle,
  userApiKey,
  setUserApiKey,
  isTranslating,
  setIsTranslating,
  loadSample,
  setHoveredZoneId,
  
  pages,
  setPages,
  currentPageId,
  setCurrentPageId,
  addPages,
  deletePage,
  runBatchTranslate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [ocrStep, setOcrStep] = useState<string>("");
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Handle single & multiple file uploads to base64
  const processFiles = (files: FileList) => {
    const promises: Promise<{ name: string; image: string }>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      
      const promise = new Promise<{ name: string; image: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            image: e.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      });
      promises.push(promise);
    }

    if (promises.length > 0) {
      Promise.all(promises).then((results) => {
        addPages(results);
      });
    } else {
      alert("Vui lòng tải lên tài liệu định dạng hình ảnh!");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isAppending: boolean = false) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value to allow uploading same file name again
      e.target.value = "";
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Run the Automatic OCR & Translate for the active current page
  const runAutoOCR = async () => {
    if (!image || !currentPageId) return;
    setIsTranslating(true);
    setOcrStep("Phân tích bố cục trang truyện...");

    // Update state inside pages list
    setPages((prev) =>
      prev.map((p) =>
        p.id === currentPageId
          ? { ...p, isTranslating: true, ocrStep: "Phân tích bố cục trang truyện..." }
          : p
      )
    );

    let success = false;
    let retriesLeft = 3;
    let waitSeconds = 12;

    while (!success && retriesLeft > 0) {
      const updateStepLocal = (step: string) => {
        setOcrStep(step);
        setPages((prev) =>
          prev.map((p) => (p.id === currentPageId ? { ...p, ocrStep: step } : p))
        );
      };

      let stepTimer1: any = null;
      let stepTimer2: any = null;

      try {
        stepTimer1 = setTimeout(() => {
          updateStepLocal("Nhận diện các khung thoại (OCR)...");
        }, 2200);

        stepTimer2 = setTimeout(() => {
          updateStepLocal("Đang dịch thuật văn bản sang " + targetLang + "...");
        }, 4500);

        const response = await fetch("/api/ocr-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image,
            sourceLang,
            targetLang,
            translationStyle,
            userApiKey
          })
        });

        if (stepTimer1) clearTimeout(stepTimer1);
        if (stepTimer2) clearTimeout(stepTimer2);

        const data = await response.json();
        
        // Handle 429 Quota Rate Limit specifically
        if (response.status === 429 || (data && data.code === 429) || (data.error && data.error.includes("429"))) {
          retriesLeft--;
          if (retriesLeft <= 0) {
            alert("Đầy hạn mức dịch thử miễn phí của Gemini API cho ngày hôm nay. Hãy thử lại sau vài phút hoặc tự vẽ và dịch bằng tay.");
            break;
          }

          // Countdown timer visual countdown
          for (let sec = waitSeconds; sec > 0; sec--) {
            updateStepLocal(`API bận. Thử lại sau ${sec} giây... (Còn ${retriesLeft} lượt thử)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          // Increase wait time for subsequent retries
          waitSeconds += 10;
          continue; // retry
        }

        if (data.error) {
          alert("Lỗi OCR: " + data.error);
          break;
        }

        if (data.bubbles && Array.isArray(data.bubbles)) {
          const parsedZones: TranslationZone[] = data.bubbles.map((b: any, index: number) => {
            const ymin = typeof b.ymin === "number" ? b.ymin : 100;
            const xmin = typeof b.xmin === "number" ? b.xmin : 100;
            const ymax = typeof b.ymax === "number" ? b.ymax : 200;
            const xmax = typeof b.xmax === "number" ? b.xmax : 300;

            const boxHeightRelative = ymax - ymin;
            const defaultFontSize = Math.max(12, Math.min(32, Math.round(boxHeightRelative * 0.18)));

            return {
              id: `auto_${index}_${Date.now()}`,
              ymin,
              xmin,
              ymax,
              xmax,
              originalText: b.originalText || "",
              translatedText: b.translatedText || "",
              fontSize: defaultFontSize,
              fontColor: "#000000",
              backgroundColor: "#ffffff",
              borderRadius: 24,
              borderWidth: 0,
              borderColor: "#000000",
              textAlign: "center",
              verticalAlign: "center",
              bold: true,
              italic: false,
              padding: 6,
              rotation: 0,
              opacity: 100
            };
          });

          setZones(parsedZones);
          
          // Also ensure page reflects update immediately
          setPages((prev) =>
            prev.map((p) =>
              p.id === currentPageId
                ? { ...p, zones: parsedZones, isTranslated: true, isTranslating: false, ocrStep: "" }
                : p
            )
          );

          if (parsedZones.length > 0) {
            setSelectedZoneId(parsedZones[0].id);
          }
          success = true;
        } else {
          alert("Không nhận diện được khung thoại nào bằng tính năng tự động. Bạn vẫn có thể vẽ tay!");
          break;
        }
      } catch (err: any) {
        if (stepTimer1) clearTimeout(stepTimer1);
        if (stepTimer2) clearTimeout(stepTimer2);
        console.error(err);
        alert("Kết nối máy chủ dịch thuật thất bại: " + err.message);
        break;
      }
    }

    setIsTranslating(false);
    setOcrStep("");
    setPages((prev) =>
      prev.map((p) =>
        p.id === currentPageId ? { ...p, isTranslating: false, ocrStep: "" } : p
      )
    );
  };

  const handleExport = () => {
    if (!image) return;
    const currentPageName = pages.find((p) => p.id === currentPageId)?.name || "translated_manga.png";
    const cleanName = currentPageName.replace(/\.[^/.]+$/, "") + "_translated.png";
    exportMangaAsImage(image, zones, cleanName);
  };

  const handleExportAll = async () => {
    if (pages.length === 0) return;
    setIsExportingAll(true);
    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const cleanName = page.name.replace(/\.[^/.]+$/, "") + "_translated.png";
        await exportMangaAsImage(page.image, page.zones, cleanName);
        // Wait 800ms before next export file download to prevent browser blockages
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (err) {
      console.error("Batch download error:", err);
    } finally {
      setIsExportingAll(false);
    }
  };

  const currentActivePage = pages.find((p) => p.id === currentPageId);

  return (
    <aside id="sidebar-left" className="w-80 flex flex-col border-r border-slate-200 bg-white text-slate-800 shrink-0 select-none">
      
      {/* 1. Project Header & Multi-Page list header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-xs tracking-tight text-slate-700 uppercase">
            Quản Lý Trang Truyện ({pages.length})
          </span>
        </div>
        {pages.length > 0 && (
          <button
            onClick={() => addFileInputRef.current?.click()}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[11px] text-white font-bold transition shadow-xs cursor-pointer"
            title="Tải lên thêm nhiều trang truyện mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm trang</span>
          </button>
        )}
      </div>

      {/* 2. Main Sidebar Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
        
        {/* Page List Panel */}
        {pages.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh sách trang truyện</span>
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc muốn xóa toàn bộ các trang truyện hiện tại?")) {
                    setPages([]);
                    setCurrentPageId(null);
                  }
                }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium cursor-pointer"
              >
                Xóa tất cả ({pages.length})
              </button>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 p-1.5 rounded-xl bg-slate-50/40 scrollbar-thin">
              {pages.map((p, idx) => {
                const isActive = p.id === currentPageId;
                const zonesCount = p.zones.length;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setCurrentPageId(p.id);
                      setSelectedZoneId(null);
                    }}
                    className={`group relative p-1.5 rounded-lg border text-left cursor-pointer transition-all flex items-center gap-3 ${
                      isActive
                        ? "bg-indigo-50/90 border-indigo-200 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center relative">
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover select-none"
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-900/75 text-[8px] font-mono font-bold text-white px-0.5 rounded-tl leading-none">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {p.name}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        {p.isTranslating ? (
                          <span className="text-[9px] font-mono text-indigo-600 font-semibold animate-pulse flex items-center gap-0.5">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            AI đang dịch...
                          </span>
                        ) : zonesCount > 0 ? (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 flex items-center gap-0.5">
                            <FileCheck2 className="w-2.5 h-2.5" />
                            Đã dịch ({zonesCount} ô)
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-400">
                            Chưa tìm thấy ô thoại
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(p.id);
                      }}
                      className="absolute right-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 bg-white border border-slate-100 shadow-xs rounded hover:bg-red-50 transition cursor-pointer"
                      title="Xóa trang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Multi page uploader placeholder */
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trang truyện dịch</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? "border-indigo-400 bg-indigo-50 scale-[0.98]" 
                  : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-slate-500"
              }`}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2 text-indigo-600" />
              <p className="text-xs font-semibold text-slate-700">Kéo thả trang truyện dịch</p>
              <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ chọn nhiều file cùng lúc (PNG, JPG, WEBP)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange(e, false)}
              className="hidden"
            />
          </div>
        )}

        {/* Append more files hidden input */}
        <input
          ref={addFileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileChange(e, true)}
          className="hidden"
        />

        {/* Demo trigger */}
        {pages.length === 0 && (
          <button
            onClick={loadSample}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 hover:text-slate-800 transition font-medium cursor-pointer shadow-xs"
          >
            <ImageIcon className="w-4 h-4 text-indigo-550" />
            Sử dụng trang truyện mẫu (Tiếng Nhật)
          </button>
        )}

        {/* 3. Language settings */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Cài Đặt Dịch Thuật AI</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Ngôn ngữ nguồn:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Auto">Tự nhận diện</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Ngôn ngữ đích:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Gợi ý phong cách ngôn từ (Style):</span>
            <select
              value={translationStyle}
              onChange={(e) => setTranslationStyle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-150 text-indigo-750 font-medium rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Casual">Casual (Tự nhiên, Đời thường)</option>
              <option value="Action">Action (Dồn dập, Kịch tính)</option>
              <option value="Humorous">Humorous (Dí dỏm, Hài hước)</option>
              <option value="Cute">Cute (Mềm mại, Dễ thương)</option>
              <option value="Formal">Formal (Trang trọng, Cổ kính)</option>
            </select>
          </div>

          {/* Cấu hình Gemini API Key */}
          <div className="pt-2 border-t border-slate-150/60 mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Khóa API Cá Nhân (Tùy Chọn)</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${userApiKey ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50/60 text-indigo-500"}`}>
                {userApiKey ? "Đang Dùng Key Cá Nhân" : "Đang Dùng Key Hệ Thống"}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="Dán Gemini API Key (AIzaSy...) tại đây"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value.trim())}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg py-1.5 pl-7 pr-8 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 font-mono"
              />
              <Key className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 w-4 h-4 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showKey ? "Ẩn" : "Hiện"}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              * Rất hữu dụng khi deploy lên Vercel bị hết hạn mức (429/Rate limit).{" "}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-500 hover:underline inline-flex items-center gap-0.5 font-semibold"
              >
                Lấy Key miễn phí <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            </p>
          </div>
        </div>

        {/* 4. Action and triggers */}
        {pages.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiến trình Dịch Thuật AI</span>
            
            <div className="grid grid-cols-1 gap-2">
              {/* Batch Translate All */}
              <button
                onClick={runBatchTranslate}
                disabled={isTranslating}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                  isTranslating
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-indigo-650 hover:bg-indigo-700 active:scale-[0.98] text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 fill-indigo-200/20 animate-pulse" />
                {isTranslating ? "Đang dịch hàng loạt..." : `Dịch Hàng Loạt Tất Cả (${pages.length} trang)`}
              </button>

              {/* Translate Single Page ONLY */}
              {image && (
                <button
                  onClick={runAutoOCR}
                  disabled={isTranslating}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs border border-indigo-150 text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  <Languages className="w-3.5 h-3.5" />
                  Chỉ dịch Trang Hiện Tại
                </button>
              )}
            </div>

            {/* Individual active page step status */}
            {currentActivePage?.isTranslating && (
              <div className="text-center pt-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                <p className="text-[11px] text-indigo-700 font-mono font-bold animate-pulse flex items-center justify-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  <span>{currentActivePage.ocrStep || ocrStep}</span>
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Đang xử lý trang: {currentActivePage.name}</p>
              </div>
            )}
          </div>
        )}

        {/* 5. Speech bubble zones list for currently selected page */}
        {image && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Khung Thoại Trang Hiện Tại ({zones.length})
              </label>
              {zones.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Xóa tất cả khung thoại ở trang hiện tại?")) setZones([]);
                  }}
                  className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer hover:underline"
                >
                  Xóa hết ở trang này
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
              {zones.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Chưa vẽ/dịch khung thoại nào ở trang này.
                  <br />
                  <span className="text-[9px] text-slate-400 mt-1 block px-3">Tự động phát hiện bằng nút trên hoặc nhấp kéo trực tiếp trên Canvas bên phải.</span>
                </div>
              ) : (
                zones.map((zone, idx) => (
                  <div
                    key={zone.id}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition flex items-center justify-between min-w-0 shadow-xs ${
                      selectedZoneId === zone.id
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold leading-tight">
                        #{idx + 1} Lời thoại
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {zone.translatedText || zone.originalText || "(Chưa nhập chữ)"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZones(zones.filter((z) => z.id !== zone.id));
                        if (selectedZoneId === zone.id) setSelectedZoneId(null);
                      }}
                      className="text-slate-450 hover:text-red-500 p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
                      title="Xóa khung thoại"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Export Section */}
      {pages.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* Download single active page */}
            {image && (
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-150 cursor-pointer transition-colors"
                title="Tải ảnh đã dịch hiện tại"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải trang này</span>
              </button>
            )}

            {/* Download all pages sequentially */}
            <button
              onClick={handleExportAll}
              disabled={isExportingAll}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                image ? "" : "col-span-2"
              } ${
                isExportingAll 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title="Duyệt tải tất cả các trang truyện đã dịch trong danh sách"
            >
              {isExportingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Tải toàn bộ ({pages.length})</span>
            </button>
          </div>

          <div className="flex gap-2 text-[10px] items-center justify-center text-slate-455 font-mono">
            <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tự động đặt tên trang + Độc lập file</span>
          </div>
        </div>
      )}
    </aside>
  );
};
