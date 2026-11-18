"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/lib/i18n";

interface DialogModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export function DialogModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = "max-w-lg"
}: DialogModalProps) {
  const { t, isRTL } = useI18n();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      dir={isRTL ? "rtl" : "ltr"}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className={clsx("sg-dialog", maxWidthClass)}
    >
      {open && (
        <div className="surface-card rounded-3xl p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-bold text-[var(--text-primary)]">
                {title}
              </h3>
              {description && (
                <p id={descId} className="mt-1 text-sm text-[var(--text-muted)]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="btn-ghost !rounded-xl !p-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
