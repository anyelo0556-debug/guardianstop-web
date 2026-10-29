import { Routes, Route } from "react-router";
import HomePage from "@/pages/HomePage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import BrokerPanel from "@/pages/BrokerPanel";
import Dashboard from "@/pages/Dashboard";
import PrivacyPage from "@/pages/PrivacyPage";
import ArchitecturePage from "@/pages/ArchitecturePage";
import AdminDashboard from "@/sections/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      <Route path="/panel" element={<BrokerPanel />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
