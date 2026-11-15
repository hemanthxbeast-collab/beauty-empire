import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/server/errors";
import { env, integrations } from "@/server/env";
import { assertSameOrigin, errorResponse } from "@/server/http";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { audit } from "@/server/services/audit";
import { requireAdmin } from "@/server/session";
import { sniffImageType } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

if (integrations.cloudinary) {
  cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret, secure: true });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await enforceRateLimit("upload", admin.id);

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES + 64 * 1024) throw new AppError("Images must be 5 MB or smaller.", "VALIDATION");

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "general").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "general";
    if (!(file instanceof File)) throw new AppError("No file uploaded.", "VALIDATION");
    if (file.size > MAX_BYTES) throw new AppError("Images must be 5 MB or smaller.", "VALIDATION");

    const buf = Buffer.from(await file.arrayBuffer());
    const type = sniffImageType(buf);
    if (!type) throw new AppError("Only JPEG, PNG, WebP or AVIF images are allowed.", "VALIDATION");

    let url: string;
    if (integrations.cloudinary) {
      url = await new Promise<string>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: `${env.cloudinary.folder}/${folder}`, resource_type: "image", overwrite: false, unique_filename: true }, (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"));
            else resolve(result.secure_url);
          })
          .end(buf);
      });
    } else if (!env.isProduction) {
      // Development fallback only: store under /public/uploads (gitignored).
      const dir = path.join(process.cwd(), "public", "uploads", folder);
      await mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${type}`;
      await writeFile(path.join(dir, name), buf);
      url = `/uploads/${folder}/${name}`;
    } else {
      throw new AppError("Image uploads require Cloudinary to be configured.", "BAD_REQUEST");
    }

    await audit({ actorId: admin.id, action: "upload.image", entityType: "Upload", entityId: url.slice(-120), metadata: { bytes: buf.length, type } });
    return NextResponse.json({ url, storage: integrations.cloudinary ? "cloudinary" : "local-dev" });
  } catch (err) {
    return errorResponse(err, "admin/upload");
  }
}
