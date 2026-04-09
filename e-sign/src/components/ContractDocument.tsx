import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { ContractFormData } from '../types/contract';

interface SignatureHandlers {
  setCanvasRef: (index: number, element: HTMLCanvasElement | null) => void;
  startDrawing: (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, index: number) => void;
  draw: (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, index: number) => void;
  stopDrawing: () => void;
  clearSignature: (index: number) => void;
}

interface ContractDocumentProps {
  formData: ContractFormData;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveMessage: string;
  signatures: SignatureHandlers;
  accountInfo: {
    displayName: string;
    role: string;
  };
  onLogout: () => void;
}

const SIGN_TITLES = [
  'CỬA HÀNG',
  'NHÂN VIÊN',
  'GIÁM SÁT',
  'CÔNG TY TNHH THƯƠNG MẠI ĐẠI VIỆT FOOD',
] as const;

export default function ContractDocument({
  formData,
  onInputChange,
  onPrint,
  onSave,
  isSaving,
  saveMessage,
  signatures,
  accountInfo,
  onLogout,
}: ContractDocumentProps) {
  const roleLabel = accountInfo.role === 'contract' ? 'Nhân viên hợp đồng' : accountInfo.role;
  const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isModalDrawing = useRef(false);
  const [activeSignIndex, setActiveSignIndex] = useState<number | null>(null);

  const getModalPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handleModalPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = modalCanvasRef.current;
    const point = getModalPoint(event);
    if (!canvas || !point) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    isModalDrawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handleModalPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isModalDrawing.current) return;

    const canvas = modalCanvasRef.current;
    const point = getModalPoint(event);
    if (!canvas || !point) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopModalDrawing = () => {
    isModalDrawing.current = false;
  };

  const clearModalCanvas = () => {
    const canvas = modalCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const openSignatureModal = (index: number) => {
    setActiveSignIndex(index);
  };

  const closeSignatureModal = () => {
    setActiveSignIndex(null);
    stopModalDrawing();
  };

  const confirmSignature = () => {
    if (activeSignIndex === null) return;

    const modalCanvas = modalCanvasRef.current;
    const previewCanvas = previewCanvasRefs.current[activeSignIndex];
    const previewContext = previewCanvas?.getContext('2d');

    if (!modalCanvas || !previewCanvas || !previewContext) {
      closeSignatureModal();
      return;
    }

    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.drawImage(modalCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    closeSignatureModal();
  };

  useEffect(() => {
    if (activeSignIndex === null) return;

    const modalCanvas = modalCanvasRef.current;
    const previewCanvas = previewCanvasRefs.current[activeSignIndex];
    if (!modalCanvas) return;

    const context = modalCanvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#111827';

    if (previewCanvas) {
      context.drawImage(previewCanvas, 0, 0, modalCanvas.width, modalCanvas.height);
    }
  }, [activeSignIndex]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSignatureModal();
      }
    };

    if (activeSignIndex !== null) {
      window.addEventListener('keydown', onEscape);
    }

    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [activeSignIndex]);

  return (
    <div className="page-shell">
      <div className="shell-inner">
        <div className="contract-account-card no-print">
          <div className="contract-account-main">
            <div className="contract-account-avatar" aria-hidden="true">
              {accountInfo.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="contract-account-meta">
              <p className="contract-account-title">Phiên đăng nhập hiện tại</p>
              <p className="contract-account-name">{accountInfo.displayName}</p>
              <div className="contract-account-badges">
                <span className="contract-role-badge">{roleLabel}</span>
                <span className="contract-status-badge">Đang hoạt động</span>
              </div>
            </div>
          </div>

          <button type="button" className="contract-logout-btn" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>

        <div className="toolbar no-print">
          <div className="toolbar-actions">
            <button onClick={onSave} className="save-btn" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu dữ liệu'}
            </button>
            <button onClick={onPrint} className="print-btn">In / Xuất PDF</button>
          </div>
          {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
        </div>

        <div id="contract" className="contract-sheet">
          <div className="paper-body">
            <div className="header-row">
              <div>
                <p className="paragraph bold">CÔNG TY TNHH THƯƠNG MẠI</p>
                <p className="paragraph company-name">ĐẠI VIỆT FOOD</p>
              </div>
              <div className="center nation-box">
                <p className="paragraph bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="paragraph bold">Độc lập - Tự do - Hạnh phúc</p>
                <p className="paragraph date-row">
                  Hà Nội, ngày{' '}
                  <input type="text" name="ngay" value={formData.ngay} onChange={onInputChange} className="input-underline w-10 center" />{' '}
                  tháng{' '}
                  <input type="text" name="thang" value={formData.thang} onChange={onInputChange} className="input-underline w-10 center" />{' '}
                  năm{' '}
                  <input type="text" name="nam" value={formData.nam} onChange={onInputChange} className="input-underline w-16 center" />
                </p>
              </div>
            </div>

            <h1 className="title">THỎA THUẬN TRƯNG BÀY SẢN PHẨM</h1>

            <p className="paragraph with-gap">Kính gửi: Quý khách hàng</p>
            <p className="paragraph with-gap">
              Lời đầu tiên Công ty TNHH Thương Mại Đại Việt Food xin cảm ơn quý khách hàng đã hợp tác với chúng tôi.
            </p>

            <p className="paragraph bold">Nội dung thỏa thuận trưng bày như sau:</p>

            <div className="section">
              <p className="paragraph">
                Bên Công Ty cho bên cửa hàng mượn kệ trưng bày giới thiệu hàng hóa, sản phẩm đồ ăn vặt{' '}
                <span className="bold">Ăn Cùng Bà Tuyết</span> với các yêu cầu cụ thể sau:
              </p>

              <div>
                1. Chủ cửa hàng:{' '}
                <input type="text" name="chuCuaHang" value={formData.chuCuaHang} onChange={onInputChange} className="input-underline w-80" />
                {' '}CCCD:{' '}
                <input type="text" name="cccd" value={formData.cccd} onChange={onInputChange} className="input-underline w-52" />
                {' '}SĐT:{' '}
                <input type="text" name="sdt" value={formData.sdt} onChange={onInputChange} className="input-underline w-52" />
                <br />
                Mã khách hàng:{' '}
                <input type="text" name="maKhachHang" value={formData.maKhachHang} onChange={onInputChange} className="input-underline w-80" />
                {' '}Địa chỉ:{' '}
                <input type="text" name="diaChi" value={formData.diaChi} onChange={onInputChange} className="input-underline w-480" />
                <br />
                Mức kệ đăng ký:{' '}
                <input type="text" name="mucKe" value={formData.mucKe} onChange={onInputChange} className="input-underline w-20 center" /> kệ
              </div>

              <div>
                2. Hàng hóa trưng bày tại các địa điểm, vị trí:{' '}
                <input type="text" name="viTriTrungBay" value={formData.viTriTrungBay} onChange={onInputChange} className="input-underline w-75p" />
              </div>

              <div>
                3. Số lượng mẫu hàng là:{' '}
                <input type="text" name="soLuongMauHang" value={formData.soLuongMauHang} onChange={onInputChange} className="input-underline w-52" />{' '}
                đảm bảo các tiêu chuẩn:{' '}
                <input type="text" name="tieuChuan" value={formData.tieuChuan} onChange={onInputChange} className="input-underline w-55p" />
              </div>

              <div className="justify">
                4. Kệ là tài sản của công ty cho cửa hàng mượn để trưng bày, trường hợp nếu cửa hàng không trưng bày, bày bán sản phẩm của thương hiệu{' '}
                <span className="bold">Ăn Cùng Bà Tuyết</span>, kệ sẽ được công ty thu hồi lại.
                <br />
                Bắt buộc có chụp ảnh chấm điểm trưng bày từng tháng trên hệ thống DMS.
              </div>

              <div>
                <p className="paragraph bold">5. Thù lao dịch vụ và thanh toán:</p>
                <div className="reward-table-wrap">
                  <table className="reward-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm chính</th>
                        <th>Chương trình khuyến mãi</th>
                        <th>Thời gian thỏa thuận</th>
                        <th>Mức doanh số mua vào/tháng</th>
                        <th>Mức thưởng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Kệ sắt Bà Tuyết</td>
                        <td>
                          <input type="text" name="soKe" value={formData.soKe} onChange={onInputChange} className="input-underline w-16 center" /> kệ Bà Tuyết/1 cửa hàng
                        </td>
                        <td>
                          <input type="text" name="thoiGianThoaThuan" value={formData.thoiGianThoaThuan} onChange={onInputChange} className="input-underline w-16 center" /> tháng
                        </td>
                        <td>
                          <input type="text" name="mucDoanhSo" value={formData.mucDoanhSo} onChange={onInputChange} className="input-underline w-100 center" />
                        </td>
                        <td>
                          <input type="text" name="mucThuong" value={formData.mucThuong} onChange={onInputChange} className="input-underline w-100 center" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="paragraph note">
                  Hàng hóa
                  <br />
                  • Thời gian thanh toán hàng hóa thưởng trưng bày sẽ được chi trả theo tháng (Hàng hóa trả thưởng là 24 gói bim 5k).
                </p>
              </div>
            </div>

            <p className="thanks">
              Rất mong nhận được sự ủng hộ nhiều hơn nữa từ Quý khách hàng!
              <br />
              Xin trân trọng cảm ơn!
            </p>

            <div className="sign-grid">
              {SIGN_TITLES.map((title, index) => (
                <div key={title} className="sign-item">
                  <p className="sign-title">{title}</p>
                  <canvas
                    ref={(element) => {
                      previewCanvasRefs.current[index] = element;
                      signatures.setCanvasRef(index, element);
                    }}
                    width={240}
                    height={160}
                    className="sign-pad sign-pad-preview"
                  />
                  <div className="sign-actions no-print">
                    <button type="button" onClick={() => openSignatureModal(index)} className="sign-open-btn">Ký</button>
                    <button type="button" onClick={() => signatures.clearSignature(index)} className="clear-btn">Xóa ký</button>
                  </div>
                  <p className="hint">(Ký và ghi rõ họ tên)</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeSignIndex !== null ? (
          <div className="signature-modal-backdrop no-print" role="dialog" aria-modal="true">
            <div className="signature-modal">
              <div className="signature-modal-head">
                <h3>Ký tên: {SIGN_TITLES[activeSignIndex]}</h3>
                <p>Vẽ chữ ký trong khung lớn rồi bấm Xác nhận để lưu.</p>
              </div>

              <div className="signature-modal-canvas-wrap">
                <canvas
                  ref={modalCanvasRef}
                  width={920}
                  height={430}
                  className="signature-modal-canvas"
                  onPointerDown={handleModalPointerDown}
                  onPointerMove={handleModalPointerMove}
                  onPointerUp={stopModalDrawing}
                  onPointerLeave={stopModalDrawing}
                  onPointerCancel={stopModalDrawing}
                />
              </div>

              <div className="signature-modal-actions">
                <button type="button" className="ghost-btn" onClick={clearModalCanvas}>Xóa nét ký</button>
                <button type="button" className="ghost-btn" onClick={closeSignatureModal}>Hủy</button>
                <button type="button" className="save-btn" onClick={confirmSignature}>Xác nhận chữ ký</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
