import type React from 'react';
import { useState } from 'react';
import AdminDashboard from './Admin/admin';
import ContractDocument from './components/ContractDocument';
import LoginScreen from './login/login';
import { useAdminSession } from './hooks/useAdminSession';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { initialContractFormData } from './types/contract';

export default function ThoaThuanTrungBay() {
  const [formData, setFormData] = useState(initialContractFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const signatures = useSignatureCanvas(4);
  const { session, isAuthenticated, isHydrating, login, logout } = useAdminSession();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveContract = async () => {
    setIsSaving(true);
    setSaveMessage('');

    const payload = {
      formData,
      signatures: signatures.getSignatureDataUrls(),
      savedAtClient: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Không thể lưu dữ liệu.');
      }

      const result = await response.json();
      setSaveMessage(`Đã lưu dữ liệu thành công (Mã: ${result.id}).`);
    } catch (error) {
      setSaveMessage('Lưu dữ liệu thất bại. Kiểm tra backend rồi thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const printDocument = () => window.print();

  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsLoggingIn(true);

    try {
      await login(credentials);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated || !session) {
    if (isHydrating) {
      return (
        <div className="auth-page">
          <div className="auth-shell">
            <section className="auth-card auth-card--loading">
              <p className="eyebrow">Admin Portal</p>
              <h1>Đang tải phiên quản trị...</h1>
              <p className="auth-lead">Vui lòng chờ trong giây lát.</p>
            </section>
          </div>
        </div>
      );
    }

    return <LoginScreen onLogin={handleLogin} isSubmitting={isLoggingIn} />;
  }

  if (session.user.role === 'admin') {
    return <AdminDashboard session={session} onLogout={handleLogout} />;
  }

  return (
    <div className="app-shell">
      <ContractDocument
        formData={formData}
        onInputChange={handleChange}
        onPrint={printDocument}
        onSave={saveContract}
        isSaving={isSaving}
        saveMessage={saveMessage}
        signatures={signatures}
        accountInfo={{
          displayName: session.user.displayName,
          role: session.user.role,
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}
