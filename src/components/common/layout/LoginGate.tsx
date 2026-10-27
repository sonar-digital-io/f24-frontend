import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type GateState = 'checking' | 'locked' | 'open';

const INPUT_CLASS =
  'h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]';
const LABEL_CLASS = 'text-[14px] font-medium leading-none text-[#0a0a0a]';

/** Shared-login screen in front of the whole app. nginx checks the credentials
 *  (deploy/nginx.conf.template, `location = /gate`) and refuses /api/ without the cookie
 *  it sets, so the credentials are not in this bundle. Off under `vite dev`. */
export function LoginGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>(import.meta.env.DEV ? 'open' : 'checking');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (state !== 'checking') return;
    fetch('/gate').then(
      (res) => setState(res.ok ? 'open' : 'locked'),
      () => setState('locked'),
    );
  }, [state]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/gate', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${form.get('username')}:${form.get('password')}`),
      },
    });
    if (res.ok) setState('open');
    else setError(true);
  }

  if (state === 'open') return <>{children}</>;
  if (state === 'checking') return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <div className="h-[13px] w-full shrink-0 bg-gradient-to-r from-[#fad954] via-[#72b84c] via-50% to-[#007dbb]" />
      <main className="flex flex-1 items-center justify-center px-4 py-6">
        <form
          onSubmit={submit}
          className="flex w-full max-w-[400px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
        >
          <img src="/econ-engineering-logo.svg" alt="eCon Engineering" className="h-8 self-start" />
          <h1 className="text-[20px] font-bold leading-[28px] text-[#181c20]">Sign in to F24</h1>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gate-username" className={LABEL_CLASS}>
              Username
            </Label>
            <Input
              id="gate-username"
              name="username"
              autoComplete="username"
              required
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gate-password" className={LABEL_CLASS}>
              Password
            </Label>
            <Input
              id="gate-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={INPUT_CLASS}
            />
          </div>
          {error && (
            <p role="alert" className="text-[14px] text-[#dc2626]">
              Wrong username or password.
            </p>
          )}
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
