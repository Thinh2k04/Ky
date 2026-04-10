import type React from 'react';
import { SIGN_TITLES } from '../../features/contracts/constants';
import { getCustomerName, getReviewStatusText, getSignatureByIndex } from '../../features/review/contracts';
import type { HopDongChiTietRecord, StoredContractRecord } from '../../types/admin';
import type { ReviewRoleConfig } from '../types';

interface ReviewContractModalProps {
  isOpen: boolean;
  contract: StoredContractRecord | null;
  contractDetail: HopDongChiTietRecord | null;
  roleConfig: ReviewRoleConfig;
  selectedContractSigned: boolean;
  isSignatureModalOpen: boolean;
  signCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isSavingSignature: boolean;
  isSignatureDirty: boolean;
  onClose: () => void;
  onOpenSignatureModal: () => void;
  onCloseSignatureModal: () => void;
  onClearSignaturePad: () => void;
  onSaveSignature: () => Promise<void>;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

export default function ReviewContractModal({
  isOpen,
  contract,
  contractDetail,
  roleConfig,
  selectedContractSigned,
  isSignatureModalOpen,
  signCanvasRef,
  isSavingSignature,
  isSignatureDirty,
  onClose,
  onOpenSignatureModal,
  onCloseSignatureModal,
  onClearSignaturePad,
  onSaveSignature,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: ReviewContractModalProps) {
  if (!isOpen || !contract) {
    return null;
  }

  const visibleSignatureIndexes = roleConfig.signIndex === 2 ? [0, 1, 2] : [0, 1, 2, 3];
  const signedDateFromRecord = contractDetail?.signedDate || contract.hopDong?.signedDate || '';
  const signedDateDisplay = (() => {
    if (signedDateFromRecord.trim()) {
      return signedDateFromRecord;
    }

    const fallbackDateRaw = contract.savedAtClient || contract.createdAt || '';
    if (!fallbackDateRaw) {
      return 'Chưa có';
    }

    const parsedDate = new Date(fallbackDateRaw);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Chưa có';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
  })();

  const customerName = getCustomerName(contract);
  const signData = {
    chuCuaHang: contract.khachHang?.ten || contract.formData?.chuCuaHang || contractDetail?.chuCuaHang || 'Chưa nhập',
    cccd: contract.khachHang?.cccd || contract.formData?.cccd || contractDetail?.cccd || 'Chưa có',
    sdt: contract.khachHang?.sdt || contract.formData?.sdt || contractDetail?.sdt || 'Chưa có',
    maKhachHang: contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || contractDetail?.maKhachHang || 'Chưa có',
    diaChi: contract.khachHang?.diaChi || contract.formData?.diaChi || contractDetail?.diaChi || 'Chưa có',
    mucKe: contractDetail?.mucKe || contract.formData?.mucKe || '1',
    viTriTrungBay: contractDetail?.viTriTrungBay || contract.formData?.viTriTrungBay || 'Chưa có',
    soLuongMauHang: contractDetail?.soLuongMauHang || contract.formData?.soLuongMauHang || 'Chưa có',
    tieuChuan: contractDetail?.tieuChuan || contract.formData?.tieuChuan || 'Chưa có',
    soKe: contractDetail?.soKe || contract.formData?.soKe || '1',
    thoiGianThoaThuan: contractDetail?.thoiGianThoaThuan || contract.formData?.thoiGianThoaThuan || '12',
    mucDoanhSo: contractDetail?.mucDoanhSo || contract.formData?.mucDoanhSo || 'Chưa có',
    mucThuong: contractDetail?.mucThuong || contract.formData?.mucThuong || 'Chưa có',
  };

  return (
    <div className="review-contract-modal-backdrop" role="dialog" aria-modal="true" aria-label="Xem và ký hợp đồng">
      <div className="review-contract-modal">
        <div className="review-contract-head">
          <div>
            <p className="eyebrow">Xem và ký hợp đồng</p>
            <h2>{customerName}</h2>
            <p>Mã KH: {contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || 'Chưa có'} | Mã hợp đồng: {contract.id.slice(0, 8)}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="review-contract-scroll">
          <div className="review-contract-sheet">
            <div className="review-contract-paper-body">
              <div className="header-row review-contract-header-row">
                <div>
                  <p className="paragraph bold">CÔNG TY TNHH THƯƠNG MẠI</p>
                  <p className="paragraph company-name">ĐẠI VIỆT FOOD</p>
                </div>
                <div className="center nation-box">
                  <p className="paragraph bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="paragraph bold">Độc lập - Tự do - Hạnh phúc</p>
                  <p className="paragraph date-row">Hà Nội, ngày <span className="review-inline-text">{signedDateDisplay === 'Chưa có' ? '__' : signedDateDisplay.slice(0, 2)}</span> tháng <span className="review-inline-text">{signedDateDisplay === 'Chưa có' ? '__' : signedDateDisplay.slice(3, 5)}</span> năm <span className="review-inline-text">{signedDateDisplay === 'Chưa có' ? '____' : signedDateDisplay.slice(6)}</span></p>
                </div>
              </div>

              <h1 className="title review-contract-title">THỎA THUẬN TRƯNG BÀY SẢN PHẨM</h1>

              <p className="paragraph with-gap">Kính gửi: Quý khách hàng</p>
              <p className="paragraph with-gap">Lời đầu tiên Công ty TNHH Thương Mại Đại Việt Food xin cảm ơn quý khách hàng đã hợp tác với chúng tôi.</p>

              <p className="paragraph bold">Nội dung thỏa thuận trưng bày như sau:</p>

              <div className="section review-contract-section">
                <p className="paragraph">
                  Bên Công Ty cho bên cửa hàng mượn kệ trưng bày giới thiệu hàng hóa, sản phẩm đồ ăn vặt <span className="bold">Ăn Cùng Bà Tuyết</span> với các yêu cầu cụ thể sau:
                </p>

                <div className="review-contract-lines">
                  <div className="review-contract-line">
                    <span>1. Chủ cửa hàng:</span>
                    <strong>{signData.chuCuaHang}</strong>
                    <span>CCCD:</span>
                    <strong>{signData.cccd}</strong>
                    <span>SĐT:</span>
                    <strong>{signData.sdt}</strong>
                  </div>
                  <div className="review-contract-line review-contract-line--wide">
                    <span>Mã khách hàng:</span>
                    <strong>{signData.maKhachHang}</strong>
                    <span>Địa chỉ:</span>
                    <strong>{signData.diaChi}</strong>
                  </div>
                  <div className="review-contract-line">
                    <span>Mức kệ đăng ký:</span>
                    <strong>{signData.mucKe}</strong>
                    <span>kệ</span>
                  </div>
                  <div className="review-contract-line review-contract-line--wide">
                    <span>2. Hàng hóa trưng bày tại các địa điểm, vị trí:</span>
                    <strong>{signData.viTriTrungBay}</strong>
                  </div>
                  <div className="review-contract-line review-contract-line--wide">
                    <span>3. Số lượng mẫu hàng là:</span>
                    <strong>{signData.soLuongMauHang}</strong>
                    <span>đảm bảo các tiêu chuẩn:</span>
                    <strong>{signData.tieuChuan}</strong>
                  </div>
                  <div className="review-contract-line review-contract-line--wide">
                    <p className="review-contract-paragraph">
                      4. Kệ là tài sản của công ty cho cửa hàng mượn để trưng bày, trường hợp nếu cửa hàng không trưng bày, bày bán sản phẩm của thương hiệu{' '}
                      <span className="bold">Ăn Cùng Bà Tuyết</span>, kệ sẽ được công ty thu hồi lại.
                      <br />
                      Bắt buộc có chụp ảnh chấm điểm trưng bày từng tháng trên hệ thống DMS.
                    </p>
                  </div>
                  <div className="review-contract-line review-contract-line--wide">
                    <span>5. Thù lao dịch vụ và thanh toán:</span>
                  </div>
                </div>

                <div className="reward-table-wrap">
                  <table className="reward-table review-reward-table">
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
                        <td>{signData.soKe} kệ Bà Tuyết/1 cửa hàng</td>
                        <td>{signData.thoiGianThoaThuan} tháng</td>
                        <td>{signData.mucDoanhSo}</td>
                        <td>{signData.mucThuong}</td>
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

              <p className="thanks">Rất mong nhận được sự ủng hộ nhiều hơn nữa từ Quý khách hàng!<br />Xin trân trọng cảm ơn!</p>

              <div className="review-signature-grid review-signature-grid--paper">
                {visibleSignatureIndexes.map((index) => {
                  const title = SIGN_TITLES[index];
                  const signature = getSignatureByIndex(contract, index);
                  const isCurrentRole = index === roleConfig.signIndex;
                  const hasSignature = Boolean(signature);

                  return (
                    <article
                      key={title}
                      className={`review-signature-card ${isCurrentRole ? 'is-active-role review-signature-card--current' : ''}`}
                    >
                      <p>{title}</p>

                      {isCurrentRole ? (
                        <>
                          <p className="review-signature-help">Bấm vào ô này để ký xác nhận phần {roleConfig.label}.</p>
                          <div className={`review-signature-preview ${hasSignature ? 'has-signature' : 'is-empty'}`}>
                            {hasSignature ? <img src={signature} alt={`Chữ ký ${title}`} /> : <span>Chưa có chữ ký</span>}
                          </div>
                          <button type="button" className="review-signature-open-btn" onClick={onOpenSignatureModal}>
                            {hasSignature ? `Ký lại ${roleConfig.label}` : `Ký ${roleConfig.label}`}
                          </button>
                        </>
                      ) : signature ? (
                        <img src={signature} alt={`Chữ ký ${title}`} />
                      ) : (
                        <div className="signature-empty">Chưa ký</div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {isSignatureModalOpen ? (
          <div className="signature-modal-backdrop no-print" role="dialog" aria-modal="true" aria-label="Ký xác nhận phần giám sát">
            <div className="signature-modal">
              <div className="signature-modal-head">
                <h3>Ký tên: {roleConfig.label}</h3>
                <p>Vẽ chữ ký trong khung lớn rồi bấm Xác nhận để lưu.</p>
              </div>

              <div className="signature-modal-canvas-wrap">
                <canvas
                  ref={signCanvasRef}
                  width={920}
                  height={430}
                  className="signature-modal-canvas"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </div>

              <div className="signature-modal-actions">
                <button type="button" className="ghost-btn" onClick={onClearSignaturePad} disabled={isSavingSignature}>
                  Xóa nét ký
                </button>
                <button type="button" className="ghost-btn" onClick={onCloseSignatureModal} disabled={isSavingSignature}>
                  Hủy
                </button>
                <button type="button" className="save-btn" onClick={() => void onSaveSignature()} disabled={!isSignatureDirty || isSavingSignature}>
                  {isSavingSignature ? 'Đang lưu ký...' : 'Xác nhận chữ ký'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
