import type React from 'react';
import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import AdminDashboard from './Admin/admin';
import ContractDocument from './components/ContractDocument';
import LoginScreen from './login/login';
import { useAdminSession } from './hooks/useAdminSession';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { createInitialContractFormData } from './types/contract';

export default function ThoaThuanTrungBay() {
  const [formData, setFormData] = useState(createInitialContractFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
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

    const normalizedDay = formData.ngay.trim().padStart(2, '0');
    const normalizedMonth = formData.thang.trim().padStart(2, '0');
    const normalizedYear = formData.nam.trim();
    const signedDate = [normalizedDay, normalizedMonth, normalizedYear].filter(Boolean).join('/');

    const { ngay, thang, nam, ...restFormData } = formData;

    const payload = {
      savedBy: session?.user ?? null,
      khachHang: {
        ten: restFormData.chuCuaHang,
        cccd: restFormData.cccd,
        sdt: restFormData.sdt,
        maKhachHang: restFormData.maKhachHang,
        diaChi: restFormData.diaChi,
      },
      hopDongChiTiet: {
        ...restFormData,
        signedDate,
      },
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

  const exportContractToPdf = async () => {
    if (isSaving || isExportingPdf) {
      return;
    }

    const contractElement = document.getElementById('contract');
    if (!contractElement) {
      setSaveMessage('Không tìm thấy nội dung hợp đồng để xuất PDF.');
      return;
    }

    let exportHost: HTMLDivElement | null = null;

    try {
      setIsExportingPdf(true);
      setSaveMessage('Đang tạo PDF...');

      exportHost = document.createElement('div');
      const exportNode = contractElement.cloneNode(true) as HTMLElement;
      exportHost.style.position = 'fixed';
      exportHost.style.left = '-99999px';
      exportHost.style.top = '0';
      exportHost.style.width = `${contractElement.clientWidth || 820}px`;
      exportHost.style.padding = '0';
      exportHost.style.margin = '0';
      exportHost.style.background = '#ffffff';
      exportHost.style.zIndex = '-1';

      exportNode.style.margin = '0';
      exportNode.style.boxShadow = 'none';
      exportNode.style.filter = 'none';
      exportNode.style.background = '#ffffff';

      const mutedNodes = exportNode.querySelectorAll<HTMLElement>('.no-print, .sign-actions, button');
      mutedNodes.forEach((node) => {
        node.style.display = 'none';
      });

      const formFields = exportNode.querySelectorAll<HTMLInputElement>('input');
      formFields.forEach((field) => {
        field.style.background = 'transparent';
      });

      exportHost.appendChild(exportNode);
      document.body.appendChild(exportHost);

      const canvas = await html2canvas(exportNode, {
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const pxPerMm = canvas.width / pageWidth;
      const pageHeightPx = Math.floor(pageHeight * pxPerMm);
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sourceY = pageIndex * pageHeightPx;
        const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const pageContext = pageCanvas.getContext('2d');
        if (!pageContext) {
          throw new Error('Không thể xử lý trang PDF.');
        }

        pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const pageImage = pageCanvas.toDataURL('image/png');
        const renderHeight = (sliceHeight * pageWidth) / canvas.width;
        pdf.addImage(pageImage, 'PNG', 0, 0, pageWidth, renderHeight, undefined, 'FAST');
      }

      const fileName = `hop-dong-${new Date().toISOString().slice(0, 10)}.pdf`;

      const pdfBlob = pdf.output('blob');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Keep URL alive longer for mobile browsers to finish writing the file.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);

      setSaveMessage('Đã xuất PDF thành công.');
    } catch {
      setSaveMessage('Xuất PDF thất bại. Vui lòng thử lại hoặc dùng trình duyệt khác.');
    } finally {
      setIsExportingPdf(false);
      exportHost?.remove();
    }
  };

  const printDocument = () => {
    void exportContractToPdf();
  };

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
        isExportingPdf={isExportingPdf}
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
