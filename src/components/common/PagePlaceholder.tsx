import { MainNav } from '@/components/common/MainNav';
import { Footer } from '@/components/common/Footer';

interface PagePlaceholderProps {
  title: string;
}

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:px-16 xl:px-[160px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[32px] font-bold leading-tight text-[#181c20]">{title}</h1>
          <p className="text-[14px] text-[#6b7280]">Coming soon</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
