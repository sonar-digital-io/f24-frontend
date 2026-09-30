import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSettings, useUpdateSettings } from '@/hooks/api/useSettings';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { toValueMap } from '@/lib/keyValueMapping';
import { getApiErrorMessage } from '@/lib/apiError';

// Not user-editable — always sent back as-is (see the page's own doc comment).
const FIXED_ENGINE_SETTING = '1';

export function Settings() {
  const { data, isLoading, isError } = useSettings();
  const updateMutation = useUpdateSettings();

  const [minimalEngineSetting, setMinimalEngineSetting] = useState('');

  useHydrateOnce(!!data, () => {
    setMinimalEngineSetting(toValueMap(data!.parameters).minimal_engine_setting ?? '');
  });

  function handleSave() {
    updateMutation.mutate({
      parameters: [
        { reference: 'minimal_engine_setting', value: minimalEngineSetting },
        { reference: 'fixed_engine_setting', value: FIXED_ENGINE_SETTING },
      ],
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <h1 className="mb-6 text-[24px] font-bold leading-8 text-[#0a0a0a]">Settings</h1>

          {isLoading ? (
            <p className="text-[14px] text-[#6b7280]">Loading settings…</p>
          ) : isError ? (
            <p className="text-[14px] text-[#dc2626]">Failed to load settings.</p>
          ) : (
            <div className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="minimal-engine-setting"
                  className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                >
                  Minimal engine setting
                </Label>
                <Input
                  id="minimal-engine-setting"
                  type="number"
                  value={minimalEngineSetting}
                  onChange={(e) => setMinimalEngineSetting(e.target.value)}
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="fixed-engine-setting"
                  className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                >
                  Fixed engine setting
                </Label>
                <Input
                  id="fixed-engine-setting"
                  type="number"
                  value={FIXED_ENGINE_SETTING}
                  disabled
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={2} />
                  )}
                  Save
                </Button>
                {updateMutation.isSuccess && !updateMutation.isPending && (
                  <span className="text-[13px] text-[#166534]">Saved</span>
                )}
                {updateMutation.isError && (
                  <span className="text-[13px] text-[#dc2626]">
                    {getApiErrorMessage(updateMutation.error, 'Failed to save settings.')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
