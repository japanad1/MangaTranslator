export interface TranslationZone {
  id: string;
  // Bounding box coordinates normalized from 0 to 1000
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  
  // Content values
  originalText: string;
  translatedText: string;
  
  // Styling adjustments
  fontSize: number;          // in pt/px (e.g., 14)
  fontColor: string;          // hex color, e.g., "#000000"
  backgroundColor: string;    // hex color, e.g., "#ffffff" or "transparent"
  borderRadius: number;       // border-radius in px (e.g., 12) or %
  borderWidth: number;        // in px
  borderColor: string;        // hex color, e.g., "#000000" or "transparent"
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  padding: number;            // in px
  rotation: number;           // rotation in degrees (-180 to 180)
  opacity: number;            // 0 to 100
}

export interface MangaPage {
  id: string;
  name: string;
  image: string; // Base64
  zones: TranslationZone[];
  isTranslating?: boolean;
  ocrStep?: string;
  isTranslated?: boolean;
}

export type EditorMode = "select" | "draw" | "pan";

export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: "Vietnamese", name: "Vietnamese" },
  { code: "English", name: "English" },
  { code: "Japanese", name: "Japanese" },
  { code: "Chinese", name: "Chinese" },
  { code: "Korean", name: "Korean" },
  { code: "Spanish", name: "Spanish" },
  { code: "French", name: "French" },
  { code: "German", name: "German" },
  { code: "Portuguese", name: "Portuguese" },
];
