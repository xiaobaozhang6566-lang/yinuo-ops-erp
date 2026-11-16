import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "亦诺跨境 AI 图片工厂",
  description: "Yinuo Crossborder private image production app"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
