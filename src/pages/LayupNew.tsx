import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayupBuilder } from '@/components/LayupBuilder';

type LaminateArchitecture = 'even-symmetrical' | 'odd-symmetrical' | 'asymmetrical';

const LAMINATE_OPTIONS: { value: LaminateArchitecture; label: string }[] = [
  { value: 'even-symmetrical', label: 'Even symmetrical' },
  { value: 'odd-symmetrical', label: 'Odd symmetrical' },
  { value: 'asymmetrical', label: 'Asymmetrical' },
];

interface RadioGroupProps {
  value: LaminateArchitecture | '';
  onChange: (value: LaminateArchitecture) => void;
}

function RadioGroup({ value, onChange }: RadioGroupProps) {
  return (
    <div role="radiogroup" aria-label="Laminate architecture" className="flex flex-col gap-2">
      {LAMINATE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-2 text-left focus:outline-none"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected ? 'border-[#006496]' : 'border-[#cbd5e1]'
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-[#006496]" />}
            </span>
            <span className="text-[14px] leading-5 text-[#0a0a0a]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LayupNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [laminateArchitecture, setLaminateArchitecture] = useState<LaminateArchitecture | ''>('');

  // Sub-toolbar title: name when set, otherwise "New layup"
  const titleText = name.trim() || 'New layup';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      {/* Sub-toolbar */}
      <div className="sticky top-[69px] z-40 h-[52px] w-full border-b border-[#e5e7eb] bg-[#f8fafc]">
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-9">
            <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
              <TabsTrigger
                value="general"
                className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="layup-building"
                className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
              >
                Layup building
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <h1 className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
          {titleText}
        </h1>

        <div className="absolute inset-y-0 right-4 flex items-center">
          <Link
            to="/layup"
            className="inline-flex h-8 items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
          >
            Exit edit mode
            <X className="h-4 w-4 opacity-70" strokeWidth={1.33} />
          </Link>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        {activeTab === 'general' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: persist + navigate. For now, return to the list.
              navigate('/layup');
            }}
            className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          >
            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="layup-name"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Name<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="layup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="layup-description"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Description<span className="text-[#dc2626]">*</span>
              </Label>
              <Textarea
                id="layup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Laminate architecture<span className="text-[#dc2626]">*</span>
              </Label>
              <RadioGroup value={laminateArchitecture} onChange={setLaminateArchitecture} />
            </div>
          </form>
        )}

        {activeTab === 'layup-building' && <LayupBuilder />}
      </main>

      <Footer />
    </div>
  );
}
