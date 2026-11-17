import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the BE monogram on brand magenta (iOS adds its own rounding). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#C21870", color: "#ffffff", fontSize: 92, fontFamily: "Georgia, serif", letterSpacing: -2 }}>
        BE
      </div>
    ),
    size,
  );
}
