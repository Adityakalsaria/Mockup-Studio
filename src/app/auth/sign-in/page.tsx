"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthResult } from "../actions";

/**
 * One form for both, because they are the same two fields.
 *
 * Separate pages for sign in and sign up make people who guessed wrong start
 * over. A toggle keeps whatever they have already typed, and the only thing
 * that changes is which action the submit runs.
 */
export default function SignInPage() {
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "";
  const linkError = params.get("error") === "link";
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [result, submit, pending] = useActionState<AuthResult, FormData>(action, undefined);

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-[360px] flex-col justify-center gap-[20px] px-[20px]">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">
          {mode === "in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-[4px] text-[14px] opacity-60">
          {mode === "in"
            ? "Email and password."
            : "Email and a password of at least 8 characters."}
        </p>
      </div>

      <form action={submit} className="flex flex-col gap-[10px]">
        {/* Carried through the form rather than read from the URL in the
            action: a server action has no access to the page's query string. */}
        <input type="hidden" name="next" value={nextPath} />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="h-[40px] rounded-[10px] border px-[12px] text-[14px] outline-none"
        />
        <input
          name="password"
          type="password"
          // Tells a password manager whether to offer a saved password or a
          // generated one. Wrong value here is why signup forms autofill the
          // old password.
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
          minLength={8}
          placeholder="Password"
          className="h-[40px] rounded-[10px] border px-[12px] text-[14px] outline-none"
        />

        {result && "error" in result ? (
          <p role="alert" className="text-[13px] text-red-600">
            {result.error}
          </p>
        ) : null}
        {result && "notice" in result ? (
          <p role="status" className="text-[13px] opacity-70">
            {result.notice}
          </p>
        ) : null}
        {/* An expired or reused confirmation link lands back here. */}
        {linkError ? (
          <p role="alert" className="text-[13px] text-red-600">
            That link has expired or was already used. Sign in, or create the
            account again.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-[40px] rounded-[10px] bg-black text-[14px] font-medium text-white disabled:opacity-60"
        >
          {pending ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="text-[13px] underline opacity-70"
      >
        {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
