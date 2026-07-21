import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase-code";
import { toast } from "sonner";
import { validateFile, safeStoragePath } from "../lib/upload-security";
import {
  Search, Filter, Upload, Trash2, Video, FileText, Image as ImageIcon,
  File, Eye, Copy, Check, X, Loader2, Plus, Grid, List, Hash,
} from "lucide-react";
import type { ContentLibraryItem } from "../types/content-library";

interface MediaLibraryProps {
  mode?: "browse" | "select";
  onSelect?: (item: ContentLibraryItem) => void;
  selectedId?: string | null;
  filterType?: ContentLibraryItem["file_type"];
}

const FILE_TYPE_ICONS: Record<string, typeof Video> = {
  video: Video, pdf: FileText, image: ImageIcon,
  document: File, quiz: FileText, assignment: FileText,
};

const FILE_TYPE_COLORS: Record<string, string> = {
  video: "text-blue-400", pdf: "text-red-400", image: "text-green-400",
  document: "text-yellow-400", quiz: "text-purple-400", assignment: "text-orange-400",
};

export function MediaLibrary({ mode = "browse", onSelect, selectedId, filterType }: MediaLibraryProps) {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(filterType || "all");
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_library")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching content library:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const ctx = file.type.startsWith("video") ? "video"
      : file.type === "application/pdf" ? "document"
      : file.type.startsWith("image") ? "image" : "chatFile";
    const v = validateFile(file, ctx as any, true);
    if (!v.valid) { toast.error(v.error); return; }

    setUploading(true);
    try {
      const filePath = safeStoragePath("content-library", file.name, user.id);

      const { error: uploadError } = await supabase.storage
        .from("course_files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("course_files")
        .getPublicUrl(filePath);

      const fileType: ContentLibraryItem["file_type"] =
        file.type.startsWith("video") ? "video"
        : file.type === "application/pdf" ? "pdf"
        : file.type.startsWith("image") ? "image" : "document";

      const { error: insertError } = await supabase.from("content_library").insert({
        title: file.name,
        file_type: fileType,
        storage_url: publicUrl,
        storage_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success(isAr ? "تم رفع الملف بنجاح" : "File uploaded successfully");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (item: ContentLibraryItem) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف "${item.title}"؟`
      : `Delete "${item.title}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    if (item.storage_path) {
      await supabase.storage.from("course_files").remove([item.storage_path]);
    }
    await supabase.from("content_library").delete().eq("id", item.id);
    toast.success(isAr ? "تم الحذف" : "Deleted");
    fetchItems();
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.file_type !== typeFilter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="media-upload"
            className="hidden"
            accept="video/*,.pdf,.doc,.docx,image/*"
            onChange={handleUpload}
          />
          <label
            htmlFor="media-upload"
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {isAr ? "رفع ملف" : "Upload"}
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}
          >
            <Grid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}
          >
            <List className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث..." : "Search files..."}
            className="w-full bg-muted/50 border border-border rounded-xl pl-8 pr-3 py-2 text-[10px] text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "video", "pdf", "image", "document"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                typeFilter === type
                  ? "bg-primary text-black"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {type === "all" ? (isAr ? "الكل" : "ALL") : type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <File className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-[10px] font-bold uppercase">
            {isAr ? "لا يوجد محتوى" : "No content yet"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((item) => {
            const Icon = FILE_TYPE_ICONS[item.file_type] || File;
            const color = FILE_TYPE_COLORS[item.file_type] || "text-muted-foreground";
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={`relative p-3 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-primary/10 border-primary/50"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                }`}
              >
                {mode === "select" && isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
                {item.file_type === "video" && item.storage_url.includes("youtube") ? (
                  <div className="w-full aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                ) : item.file_type === "image" ? (
                  <img
                    src={item.storage_url}
                    alt={item.title}
                    className="w-full aspect-video object-cover rounded-lg mb-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                )}
                <p className="text-[9px] font-bold truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[8px] font-bold uppercase ${color}`}>{item.file_type}</span>
                  {item.file_size && (
                    <span className="text-[8px] text-muted-foreground">{formatSize(item.file_size)}</span>
                  )}
                </div>
                {mode === "browse" && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyUrl(item.storage_url, item.id); }}
                      className="p-1 bg-black/60 rounded-md hover:bg-black/80 transition-colors"
                    >
                      {copiedId === item.id ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(item.storage_url, "_blank"); }}
                      className="p-1 bg-black/60 rounded-md hover:bg-black/80 transition-colors"
                    >
                      <Eye className="w-2.5 h-2.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="p-1 bg-red-500/60 rounded-md hover:bg-red-500/80 transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((item) => {
            const Icon = FILE_TYPE_ICONS[item.file_type] || File;
            const color = FILE_TYPE_COLORS[item.file_type] || "text-muted-foreground";
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary/50"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                }`}
              >
                <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold truncate">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold uppercase text-muted-foreground">{item.file_type}</span>
                    {item.file_size && <span className="text-[8px] text-muted-foreground">{formatSize(item.file_size)}</span>}
                    {item.usage_count !== undefined && (
                      <span className="text-[8px] text-muted-foreground">
                        <Hash className="w-2 h-2 inline" /> {item.usage_count}
                      </span>
                    )}
                  </div>
                </div>
                {mode === "select" && isSelected && (
                  <Check className="w-4 h-4 text-primary" />
                )}
                {mode === "browse" && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyUrl(item.storage_url, item.id); }}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="p-1 rounded-md hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <p className="text-[8px] text-muted-foreground font-bold uppercase">
          {filtered.length} {isAr ? "ملف" : "files"}
        </p>
      </div>
    </div>
  );
}
