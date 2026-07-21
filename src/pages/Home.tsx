import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';

interface AddNewCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  to: string;
}

function AddNewCard({ title, description, buttonLabel, to }: AddNewCardProps) {
  return (
    <div className="flex h-[150px] flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-[6px] px-6 pt-6">
        <h3 className="text-[16px] font-semibold leading-none text-[#0a0a0a]">{title}</h3>
        <p className="text-[14px] leading-5 text-[#6b7280]">{description}</p>
      </div>
      <div className="mt-auto px-6 pb-6">
        <Link
          to={to}
          className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}

interface RecentItemProps {
  name: string;
  to: string;
}

function RecentItem({ name, to }: RecentItemProps) {
  return (
    <div className="flex h-16 items-center justify-between rounded-[14px] border border-[#e5e7eb] bg-white pl-6 pr-3 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <span className="text-[14px] font-medium text-[#0a0a0a]">{name}</span>
      <Link
        to={to}
        aria-label={`Open ${name}`}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f1f5f9]"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}

interface NewsCardProps {
  title: string;
  description: string;
}

function NewsCard({ title, description }: NewsCardProps) {
  return (
    <div className="flex h-[170px] flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-[6px] px-6 pt-6">
        <h3 className="text-[16px] font-semibold leading-none text-[#0a0a0a]">{title}</h3>
        <p className="text-[14px] leading-5 text-[#6b7280]">{description}</p>
      </div>
      <div className="mt-auto px-6 pb-6">
        <Button
          variant="outline"
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          Read more
        </Button>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16 xl:px-[160px]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-[60px]">
          {/* Add new */}
          <section className="flex flex-col gap-12">
            <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Add new</h2>
            <div className="-mt-[20px] grid grid-cols-1 gap-4 md:grid-cols-3">
              <AddNewCard
                title="Geometry"
                description="Create a blade geometry from a template or from scratch"
                buttonLabel="New geometry"
                to="/geometry?new=1"
              />
              <AddNewCard
                title="Composition"
                description="Add materials to any geometry"
                buttonLabel="New composition"
                to="/composition/new"
              />
              <AddNewCard
                title="Calculation"
                description="Start a new calculation based on existing compositions and load groups"
                buttonLabel="New calculation"
                to="/calculation/new"
              />
            </div>
          </section>

          {/* Recently edited */}
          <section className="flex flex-col gap-12">
            <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Recently edited</h2>
            <div className="-mt-[20px] grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-2">
              <RecentItem name="Wind_turbine_blade1" to="/composition" />
              <RecentItem name="Wind_turbine_aero_only_calc" to="/calculation" />
              <RecentItem name="Micro_turbine_blade_08365" to="/composition" />
              <RecentItem name="Comp_x87jl6" to="/composition" />
              <RecentItem name="Honeycomb_core_0203" to="/composition" />
              <RecentItem name="Test_blade_12" to="/composition" />
            </div>
          </section>

          {/* What's new */}
          <section className="flex flex-col gap-12">
            <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">
              What&rsquo;s new in F24?
            </h2>
            <div className="-mt-[20px] grid grid-cols-1 gap-4 md:grid-cols-3">
              <NewsCard
                title="12 new material added"
                description="The default material library now has 12 new materials, all vacuum infused glass fiber polyesters."
              />
              <NewsCard
                title="Gas turbine blade templates"
                description="With the new templates and calculation models you can design gas turbine blades faster in F24."
              />
              <NewsCard
                title="Spars in wind turbine blades"
                description="From now on, you can define spars, add materials to them and use them in calculation."
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
