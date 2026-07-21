import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { Nurbs } from '@/pages/Nurbs';
import { Composition } from '@/pages/Composition';
import { CompositionNew } from '@/pages/CompositionNew';
import { Material } from '@/pages/Material';
import { MaterialNew } from '@/pages/MaterialNew';
import { Geometry } from '@/pages/Geometry';
import { GeometryEdit } from '@/pages/GeometryEdit';
import { Layup } from '@/pages/Layup';
import { LayupNew } from '@/pages/LayupNew';
import { LoadGroup } from '@/pages/LoadGroup';
import { LoadGroupNew } from '@/pages/LoadGroupNew';
import { Calculation } from '@/pages/Calculation';
import { CalculationNew } from '@/pages/CalculationNew';
import { Report } from '@/pages/Report';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/material" element={<Material />} />
          <Route path="/material/new" element={<MaterialNew />} />
          <Route path="/material/:id" element={<MaterialNew />} />
          <Route path="/geometry" element={<Geometry />} />
          <Route path="/geometry/:id" element={<GeometryEdit />} />
          <Route path="/layup" element={<Layup />} />
          <Route path="/layup/new" element={<LayupNew />} />
          <Route path="/layup/:id" element={<LayupNew />} />
          <Route path="/composition" element={<Composition />} />
          <Route path="/composition/new" element={<CompositionNew />} />
          <Route path="/composition/:id" element={<CompositionNew />} />
          <Route path="/load-group" element={<LoadGroup />} />
          <Route path="/load-group/new" element={<LoadGroupNew />} />
          <Route path="/load-group/:id" element={<LoadGroupNew />} />
          <Route path="/calculation" element={<Calculation />} />
          <Route path="/calculation/new" element={<CalculationNew />} />
          <Route path="/calculation/:id" element={<CalculationNew />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/nurbs" element={<Nurbs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
