import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { AuthProvider } from "../hooks/useAuth";
import { ThemeProvider } from "../hooks/useTheme";
import React from "react";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
// const nunito = Nunito_Sans({ subsets: ["latin"], variable: '--font-nunito' });

export const metadata: Metadata = {
  title: "MangaVerse - Đọc truyện manga online",
  description: "Web đọc truyện manga online với hàng ngàn bộ truyện cập nhật mới nhất",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        {/* Script ngăn chặn F12 và DevTools trong môi trường production */}
        {process.env.NODE_ENV === 'production' && (
          <script dangerouslySetInnerHTML={{ __html: `
            // Kiểm tra nếu là thiết bị di động
            function isMobileDevice() {
              return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }
            
            // Chỉ áp dụng bảo vệ cho thiết bị desktop
            const isDesktop = !isMobileDevice();

            // Biến để theo dõi trạng thái
            let devtoolsOpen = false;
            let originalContent = '';

            // Chỉ thêm các bảo vệ nếu là thiết bị desktop
            if (isDesktop) {
              // Ngăn chặn phím F12 và các phím tắt khác
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                    (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                    (e.ctrlKey && e.key === 'U')) {
                  e.preventDefault();
                  return false;
                }
              });

              // Phát hiện khi DevTools mở (phương pháp 1: sự thay đổi kích thước cửa sổ)
              function detectDevToolsBySize() {
                const widthThreshold = window.outerWidth - window.innerWidth > 160;
                const heightThreshold = window.outerHeight - window.innerHeight > 160;

                if (widthThreshold || heightThreshold) {
                  if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    handleDevToolsOpen();
                  }
                } else if (devtoolsOpen) {
                  devtoolsOpen = false;
                  handleDevToolsClose();
                }
              }

              // Phương pháp 2: Phát hiện debug
              function detectDevToolsByDebug() {
                const element = new Image();

                Object.defineProperty(element, 'id', {
                  get: function() {
                    if (!devtoolsOpen) {
                      devtoolsOpen = true;
                      handleDevToolsOpen();
                    }
                  }
                });

                console.debug(element);
              }

              // Xử lý khi DevTools mở
              function handleDevToolsOpen() {
                // Lưu nội dung gốc
                if (!originalContent) {
                  originalContent = document.body.innerHTML;
                }

                // Thay đổi nội dung trang
                document.body.innerHTML = '<div style="text-align:center;padding:50px;background-color:#1a1a1a;color:white;height:100vh;"><h1 style="color:#ff4444;font-size:24px;">Vui lòng không sử dụng DevTools</h1><p>Trang web này không cho phép sử dụng công cụ dành cho nhà phát triển.</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background-color:#4444ff;color:white;border:none;border-radius:4px;cursor:pointer;">Tải lại trang</button></div>';
              }

              // Xử lý khi DevTools đóng
              function handleDevToolsClose() {
                if (originalContent) {
                  document.body.innerHTML = originalContent;
                  originalContent = '';
                }
              }

              // Vô hiệu hóa chuột phải
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              });

              // Theo dõi sự kiện resize để phát hiện DevTools
              window.addEventListener('resize', detectDevToolsBySize);

              // Kiểm tra định kỳ
              setInterval(detectDevToolsBySize, 1000);
              setInterval(detectDevToolsByDebug, 2000);
            }

            // Vô hiệu hóa console.log trong production
            if (!window.console.__proto__.originalLog) {
              window.console.__proto__.originalLog = window.console.log;
              window.console.log = function() {
                if (window.location.hostname === 'localhost') {
                  window.console.__proto__.originalLog.apply(console, arguments);
                }
              };
            }
          ` }}></script>
        )}
      </head>
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col`}>
        <AuthProvider>
          <ThemeProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 py-6">
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
