import { Link } from 'react-router-dom';
import { MainNav } from '@/components/common/MainNav';
import { Footer } from '@/components/common/Footer';

export function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 lg:px-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[48px] font-bold leading-none text-[#e5e7eb]">404</p>
          <h1 className="text-[20px] font-bold leading-7 text-[#181c20]">Page not found</h1>
          <p className="max-w-[420px] text-[14px] leading-5 text-[#6b7280]">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
