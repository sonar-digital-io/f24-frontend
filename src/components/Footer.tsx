export function Footer() {
  return (
    <footer className="w-full bg-white py-4">
      <div className="mx-auto flex max-w-[1888px] items-center gap-6 px-4 py-2">
        {/* eCon Engineering logo */}
        <div className="ml-[160px] flex h-20 shrink-0 items-center">
          <img
            src="/econ-engineering-logo.svg"
            alt="eCon Engineering"
            className="h-14 w-auto"
          />
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
