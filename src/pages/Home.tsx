import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { BackgroundScene } from '@/components/BackgroundScene';

function NavigationMenu() {
  const menuItems = [
    { label: 'Home', hasDropdown: false },
    { label: 'Material', hasDropdown: true },
    { label: 'Geometry', hasDropdown: true },
    { label: 'Layup', hasDropdown: true },
    { label: 'Composition', hasDropdown: true, active: true },
    { label: 'Calculation', hasDropdown: false },
    { label: 'Report', hasDropdown: false },
    { label: 'Settings', hasDropdown: false },
  ];
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      {menuItems.map((item) => (
        <div
          key={item.label}
          className={`content-stretch flex gap-[4px] h-[36px] items-center justify-center px-[16px] py-[8px] relative rounded-[8px] shrink-0 ${
            item.active ? 'bg-[#eef9ff]' : ''
          }`}
        >
          <div className="flex flex-col font-['Geist',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[#0a0a0a] text-[14px] whitespace-nowrap">
            <p className="leading-[20px]">{item.label}</p>
          </div>
          {item.hasDropdown && (
            <ChevronDown className="shrink-0 size-[12px]" strokeWidth={1.33} />
          )}
        </div>
      ))}
    </div>
  );
}

function TopNavigation() {
  return (
    <div className="bg-white content-stretch flex items-center justify-between pr-[16px] relative shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
      <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
        <div className="content-stretch flex h-[56px] items-center overflow-clip px-[16px] relative shrink-0">
          <div className="flex flex-col font-['Geist',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#181c20] text-[20px] whitespace-nowrap">
            <p className="leading-[28px]">F24 logo</p>
          </div>
        </div>
        <NavigationMenu />
      </div>
      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
        <UserIcon className="shrink-0 size-[24px]" strokeWidth={2} />
        <p className="font-['Geist',sans-serif] font-medium leading-[20px] relative shrink-0 text-[#181c20] text-[14px] whitespace-nowrap">
          econ9@econ.com
        </p>
      </div>
    </div>
  );
}

function TabsSection() {
  return (
    <div className="content-stretch flex flex-wrap items-center justify-between gap-4 px-[16px] py-[8px] relative shrink-0 w-full bg-transparent pointer-events-none">
      <Tabs defaultValue="general" className="bg-[#f3f4f6] h-[36px] p-[3px] rounded-[10px] pointer-events-auto">
        <TabsList className="h-full bg-transparent p-0 gap-0">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] px-[8px] py-[4px] rounded-[8px] h-full font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="geometry"
            className="data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] px-[8px] py-[4px] rounded-[8px] h-full font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a] gap-[8px]"
          >
            Geometry
            <Badge className="bg-[#dc2626] text-[#fef2f2] h-[20px] min-w-[20px] px-[4px] rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] font-['Geist',sans-serif] font-semibold text-[12px] hover:bg-[#dc2626]">
              !
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="layup"
            className="data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] px-[8px] py-[4px] rounded-[8px] h-full font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]"
          >
            Layup mapping
          </TabsTrigger>
          <TabsTrigger
            value="transversal"
            className="data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] px-[8px] py-[4px] rounded-[8px] h-full font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]"
          >
            Transversal mapping
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col font-['Geist',sans-serif] font-semibold justify-center leading-[0] relative shrink-0 text-[18px] text-black whitespace-nowrap hidden lg:block pointer-events-auto">
        <p className="leading-[28px]">New composition: Wind_turbine_2026</p>
      </div>
      <div className="content-stretch flex flex-col items-end relative shrink-0 pointer-events-auto">
        <Button
          variant="secondary"
          size="sm"
          className="bg-[#f1f5f9] h-[32px] px-[12px] py-[8px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] gap-[8px] font-['Geist',sans-serif] font-medium text-[12px] text-[#171717] hover:bg-[#e2e8f0]"
        >
          Exit edit mode
          <X className="size-[16px] opacity-70" strokeWidth={1.33} />
        </Button>
      </div>
    </div>
  );
}

