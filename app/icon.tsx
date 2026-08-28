import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0b615f",
        color: "#f8fbf6",
        display: "flex",
        fontSize: 15,
        fontWeight: 800,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-1px",
        width: "100%",
      }}
    >
      LP
    </div>,
    size,
  );
}
