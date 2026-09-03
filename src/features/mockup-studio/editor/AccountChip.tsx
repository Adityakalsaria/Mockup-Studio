"use client";

import { useState } from "react";
import { signOut } from "@/app/auth/actions";

/**
 * Who is signed in, and the way out.
 *
 * Collapsed to an initial, because the panel header is 46px of chrome shared
 * with the accent and theme controls and a full address would crowd both out.
 * The address is one click away rather than always on screen, which is about
 * how often anyone needs to read their own email.
 *
 * Sign-out is a server action inside a form, not a fetch: it has to clear the
 * session cookie, and only the server can do that in a way the next server
 * render agrees with.
 */
export function AccountChip({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${email}`}
        title={email}
        className="ks-press grid h-[28px] w-[28px] place-items-center rounded-full text-[12px] font-semibold"
        style={{ background: "var(--ks-ctl)", color: "var(--ks-text-dim)" }}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="ks-menu absolute right-0 top-[calc(100%+6px)] z-30 flex w-[210px] flex-col gap-[6px] rounded-[var(--ks-r-menu)] border p-[10px]"
          style={{
            background: "var(--ks-surface-solid)",
            borderColor: "var(--ks-line-strong)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            transformOrigin: "top right",
          }}
        >
          <span className="ks-micro truncate" style={{ color: "var(--ks-text-faint)" }}>
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="ks-press ks-label h-[30px] w-full rounded-[var(--ks-r)]"
              style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
