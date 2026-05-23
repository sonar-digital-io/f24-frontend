import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { Calculation } from '@/pages/Calculation';
import { Report } from '@/pages/Report';
import { Settings } from '@/pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/material" element={<Material />} />
          <Route path="/material/new" element={<MaterialNew />} />
          <Route path="/geometry" element={<Geometry />} />
          <Route path="/geometry/:id" element={<GeometryEdit />} />
          <Route path="/layup" element={<Layup />} />
          <Route path="/layup/new" element={<LayupNew />} />
          <Route path="/composition" element={<Composition />} />
          <Route path="/composition/new" element={<CompositionNew />} />
          <Route path="/load-group" element={<LoadGroup />} />
          <Route path="/calculation" element={<Calculation />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/nurbs" element={<Nurbs />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
