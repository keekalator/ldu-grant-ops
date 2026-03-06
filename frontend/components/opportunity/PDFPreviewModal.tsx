"use client";

import PixelIcon from "@/components/shared/PixelIcon";

interface Props {
  title: string;
  url: string;
  onClose: () => void;
}

const isPDF = (url: string) =>
  url.toLowerCase().endsWith(".pdf") ||
  url.includes("blob.vercel-storage.com") && url.includes(".pdf");

const isImage = (url: string) => {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
};

export default function PDFPreviewModal({ title, url, onClose }: Props) {
  const showPdf = isPDF(url) || url.includes("blob.vercel-storage");
  const showImg = isImage(url);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "#0a0a1a", borderBottom: "2px solid #333" }}
      >
        <span
          className="text-[11px] font-black uppercase tracking-widest text-white truncate flex-1"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl border-[2px] border-white flex items-center justify-center shrink-0 transition-all active:opacity-70"
          style={{ background: "#333", boxShadow: "2px 2px 0 #666" }}
        >
          <PixelIcon name="cross" size={16} color="#fff" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-4 flex justify-center items-start">
        <div
          className="max-w-2xl w-full rounded-xl overflow-hidden border-[2px] border-[#333]"
          style={{ background: "#1a1a1a", boxShadow: "4px 4px 0 #333" }}
          onClick={(e) => e.stopPropagation()}
        >
          {showPdf ? (
            <iframe
              src={url}
              title={title}
              className="w-full aspect-[8.5/11] min-h-[70vh]"
              style={{ border: "none" }}
            />
          ) : showImg ? (
            <img
              src={url}
              alt={title}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-[#aaaacc] mb-4">
                Preview not available for this file type.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-[2px] border-[#0066cc] transition-all active:translate-y-[1px]"
                style={{ background: "#0066cc", boxShadow: "2px 2px 0 #0a0a1a" }}
              >
                <PixelIcon name="rocket" size={14} color="white" />
                <span
                  className="text-[10px] font-black uppercase tracking-wider text-white"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  DOWNLOAD / OPEN
                </span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
