import { CadViewer } from '@/components/CadViewer';

export function Game() {
  return (
    <>
      {/* Hero Section */}
      <section className="text-center py-12 px-0">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight tracking-tight">
            Interactive <span className="font-extrabold">Wind Turbine</span> Demo
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Explore a low-poly 3D wind turbine model with real-time blade rotation.
            Control the wind speed and orbit around the turbine to view it from any angle.
          </p>
        </div>
      </section>

      {/* CAD Viewer Section */}
      <section className="my-8 mb-12 h-[500px] md:h-[60vh] max-h-[700px]">
        <CadViewer />
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
        <div className="rounded-lg border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-border/80 hover:shadow-lg">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-muted">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Real-time Animation</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Blades rotate smoothly based on wind speed with optimized 60fps rendering.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-border/80 hover:shadow-lg">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-muted">
            <span className="text-2xl">🔄</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Interactive Camera</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Orbit, pan, and zoom around the turbine to explore every detail.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-border/80 hover:shadow-lg">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-muted">
            <span className="text-2xl">💡</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Dynamic Lighting</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Realistic shadows and lighting create an immersive 3D environment.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-border/80 hover:shadow-lg">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-muted">
            <span className="text-2xl">🎛️</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Wind Control</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Adjust wind speed in real-time to see how it affects blade rotation.
          </p>
        </div>
      </section>
    </>
  );
}
