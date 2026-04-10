import type React from 'react';
import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import AdminDashboard from './Admin/admin';
import SignatureReviewDashboard from './GiamSat/giamsat';
import ContractDocument from './components/ContractDocument';
import LoginScreen from './login/login';
import { useAdminSession } from './hooks/useAdminSession';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { SIGN_TITLES } from './features/contracts/constants';
import { buildContractSavePayload } from './features/contracts/payload';
import { validateContractFormData } from './features/contracts/validation';
import { createInitialContractFormData } from './types/contract';

export default function ThoaThuanTrungBay() {
  const [formData, setFormData] = useState(createInitialContractFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isSignatureSyncing, setIsSignatureSyncing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentContractId, setCurrentContractId] = useState('');
  const signatures = useSignatureCanvas(4);
  const { session, isAuthenticated, isHydrating, login, logout } = useAdminSession();

  const resetContractDraft = () => {
    setFormData(createInitialContractFormData());
    for (let index = 0; index < 4; index += 1) {
      signatures.clearSignature(index);
    }
    setCurrentContractId('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const runSaveContract = async () => {
    const signaturesData = signatures.getSignatureDataUrls();

    setIsSaving(true);
    setSaveMessage('');

    const payload = buildContractSavePayload({
      formData,
      sessionUser: session?.user,
      signatures: signaturesData,
    });

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
      setCurrentContractId(typeof result?.id === 'string' ? result.id : '');
      setSaveMessage('');
      resetContractDraft();
    } catch (error) {
      setSaveMessage('Lưu dữ liệu thất bại. Kiểm tra backend rồi thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveContract = async () => {
    const currentRole = session?.user.role;

    if (currentRole === 'contract') {
      const validationError = validateContractFormData(formData);
      if (validationError) {
        setSaveMessage(validationError);
        return;
      }
    }

    setIsSaveConfirmOpen(true);
  };

  const confirmSaveContract = () => {
    setIsSaveConfirmOpen(false);
    void runSaveContract();
  };

  const cancelSaveContract = () => {
    setIsSaveConfirmOpen(false);
    setSaveMessage('Đã hủy lưu hợp đồng.');
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

  const syncSignatureToApi = async (index: number, signatureDataUrl: string) => {
    let response = await fetch(`/api/contracts/${currentContractId}/signatures`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signatureIndex: index,
        signatureDataUrl,
        signer: session?.user.displayName || '',
      }),
    });

    if (response.status === 404 || response.status === 405) {
      response = await fetch('/api/contracts/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: currentContractId,
          signatureIndex: index,
          signatureDataUrl,
          signer: session?.user.displayName || '',
        }),
      });
    }

    const payload = (await response.json()) as Partial<{ message: string }>;
    if (!response.ok) {
      throw new Error(payload.message || 'Không thể lưu chữ ký vào dữ liệu ký.');
    }
  };

  const removeSignatureFromApi = async (index: number) => {
    let response = await fetch(`/api/contracts/${currentContractId}/signatures/${index}`, {
      method: 'DELETE',
    });

    if (response.status === 404 || response.status === 405) {
      response = await fetch('/api/contracts/signatures/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: currentContractId,
          signatureIndex: index,
        }),
      });
    }

    const payload = (await response.json()) as Partial<{ message: string }>;
    if (!response.ok) {
      throw new Error(payload.message || 'Không thể xóa chữ ký khỏi dữ liệu ký.');
    }
  };

  const handleConfirmSignature = async (index: number) => {
    const signaturesData = signatures.getSignatureDataUrls();
    const signatureDataUrl = typeof signaturesData[index] === 'string' ? signaturesData[index].trim() : '';
    const signatureTitle = SIGN_TITLES[index] || `Vị trí ${index + 1}`;

    if (!currentContractId) {
      setSaveMessage(`Đã xác nhận chữ ký ${signatureTitle}.`);
      return true;
    }

    setIsSignatureSyncing(true);
    setSaveMessage('');

    try {
      await syncSignatureToApi(index, signatureDataUrl);
      setSaveMessage(`Đã lưu chữ ký ${signatureTitle} vào dữ liệu ký.`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lưu chữ ký thất bại.';
      setSaveMessage(message);
      return false;
    } finally {
      setIsSignatureSyncing(false);
    }
  };

  const handleClearSignature = async (index: number) => {
    const signatureTitle = SIGN_TITLES[index] || `Vị trí ${index + 1}`;

    if (!currentContractId) {
      setSaveMessage(`Đã xóa chữ ký ${signatureTitle} trên form.`);
      return true;
    }

    setIsSignatureSyncing(true);
    setSaveMessage('');

    try {
      await removeSignatureFromApi(index);
      setSaveMessage(`Đã xóa dữ liệu chữ ký ${signatureTitle}.`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa chữ ký thất bại.';
      setSaveMessage(message);
      return false;
    } finally {
      setIsSignatureSyncing(false);
    }
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

  if (session.user.role === 'supervisor' || session.user.role === 'company') {
    return <SignatureReviewDashboard session={session} onLogout={handleLogout} />;
  }

  return (
    <div className="app-shell">
      <ContractDocument
        formData={formData}
        onInputChange={handleChange}
        onPrint={printDocument}
        onSave={saveContract}
        onConfirmSignature={handleConfirmSignature}
        onClearSignature={handleClearSignature}
        isSaving={isSaving}
        isSignatureSyncing={isSignatureSyncing}
        isExportingPdf={isExportingPdf}
        saveMessage={saveMessage}
        signatures={signatures}
        accountInfo={{
          displayName: session.user.displayName,
          role: session.user.role,
        }}
        onLogout={handleLogout}
      />

      {isSaveConfirmOpen ? (
        <div className="contract-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận lưu hợp đồng">
          <div className="contract-confirm-card">
            <p className="contract-confirm-eyebrow">Xác nhận lưu</p>
            <h3>Bạn có muốn lưu hợp đồng này không?</h3>
            <p>Dữ liệu hợp đồng và chữ ký hiện tại sẽ được ghi vào hệ thống.</p>
            <div className="contract-confirm-actions">
              <button type="button" className="ghost-btn" onClick={cancelSaveContract}>
                Hủy
              </button>
              <button type="button" className="save-btn" onClick={confirmSaveContract}>
                Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
