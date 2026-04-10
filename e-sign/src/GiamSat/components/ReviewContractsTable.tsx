import type { StoredContractRecord } from '../../types/admin';
import { getCustomerName, hasSignedByRole } from '../../features/review/contracts';

interface ReviewContractsTableProps {
  contracts: StoredContractRecord[];
  selectedId: string | null;
  signIndex: number;
  roleLabel: string;
  formatDateTime: (value: string) => string;
  onOpenReviewModal: (contractId: string) => void;
}

export default function ReviewContractsTable({
  contracts,
  selectedId,
  signIndex,
  roleLabel,
  formatDateTime: formatDate,
  onOpenReviewModal,
}: ReviewContractsTableProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <h2>Danh sách hợp đồng</h2>
        <span>{contracts.length} bản ghi</span>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Cửa hàng</th>
              <th>Mã KH</th>
              <th>Trạng thái {roleLabel}</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => {
              const isSigned = hasSignedByRole(contract, signIndex);

              return (
                <tr
                  key={contract.id}
                  className={contract.id === selectedId ? 'is-selected' : ''}
                  onClick={() => onOpenReviewModal(contract.id)}
                >
                  <td>{formatDate(contract.createdAt)}</td>
                  <td>{getCustomerName(contract)}</td>
                  <td>{contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || 'Chưa có'}</td>
                  <td>
                    <span className={isSigned ? 'review-status review-status--done' : 'review-status review-status--pending'}>
                      {isSigned ? 'Đã ký' : 'Chưa ký'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenReviewModal(contract.id);
                      }}
                    >
                      Xem & ký
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
