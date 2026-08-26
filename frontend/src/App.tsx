import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CreateServer from "./pages/CreateServer";
import ServerLayout from "./pages/ServerLayout";
import Overview from "./pages/Overview";
import ConsolePage from "./pages/ConsolePage";
import FilesPage from "./pages/FilesPage";
import BackupsPage from "./pages/BackupsPage";
import AddonsPage from "./pages/AddonsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateServer />} />
        <Route path="/server/:serverId" element={<ServerLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="console" element={<ConsolePage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="backups" element={<BackupsPage />} />
          <Route path="addons" element={<AddonsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
