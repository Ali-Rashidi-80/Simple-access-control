"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-[#0a0a14]/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-white/60",
          actionButton: "group-[.toast]:bg-[#00F0FF] group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white",
          success: "group-[.toaster]:border-[#00FF9D]/30",
          error: "group-[.toaster]:border-red-500/30",
          warning: "group-[.toaster]:border-orange-500/30",
          info: "group-[.toaster]:border-[#00F0FF]/30",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(10, 10, 20, 0.95)",
          "--normal-text": "white",
          "--normal-border": "rgba(255, 255, 255, 0.1)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

