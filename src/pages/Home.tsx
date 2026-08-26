import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { useMaterialList } from '@/hooks/api/useMaterials';
import { useGeometryList } from '@/hooks/api/useGeometry';
import { useCompositionList } from '@/hooks/api/useComposition';
import { useLoadGroupList } from '@/hooks/api/useLoadGroups';
import { useProjectList } from '@/hooks/api/useProjects';

interface RecentItemProps {
  name: string;
  category: string;
  to: string;
}

function RecentItem({ name, category, to }: RecentItemProps) {
  return (
    <div className="flex h-16 items-center justify-between rounded-[14px] border border-[#e5e7eb] bg-white pl-6 pr-3 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[14px] font-medium text-[#0a0a0a]">{name}</span>
        <span className="shrink-0 text-[#d1d5db]">·</span>
        <span className="shrink-0 text-[13px] text-[#6b7280]">{category}</span>
      </div>
      <Link
        to={to}
        state={{ from: '/' }}
        aria-label={`Open ${name}`}
        className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f1f5f9]"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}

interface RecentEntry {
  id: string;
  name: string;
  category: string;
  to: string;
  updatedAt: number;
}

function toTimestamp(date: string | undefined): number {
  if (!date) return 0;
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function Home() {
  const { data: materials } = useMaterialList();
  const { data: geometries } = useGeometryList();
  const { data: compositions } = useCompositionList();
  const { data: loadGroups } = useLoadGroupList();
  const { data: projects } = useProjectList();

  const recentItems = useMemo<RecentEntry[]>(() => {
    const entries: RecentEntry[] = [
      ...(materials ?? []).map((m) => ({
        id: `material-${m.id}`,
        name: m.name,
        category: 'Material',
        to: `/material/${m.id}`,
        updatedAt: toTimestamp(m.last_modified),
      })),
      ...(geometries ?? []).map((g) => ({
        id: `geometry-${g.id}`,
        name: g.name,
        category: 'Geometry',
        to: `/geometry/${g.id}`,
        updatedAt: toTimestamp(g.last_modified),
      })),
      ...(compositions ?? []).map((c) => ({
        id: `composition-${c.id}`,
        name: c.name,
        category: 'Composition',
        to: `/composition/${c.id}`,
        updatedAt: toTimestamp(c.last_modified ?? c.created_at),
      })),
      ...(loadGroups ?? []).map((l) => ({
        id: `load-group-${l.id}`,
        name: l.name,
        category: 'Load group',
        to: `/load-group/${l.id}`,
        updatedAt: toTimestamp(l.last_modified ?? l.created_at),
      })),
      ...(projects ?? []).map((p) => ({
        id: `calculation-${p.uuid}`,
        name: p.name,
        category: 'Calculation',
        to: `/calculation/${p.uuid}`,
        updatedAt: toTimestamp(p.last_modified),
      })),
    ];
    return entries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);
  }, [materials, geometries, compositions, loadGroups, projects]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16 xl:px-[160px]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-[60px]">
          {/* Recently edited */}
          <section className="flex flex-col gap-12">
            <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Recently edited</h2>
            <div className="-mt-[20px] grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-2">
              {recentItems.map((item) => (
                <RecentItem key={item.id} name={item.name} category={item.category} to={item.to} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
