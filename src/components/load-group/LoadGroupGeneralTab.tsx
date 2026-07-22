import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LoadGroupGeneralTabProps {
  isNew: boolean;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function LoadGroupGeneralTab({
  isNew,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: LoadGroupGeneralTabProps) {
  return (
    <div className={isNew ? 'relative min-h-[500px]' : ''}>
      {/* Form card — relative z-10 so it floats above the absolute explainer */}
      <div className={`flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] ${isNew ? 'relative z-10 w-full max-w-[468px]' : 'w-full max-w-[468px]'}`}>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="load-group-name"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            Name <span className="text-[#dc2626]">*</span>
          </Label>
          <Input
            id="load-group-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name the load group"
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="load-group-description"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            Description <span className="text-[#dc2626]">*</span>
          </Label>
          <Textarea
            id="load-group-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the load group"
            rows={4}
            className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
      </div>

      {/* Canvas explainer — absolute overlay, centered across full page width */}
      {isNew && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-1">
          <div className="pointer-events-auto flex w-[500px] flex-col gap-5">
          {/* Description text */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
              <p className="text-[14px] leading-6 text-[#374151]">
                A load group is a collection of one or several load cases which can be used to form fatigue cases and fatigue profiles.
              </p>
            </div>
            <p className="ml-6 text-[14px] leading-5 text-[#737373]">
              Fatigue profiles are only required for fatigue simulation.
            </p>
          </div>

          {/* Structure diagram — hugs content, centered within the 500px column */}
          <div className="mx-auto w-fit rounded-[16px] border border-[#e5e7eb] bg-[#f9fafb] p-5">
            <div className="flex flex-col gap-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
                Load Group
              </p>
              <div className="flex items-start gap-5">
                {/* Load cases column */}
                <div className="flex flex-col gap-1.5">
                  {['Load case 1', 'Load case 2', 'Load case 3', 'Load case 4', 'Load case 5', 'Load case 6', 'Load case 7'].map((lc) => (
                    <div
                      key={lc}
                      className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]"
                    >
                      {lc}
                    </div>
                  ))}
                </div>

                {/* Fatigue profiles column */}
                <div className="flex flex-col gap-2.5">
                  {[
                    {
                      name: 'Fatigue profile 1',
                      cases: [
                        { lc: 'Load case 1', fc: 'Fatigue case 1' },
                        { lc: 'Load case 2', fc: 'Fatigue case 2' },
                      ],
                    },
                    {
                      name: 'Fatigue profile 2',
                      cases: [
                        { lc: 'Load case 1', fc: 'Fatigue case 1' },
                        { lc: 'Load case 1', fc: 'Fatigue case 2' },
                        { lc: 'Load case 6', fc: 'Fatigue case 3' },
                      ],
                    },
                  ].map((profile) => (
                    <div
                      key={profile.name}
                      className="rounded-[10px] border border-[#e5e7eb] bg-white p-3"
                    >
                      <p className="mb-2 whitespace-nowrap text-[12px] font-semibold text-[#0a0a0a]">
                        {profile.name}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {profile.cases.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]">
                              {c.lc}
                            </span>
                            <span className="text-[11px] text-[#6b7280]">→</span>
                            <span className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]">
                              {c.fc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
