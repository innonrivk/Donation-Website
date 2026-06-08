import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import CMSWebsiteContent from '../components/admin/CMSWebsiteContent';
import CMSDonationBoxes from '../components/admin/CMSDonationBoxes';
import CMSTiers from '../components/admin/CMSTiers';
import CMSMilestones from '../components/admin/CMSMilestones';
import CMSTransactions from '../components/admin/CMSTransactions';
import './AdminDashboardPage.css';

/**
 * AdminDashboardPage — Master layout for administrative dashboard.
 * Separates sections utilizing React Router nesting for seamless page state retention.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboardPage() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <Routes>
          <Route path="/" element={<CMSWebsiteContent />} />
          <Route path="/donation-boxes" element={<CMSDonationBoxes />} />
          <Route path="/tiers" element={<CMSTiers />} />
          <Route path="/milestones" element={<CMSMilestones />} />
          <Route path="/transactions" element={<CMSTransactions />} />
        </Routes>
      </main>
    </div>
  );
}
