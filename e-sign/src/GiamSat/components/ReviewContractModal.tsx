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
  signCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isSavingSignature: boolean;
  isSignatureDirty: boolean;
  onClose: () => void;
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
  signCanvasRef,
  isSavingSignature,
  isSignatureDirty,
  onClose,
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

  return (
    <div className="review-contract-modal-backdrop" role="dialog" aria-modal="true" aria-label="Xem và ký hợp đồng">
      <div className="review-contract-modal">
        <div className="review-contract-head">
          <div>
            <p className="eyebrow">Xem và ký hợp đồng</p>
            <h2>{getCustomerName(contract)}</h2>
            <p>Mã KH: {contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || 'Chưa có'} | Mã hợp đồng: {contract.id.slice(0, 8)}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="review-contract-body">
          <section className="detail-block review-detail-full">
            <span>Thông tin khách hàng</span>
            <p>Chủ cửa hàng: {getCustomerName(contract)}</p>
            <p>CCCD: {contract.khachHang?.cccd || contract.formData?.cccd || 'Chưa có'}</p>
            <p>SĐT: {contract.khachHang?.sdt || contract.formData?.sdt || 'Chưa có'}</p>
            <p>Địa chỉ: {contract.khachHang?.diaChi || contract.formData?.diaChi || 'Chưa có'}</p>
            <p>Ngày ký hợp đồng: {signedDateDisplay}</p>
            <p>
              Trạng thái ký {roleConfig.label}:{' '}
              <span className={selectedContractSigned ? 'review-status review-status--done' : 'review-status review-status--pending'}>
                {getReviewStatusText(contract, roleConfig.signIndex)}
              </span>
            </p>
          </section>

          <section className="detail-block review-detail-full">
            <span>Nội dung thỏa thuận trưng bày</span>
            <p>Mức kệ đăng ký: {contractDetail?.mucKe || contract.formData?.mucKe || 'Chưa có'} kệ</p>
            <p>Vị trí trưng bày: {contractDetail?.viTriTrungBay || contract.formData?.viTriTrungBay || 'Chưa có'}</p>
            <p>Số lượng mẫu hàng: {contractDetail?.soLuongMauHang || contract.formData?.soLuongMauHang || 'Chưa có'}</p>
            <p>Tiêu chuẩn mẫu: {contractDetail?.tieuChuan || contract.formData?.tieuChuan || 'Chưa có'}</p>
            <p>Số kệ chương trình: {contractDetail?.soKe || contract.formData?.soKe || 'Chưa có'}</p>
            <p>Thời gian thỏa thuận: {contractDetail?.thoiGianThoaThuan || contract.formData?.thoiGianThoaThuan || 'Chưa có'} tháng</p>
            <p>Mức doanh số: {contractDetail?.mucDoanhSo || contract.formData?.mucDoanhSo || 'Chưa có'}</p>
            <p>Mức thưởng: {contractDetail?.mucThuong || contract.formData?.mucThuong || 'Chưa có'}</p>
          </section>

          <section className="detail-block review-detail-full">
            <span>Trạng thái các chữ ký</span>
            <div className="review-signature-grid">
              {visibleSignatureIndexes.map((index) => {
                const title = SIGN_TITLES[index];
                const signature = getSignatureByIndex(contract, index);
                const isCurrentRole = index === roleConfig.signIndex;

                return (
                  <article
                    key={title}
                    className={`review-signature-card ${isCurrentRole ? 'is-active-role review-signature-card--current' : ''}`}
                  >
                    <p>{title}</p>

                    {isCurrentRole ? (
                      <>
                        <p className="review-signature-help">Bấm vào đúng ô này để ký xác nhận phần {roleConfig.label}.</p>
                        <canvas
                          ref={signCanvasRef}
                          width={920}
                          height={260}
                          className="sign-pad review-sign-pad review-inline-sign-pad"
                          onPointerDown={onPointerDown}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerLeave={onPointerUp}
                          onPointerCancel={onPointerUp}
                        />
                        <div className="toolbar-actions review-sign-actions review-sign-actions-inline">
                          <button type="button" className="ghost-btn" onClick={onClearSignaturePad} disabled={isSavingSignature}>
                            Xóa chữ ký
                          </button>
                          <button type="button" className="save-btn" onClick={() => void onSaveSignature()} disabled={isSavingSignature || !isSignatureDirty}>
                            {isSavingSignature ? 'Đang lưu ký...' : `Xác nhận & lưu ${roleConfig.label}`}
                          </button>
                        </div>
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
          </section>
        </div>
      </div>
    </div>
  );
}