function FormSection() {
  const [solidCore, setSolidCore] = useState(false);
  return (
    <div className="relative shrink-0 w-full py-4">
      <div className="content-stretch flex flex-col items-start px-[16px] relative w-full">
        <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[14px] shrink-0 border border-[#e5e7eb] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full max-w-[468px]">
          {/* Name Input */}
          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full max-w-[420px]">
            <Label className="font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]">
              Name*
            </Label>
            <Input
              defaultValue="Wind_turbine_2026"
              className="h-[36px] w-full bg-white rounded-[8px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-[12px] py-[4px] font-['Geist',sans-serif] font-normal text-[14px] text-[#0a0a0a]"
            />
          </div>
          {/* Description Textarea */}
          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full max-w-[420px]">
            <Label className="font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]">
              Description*
            </Label>
            <Textarea
              placeholder="Placeholder"
              className="h-[76px] min-h-[60px] w-full bg-white rounded-[8px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-[12px] py-[8px] font-['Geist',sans-serif] font-normal text-[14px] text-[#6b7280] resize-none"
            />
          </div>
          {/* Solid Core Checkbox and Select Material */}
          <div className="content-stretch flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative shrink-0 w-full max-w-[420px]">
            <div className="flex items-center gap-[8px]">
              <Checkbox
                id="solid-core"
                checked={solidCore}
                onCheckedChange={(checked) => setSolidCore(checked as boolean)}
                className="size-[16px] rounded-[4px] border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
              />
              <Label
                htmlFor="solid-core"
                className="font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a] cursor-pointer"
              >
                Solid core
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-[32px] bg-white px-[12px] py-[8px] rounded-[8px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] gap-[8px] opacity-50 font-['Geist',sans-serif] font-medium text-[12px] text-[#0a0a0a]"
            >
              Select material
              <ChevronRight className="size-[16px]" strokeWidth={1.33} />
            </Button>
          </div>
          {/* Target Weight Input */}
          <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full max-w-[420px]">
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
              <Label className="font-['Geist',sans-serif] font-medium text-[14px] text-[#0a0a0a]">
                Target weight (kg)
              </Label>
              <Input
                placeholder="Placeholder"
                className="h-[36px] w-full bg-white rounded-[8px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-[12px] py-[4px] font-['Geist',sans-serif] font-normal text-[14px] text-[#6b7280]"
              />
            </div>
            <div className="flex flex-col font-['Geist',sans-serif] font-normal justify-center leading-[0] min-w-full relative shrink-0 text-[#6b7280] text-[14px] w-[min-content]">
              <p className="leading-[20px]">
                Helper text: explain why is it important to add the target weight and what are the risks of a miscalculated weight
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewSwitch({ options, value, onChange }: { options: [string, string]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-[#e5e7eb] p-[3px] flex">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors font-['Geist',sans-serif] ${
            value === opt
              ? 'bg-white shadow-sm text-[#0a0a0a]'
              : 'text-[#6b7280] hover:text-[#0a0a0a]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function Home() {
  const [viewMode, setViewMode] = useState('Perspective');
  const [renderMode, setRenderMode] = useState('Material');

  return (
    <div className="bg-[#f8fafc] flex flex-col min-h-screen w-full">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-[#fc0] via-[#72b84c] via-50% to-[#007dbb] h-[13px] shrink-0 w-full" />

      {/* Top Navigation */}
      <TopNavigation />

      {/* Main content with 3D background */}
      <div className="flex-1 relative overflow-hidden">
        {/* 3D Background */}
        <BackgroundScene wireframe={renderMode === 'Wireframe'} />

        {/* Tabs Section — floating over 3D, pointer-events only on interactive children */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <TabsSection />
        </div>

        {/* Form overlay — pointer-events-none so 3D controls work through empty areas */}
        <div className="absolute inset-0 overflow-y-auto pointer-events-none pt-[60px]">
          <div className="pointer-events-auto inline-block">
            <FormSection />
          </div>
        </div>

        {/* Bottom view switches */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3 pointer-events-auto">
          <ViewSwitch
            options={['Perspective', 'Separate']}
            value={viewMode}
            onChange={setViewMode}
          />
          <ViewSwitch
            options={['Material', 'Wireframe']}
            value={renderMode}
            onChange={setRenderMode}
          />
        </div>
      </div>
    </div>
  );
}
