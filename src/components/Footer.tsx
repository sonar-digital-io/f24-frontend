export function Footer() {
  return (
    <footer className="w-full bg-white py-4">
      <div className="mx-auto flex max-w-[1888px] items-center gap-6 px-4 py-2">
        {/* eCon Engineering logo placeholder — replace with real asset when available */}
        <div className="ml-[160px] flex h-20 w-[200px] items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center">
            <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
              <polygon points="4,8 20,36 36,8 28,8 20,24 12,8" fill="#fdb515" />
              <polygon points="20,4 12,8 20,24 28,8" fill="#1f4f8b" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[18px] font-bold tracking-wide text-[#1f4f8b]">eCon</span>
            <span className="text-[10px] font-medium tracking-[0.2em] text-[#6b7280]">
              ENGINEERING
            </span>
          </div>
        </div>

        {/* Copyright text */}
        <div className="flex max-w-[503px] flex-col gap-0.5 text-[12px] leading-5 text-[#6b7280]">
          <span>F24 v-v.1.1.12</span>
          <span>Copyright ©eCon Engineering Ltd.</span>
          <span>
            All trademarks or registered trademarks are property of their respective owners
          </span>
        </div>
      </div>
    </footer>
  );
}
