"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Image picker: uploads to /api/admin/upload (Cloudinary or dev storage), or accepts an allow-listed URL. */
export function ImageUpload({ value, onChange, folder, id }: { value: string; onChange: (url: string) => void; folder: string; id: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Images must be 5 MB or smaller.");
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return toast.error("Use a JPEG, PNG, WebP or AVIF image.");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string; storage?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      onChange(json.url);
      toast.success(json.storage === "local-dev" ? "Uploaded (local development storage)" : "Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-rose bg-ivory">
          {value ? (
            <>
              <Image src={value} alt="" fill sizes="112px" className="object-cover" />
              <button type="button" onClick={() => onChange("")} className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-charcoal shadow" aria-label="Remove image">
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <ImagePlus className="size-6 text-muted-rose" aria-hidden />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" tabIndex={-1} aria-hidden id={`${id}-file`} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {uploading ? "Uploading…" : "Upload image"}
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF · max 5 MB</p>
        </div>
      </div>
      <Input id={id} aria-label="Image URL" value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an https://res.cloudinary.com / images.unsplash.com URL" className="h-10 text-xs" />
    </div>
  );
}
