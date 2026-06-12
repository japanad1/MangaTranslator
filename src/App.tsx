import { useState, useEffect } from "react";
import { SidebarLeft } from "./components/SidebarLeft";
import { SidebarRight } from "./components/SidebarRight";
import { MangaCanvas } from "./components/MangaCanvas";
import { TranslationZone, EditorMode, MangaPage } from "./types";
import { generateId } from "./utils";

// Programmatic Japanese Manga Creator for instant onboarding & offline tests
const generateSampleMangaPage = (): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Draw professional white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 1100);

  // Draw comic frames / border boundaries
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;

  // Let's create cool manga panel splits
  ctx.strokeRect(30, 30, 740, 480);    // Panel 1: Top
  ctx.strokeRect(30, 540, 355, 520);   // Panel 2: Bottom-left
  ctx.strokeRect(415, 540, 355, 520);  // Panel 3: Bottom-right

  // Draw epic vintage manga radial speed-focus lines inside Panel 1
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  const cx = 350;
  const cy = 250;
  for (let i = 0; i < 360; i += 4) {
    const rad = (i * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 45, cy + Math.sin(rad) * 45);
    ctx.lineTo(cx + Math.cos(rad) * 360, cy + Math.sin(rad) * 360);
    ctx.stroke();
  }

  // Draw some comic-style halftone shading or shadows
  ctx.fillStyle = "#0df5e6"; // Decorative modern pop touch
  ctx.fillStyle = "#111111";

  // Panel 1 Character silhouette
  ctx.beginPath();
  ctx.ellipse(320, 260, 55, 75, -0.15, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(280, 320);
  ctx.lineTo(210, 480);
  ctx.lineTo(410, 480);
  ctx.closePath();
  ctx.fill();

  // Panel 2 Character silhouette with dramatic shadows
  ctx.beginPath();
  ctx.ellipse(200, 800, 60, 80, 0.1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(150, 860);
  ctx.lineTo(80, 1060);
  ctx.lineTo(310, 1060);
  ctx.closePath();
  ctx.fill();

  // Speech Bubble 1 in Panel 1
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(560, 180, 85, 110, 0.05, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  // Draw bubble tail pointers
  ctx.beginPath();
  ctx.moveTo(510, 240);
  ctx.lineTo(470, 290);
  ctx.lineTo(540, 260);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(510, 240);
  ctx.lineTo(470, 290);
  ctx.moveTo(540, 260);
  ctx.lineTo(470, 290);
  ctx.strokeStyle = "#111111";
  ctx.stroke();

  // Speech Bubble 2 in Panel 2
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(240, 680, 95, 105, -0.05, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(280, 770);
  ctx.lineTo(320, 840);
  ctx.lineTo(300, 750);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();

  // Draw manga effects text
  ctx.fillStyle = "#111111";
  ctx.font = 'bold 32px "Bangers", Arial, sans-serif';
  ctx.fillText("DOKI-DOKI!", 440, 620);
  ctx.fillText("SHIIIN...", 110, 440);

  // Speech Bubble 1 Japanese content (Vertical layout format)
  ctx.fillStyle = "#111111";
  ctx.font = "bold 20px 'Courier New', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("こんにちは！", 560, 135);
  ctx.fillText("日本語の", 560, 170);
  ctx.fillText("OCR翻訳を", 560, 205);
  ctx.fillText("試してみてね！", 560, 240);

  // Speech Bubble 2 Japanese content
  ctx.fillText("何これ！？", 240, 640);
  ctx.fillText("すごい！ワンキー", 240, 680);
  ctx.fillText("でセリフが全部", 240, 720);
  ctx.fillText("翻訳されるぞ！", 240, 765);

  return canvas.toDataURL("image/jpeg");
};

export default function App() {
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [sourceLang, setSourceLang] = useState<string>("Auto");
  const [targetLang, setTargetLang] = useState<string>("Vietnamese");
  const [translationStyle, setTranslationStyle] = useState<string>("Casual");
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });

  useEffect(() => {
    localStorage.setItem("user_gemini_api_key", userApiKey);
  }, [userApiKey]);

  // Derive active page states
  const currentPage = pages.find((p) => p.id === currentPageId) || null;
  const image = currentPage ? currentPage.image : null;
  const zones = currentPage ? currentPage.zones : [];
  
  // Calculate if any page is translating
  const isTranslating = pages.some((p) => p.isTranslating);

  const setZones = (newZones: TranslationZone[] | ((prev: TranslationZone[]) => TranslationZone[])) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.id === currentPageId) {
          const updatedZones = typeof newZones === "function" ? newZones(p.zones) : newZones;
          return { ...p, zones: updatedZones };
        }
        return p;
      })
    );
  };

  const setIsTranslating = (val: boolean) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.id === currentPageId) {
          return { ...p, isTranslating: val, ocrStep: val ? "Đang xử lý phân tích..." : "" };
        }
        return p;
      })
    );
  };

  const setPageOcrStep = (step: string) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.id === currentPageId) {
          return { ...p, ocrStep: step };
        }
        return p;
      })
    );
  };

  // Load saved state on component mount
  useEffect(() => {
    const savedPages = localStorage.getItem("manga_translator_pages");
    if (savedPages) {
      try {
        const parsed = JSON.parse(savedPages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out the initial sample pages (starting with 'sample') to ensure a clean slate
          const filtered = parsed.filter((p) => !p.id.startsWith("sample"));
          if (filtered.length > 0) {
            setPages(filtered);
            setCurrentPageId(filtered[0].id);
          } else {
            setPages([]);
            setCurrentPageId(null);
          }
          return;
        }
      } catch (err) {
        console.error("Failed to parse cached pages", err);
      }
    }

    // Migration / fallback for previous single page users (ignoring sample codes)
    const savedImg = localStorage.getItem("manga_translator_img");
    const savedZones = localStorage.getItem("manga_translator_zones");
    if (savedImg) {
      let oldZones: TranslationZone[] = [];
      if (savedZones) {
        try {
          oldZones = JSON.parse(savedZones);
        } catch (e) {}
      }
      const migratedPage: MangaPage = {
        id: "migrated_page",
        name: "đã tải lên.png",
        image: savedImg,
        zones: oldZones,
      };
      setPages([migratedPage]);
      setCurrentPageId("migrated_page");
    }
  }, []);

  // Sync back to localCache to avoid losing progress
  useEffect(() => {
    if (pages.length > 0) {
      localStorage.setItem("manga_translator_pages", JSON.stringify(pages));
    } else {
      localStorage.removeItem("manga_translator_pages");
    }
  }, [pages]);

  const handleUpdateZone = (updated: TranslationZone) => {
    setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
  };

  const handleDeleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  };

  const handleDuplicateZone = (zone: TranslationZone) => {
    const duplicated: TranslationZone = {
      ...zone,
      id: generateId(),
      xmin: Math.min(940, zone.xmin + 40),
      ymin: Math.min(940, zone.ymin + 40),
      xmax: Math.min(1000, zone.xmax + 40),
      ymax: Math.min(1000, zone.ymax + 40),
    };
    setZones((prev) => [...prev, duplicated]);
    setSelectedZoneId(duplicated.id);
  };

  const addPages = (newPagesList: { name: string; image: string }[]) => {
    const formatted: MangaPage[] = newPagesList.map((p, idx) => ({
      id: "page_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5) + "_" + idx,
      name: p.name,
      image: p.image,
      zones: [],
      isTranslated: false
    }));
    setPages((prev) => [...prev, ...formatted]);
    if (!currentPageId && formatted.length > 0) {
      setCurrentPageId(formatted[0].id);
    } else if (pages.length === 0 && formatted.length > 0) {
      setCurrentPageId(formatted[0].id);
    }
  };

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (currentPageId === id) {
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        setCurrentPageId(remaining[0].id);
      } else {
        setCurrentPageId(null);
      }
    }
  };

  const loadSamplePage = () => {
    const sampleB64 = generateSampleMangaPage();
    const samplePage: MangaPage = {
      id: "sample_" + Date.now(),
      name: `Trang_Mẫu_Nhật_${pages.length + 1}.jpg`,
      image: sampleB64,
      zones: [],
      isTranslated: false
    };
    setPages((prev) => [...prev, samplePage]);
    setCurrentPageId(samplePage.id);
  };

  // Run the batch automatic translation for all untranslated or selected pages in sequential order
  const runBatchTranslate = async () => {
    const targetPages = pages.filter((p) => !p.isTranslating);
    if (targetPages.length === 0) {
      alert("Chưa có trang truyện nào được tải lên!");
      return;
    }

    let isFirstPage = true;

    for (const page of targetPages) {
      // If it's not the first page, add a delay of 2.5 seconds to space out requests and respect rate limits
      if (!isFirstPage) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? { ...p, isTranslating: true, ocrStep: "Đợi 2.5s tránh quá tải API..." }
              : p
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      isFirstPage = false;

      // Set single page as translating
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? { ...p, isTranslating: true, ocrStep: "Đang phân tích bố cục trang..." }
            : p
        )
      );

      let success = false;
      let retriesLeft = 3;
      let waitSeconds = 12;

      while (!success && retriesLeft > 0) {
        // Yield visual progress updates helper
        const updateStep = (id: string, step: string) => {
          setPages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ocrStep: step } : p))
          );
        };

        let timer1: any = null;
        let timer2: any = null;

        try {
          timer1 = setTimeout(() => {
            updateStep(page.id, "Nhận diện lời thoại (OCR)...");
          }, 1800);

          timer2 = setTimeout(() => {
            updateStep(page.id, "Đang AI dịch lời thoại...");
          }, 3600);

          const response = await fetch("/api/ocr-translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: page.image,
              sourceLang,
              targetLang,
              translationStyle,
              userApiKey
            })
          });

          if (timer1) clearTimeout(timer1);
          if (timer2) clearTimeout(timer2);

          const data = await response.json();

          // Handle 429 Quota Rate Limit specifically
          if (response.status === 429 || (data && data.code === 429) || (data.error && data.error.includes("429"))) {
            retriesLeft--;
            if (retriesLeft <= 0) {
              setPages((prev) =>
                prev.map((p) =>
                  p.id === page.id
                    ? { ...p, isTranslating: false, ocrStep: "Đầy hạn mức dịch. Hãy thử lại sau." }
                    : p
                )
              );
              break; // exit retry loop, proceed to next page
            }

            // Countdown timer visual countdown
            for (let sec = waitSeconds; sec > 0; sec--) {
              updateStep(page.id, `API bận. Thử lại sau ${sec} giây... (Còn ${retriesLeft} lượt thử)`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            // Increase wait time for subsequent retries
            waitSeconds += 10;
            continue; // retry now
          }

          if (data.error) {
            console.error(`Page translation failed for ${page.name}:`, data.error);
            setPages((prev) =>
              prev.map((p) =>
                p.id === page.id
                  ? { ...p, isTranslating: false, ocrStep: `Lỗi: ${data.error}` }
                  : p
              )
            );
            break; // Proceed to next page
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
                id: `auto_${index}_${Date.now()}_batch`,
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

            setPages((prev) =>
              prev.map((p) =>
                p.id === page.id
                  ? { ...p, zones: parsedZones, isTranslating: false, ocrStep: "", isTranslated: true }
                  : p
              )
            );
            success = true; // successfully finished this page
          } else {
            setPages((prev) =>
              prev.map((p) =>
                p.id === page.id
                  ? { ...p, isTranslating: false, ocrStep: "Không tìm thấy thoại." }
                  : p
              )
            );
            break; // Proceed to next page
          }
        } catch (err: any) {
          if (timer1) clearTimeout(timer1);
          if (timer2) clearTimeout(timer2);
          console.error(`Batch item failed`, err);
          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? { ...p, isTranslating: false, ocrStep: "Lỗi kết nối mạng." }
                : p
            )
          );
          break; // Proceed to next page
        }
      }
    }
  };

  const activeSelectedZone = zones.find((z) => z.id === selectedZoneId) || null;

  return (
    <div id="translator-app-root" className="h-screen w-screen flex flex-col bg-[#f1f5f9] font-sans text-slate-800 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold select-none shadow-sm pb-0.5">
            M
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            MangaTranslator <span className="text-indigo-600 font-bold">Pro</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-150">
            <span className="text-xs font-mono text-slate-400">INPUT:</span>
            <span className="text-slate-700 bg-white shadow-xs px-2 py-0.5 rounded text-xs">{sourceLang === "Auto" ? "Tự động phát hiện" : sourceLang}</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-mono text-slate-400">OUTPUT:</span>
            <span className="text-indigo-650 bg-indigo-50/80 font-semibold px-2 py-0.5 rounded text-xs">{targetLang}</span>
          </div>

          {pages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                Dự án: <strong className="text-slate-700 font-semibold">{pages.length} trang</strong>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* 1. Sidebar Left: Page Uploader, Autotranslation triggers */}
        <SidebarLeft
          image={image}
          onImageUpload={(b64) => {
            // Emulated single upload
            addPages([{ name: `Trang_${pages.length + 1}.png`, image: b64 }]);
          }}
          zones={zones}
          setZones={setZones}
          selectedZoneId={selectedZoneId}
          setSelectedZoneId={setSelectedZoneId}
          sourceLang={sourceLang}
          setSourceLang={setSourceLang}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          translationStyle={translationStyle}
          setTranslationStyle={setTranslationStyle}
          userApiKey={userApiKey}
          setUserApiKey={setUserApiKey}
          isTranslating={isTranslating}
          setIsTranslating={setIsTranslating}
          loadSample={loadSamplePage}
          setHoveredZoneId={setHoveredZoneId}
          
          // Enhanced multi-page props
          pages={pages}
          setPages={setPages}
          currentPageId={currentPageId}
          setCurrentPageId={setCurrentPageId}
          addPages={addPages}
          deletePage={deletePage}
          runBatchTranslate={runBatchTranslate}
        />

        {/* 2. Central Editor Canvas viewport */}
        <MangaCanvas
          image={image}
          onImageLoaded={() => {}}
          zones={zones}
          setZones={setZones}
          selectedZoneId={selectedZoneId}
          setSelectedZoneId={setSelectedZoneId}
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          isTranslating={currentPage?.isTranslating || false}
          ocrStep={currentPage?.ocrStep || ""}
          targetLang={targetLang}
          translationStyle={translationStyle}
          userApiKey={userApiKey}
          hoveredZoneId={hoveredZoneId}
        />

        {/* 3. Sidebar Right: Styles & Content Typography controls */}
        <SidebarRight
          selectedZone={activeSelectedZone}
          onUpdateZone={handleUpdateZone}
          onDeleteZone={handleDeleteZone}
          onDuplicateZone={handleDuplicateZone}
          targetLang={targetLang}
          translationStyle={translationStyle}
          userApiKey={userApiKey}
        />
      </div>
    </div>
  );
}
