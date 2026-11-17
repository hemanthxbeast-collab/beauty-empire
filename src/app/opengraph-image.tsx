import { ImageResponse } from "next/og";

export const alt = "Beauty Empire — Premium Beauty Parlour & Bridal Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #FFF9F7 0%, #FCE7F0 60%, #F4B6CF 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#C21870", textTransform: "uppercase", fontFamily: "sans-serif" }}>Beauty · Confidence · You</div>
        <div style={{ fontSize: 110, color: "#292329", marginTop: 24, lineHeight: 1 }}>Beauty Empire</div>
        <div style={{ fontSize: 44, color: "#9D145A", marginTop: 24, fontStyle: "italic" }}>Your Beauty, Our Passion.</div>
        <div style={{ fontSize: 26, color: "#8A5A6E", marginTop: 40, fontFamily: "sans-serif" }}>Salon · Bridal Studio · Skin & Hair Rituals</div>
      </div>
    ),
    size,
  );
}
