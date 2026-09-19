/** What a phone sees at mocraft.app: the studio is a desktop layout. */
export default function DesktopOnly() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center text-center"
      style={{ gap: 20, padding: 32, color: "#fff" }}
    >
      <div
        role="img"
        aria-label="Mocraft"
        style={{
          width: 132,
          height: 48,
          background: "#fff",
          maskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
          WebkitMaskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <h1 className="text-xl font-medium">Mocraft is on the web for now</h1>
      {/* Not `max-w-xs`: this theme's `--spacing-xs` is 12px, and that is what it compiles to. */}
      <p className="opacity-60" style={{ maxWidth: 320 }}>
        Open mocraft.app on a computer to craft and export your shots.
      </p>
    </main>
  );
}
