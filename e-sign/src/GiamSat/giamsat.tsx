import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminSession, StoredContractRecord } from '../types/admin';
import { REVIEW_ROLE_CONFIG } from '../features/contracts/constants';
import { getContractDetail, getCustomerName, getSignatureByIndex, hasSignedByRole, sortPendingFirst } from '../features/review/contracts';
import ReviewContractModal from './components/ReviewContractModal';
import ReviewContractsTable from './components/ReviewContractsTable';
import ReviewDashboardHeader from './components/ReviewDashboardHeader';
import ReviewFilters from './components/ReviewFilters';
import ReviewStats from './components/ReviewStats';
import type { ReviewFilter, ReviewRoleConfig } from './types';
import { formatDateTime } from './utils';

interface SignatureReviewDashboardProps {
  session: AdminSession;
  onLogout: () => Promise<void> | void;
}

export default function SignatureReviewDashboard({ session, onLogout }: SignatureReviewDashboardProps) {
  const accountRole = session.user.role === 'company' ? 'company' : 'supervisor';
  const roleConfig: ReviewRoleConfig = REVIEW_ROLE_CONFIG[accountRole];

  const [contracts, setContracts] = useState<StoredContractRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const signCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const blankSignature = useRef('');
  const initialSignature = useRef('');
  const hasNewStroke = useRef(false);
  const [isSignatureDirty, setIsSignatureDirty] = useState(false);

  const loadContracts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts');
      const payload = (await response.json()) as Partial<{ items: StoredContractRecord[]; message: string }>;

      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải danh sách hợp đồng.');
      }

      const items = Array.isArray(payload.items) ? payload.items : [];
      setContracts(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } catch (loadError) {
      const loadMessage = loadError instanceof Error ? loadError.message : 'Không thể tải danh sách hợp đồng.';
      setError(loadMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, []);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const roleFiltered = contracts.filter((contract) => {
      const hasSigned = hasSignedByRole(contract, roleConfig.signIndex);
      if (filter === 'signed') return hasSigned;
      if (filter === 'pending') return !hasSigned;
      return true;
    });

    const queryFiltered = roleFiltered.filter((contract) => {
      const searchable = [
        getCustomerName(contract),
        contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || '',
        contract.khachHang?.sdt || contract.formData?.sdt || '',
        contract.khachHang?.cccd || contract.formData?.cccd || '',
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });

    return sortPendingFirst(query ? queryFiltered : roleFiltered, roleConfig.signIndex);
  }, [contracts, filter, roleConfig.signIndex, search]);

  const selectedContract = useMemo(() => contracts.find((contract) => contract.id === selectedId) ?? null, [contracts, selectedId]);
  const selectedContractSigned = selectedContract ? hasSignedByRole(selectedContract, roleConfig.signIndex) : false;
  const selectedContractDetail = selectedContract ? getContractDetail(selectedContract) : null;

  const pendingCount = useMemo(() => contracts.filter((contract) => !hasSignedByRole(contract, roleConfig.signIndex)).length, [contracts, roleConfig.signIndex]);
  const signedCount = useMemo(() => contracts.filter((contract) => hasSignedByRole(contract, roleConfig.signIndex)).length, [contracts, roleConfig.signIndex]);

  const setupCanvas = () => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#111827';
    blankSignature.current = canvas.toDataURL('image/png');
  };

  useEffect(() => {
    setupCanvas();
  }, []);

  useEffect(() => {
    if (!isReviewModalOpen) return;

    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    hasNewStroke.current = false;
    setIsSignatureDirty(false);

    const existingSignature = selectedContract ? getSignatureByIndex(selectedContract, roleConfig.signIndex) : '';
    initialSignature.current = existingSignature;
    if (!existingSignature) {
      blankSignature.current = canvas.toDataURL('image/png');
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = existingSignature;
  }, [isReviewModalOpen, roleConfig.signIndex, selectedContract]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReviewModalOpen(false);
      }
    };

    if (isReviewModalOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isReviewModalOpen]);

  const getPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPointer(event);

    if (!canvas || !context || !point) return;

    isDrawing.current = true;
    hasNewStroke.current = true;
    setIsSignatureDirty(true);
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const context = signCanvasRef.current?.getContext('2d');
    const point = getPointer(event);
    if (!context || !point) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignaturePad = () => {
    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    blankSignature.current = canvas.toDataURL('image/png');
    hasNewStroke.current = true;
    setIsSignatureDirty(false);
  };

  const openReviewModal = (contractId: string) => {
    setSelectedId(contractId);
    setIsReviewModalOpen(true);
    setMessage('');
    setError('');
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    isDrawing.current = false;
    setIsSignatureDirty(false);
  };

  const saveSignature = async () => {
    if (!selectedContract) {
      setMessage('Hãy chọn hợp đồng cần ký.');
      return;
    }

    const canvas = signCanvasRef.current;
    if (!canvas) {
      setMessage('Không tìm thấy vùng ký.');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    if (!signatureDataUrl || signatureDataUrl === blankSignature.current) {
      setMessage(`Vui lòng ký vào phần ${roleConfig.label} trước khi lưu.`);
      return;
    }

    if (!hasNewStroke.current || signatureDataUrl === initialSignature.current) {
      setMessage(`Chưa có chữ ký mới cho phần ${roleConfig.label}. Vui lòng ký tay rồi lưu.`);
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xác nhận và lưu chữ ký cho phần ${roleConfig.label} không?`);
    if (!confirmed) {
      setMessage('Đã hủy lưu chữ ký.');
      return;
    }

    setIsSavingSignature(true);
    setMessage('');
    setError('');

    try {
      let response = await fetch(`/api/contracts/${selectedContract.id}/signatures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureIndex: roleConfig.signIndex,
          signatureDataUrl,
          signer: session.user.displayName,
        }),
      });

      // Fallback for environments/proxies that do not pass PATCH correctly.
      if (response.status === 404 || response.status === 405) {
        response = await fetch('/api/contracts/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: selectedContract.id,
            signatureIndex: roleConfig.signIndex,
            signatureDataUrl,
            signer: session.user.displayName,
          }),
        });
      }

      const payload = (await response.json()) as Partial<{ message: string }>;
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu chữ ký.');
      }

      setMessage('Đã lưu chữ ký thành công.');
      await loadContracts();
      setFilter('all');
      setSelectedId(selectedContract.id);
      hasNewStroke.current = false;
      setIsSignatureDirty(false);
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : 'Không thể lưu chữ ký.';
      setError(saveMessage);
    } finally {
      setIsSavingSignature(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <ReviewDashboardHeader
          roleLabel={roleConfig.label}
          displayName={session.user.displayName}
          isLoading={isLoading}
          isSavingSignature={isSavingSignature}
          onReload={() => {
            void loadContracts();
          }}
          onLogout={onLogout}
        />

        <ReviewStats total={contracts.length} signedCount={signedCount} pendingCount={pendingCount} roleLabel={roleConfig.label} />

        <ReviewFilters filter={filter} search={search} onFilterChange={setFilter} onSearchChange={setSearch} />

        {error ? <p className="panel-message panel-message--error">{error}</p> : null}
        {message ? <p className="panel-message">{message}</p> : null}
        {!error && isLoading ? <p className="panel-message">Đang tải danh sách hợp đồng...</p> : null}

        {!isLoading && filteredContracts.length === 0 ? <p className="panel-message">Không có hợp đồng phù hợp với bộ lọc hiện tại.</p> : null}

        {!isLoading && filteredContracts.length > 0 ? (
          <ReviewContractsTable
            contracts={filteredContracts}
            selectedId={selectedId}
            signIndex={roleConfig.signIndex}
            roleLabel={roleConfig.label}
            formatDateTime={formatDateTime}
            onOpenReviewModal={openReviewModal}
          />
        ) : null}

        <ReviewContractModal
          isOpen={isReviewModalOpen}
          contract={selectedContract}
          contractDetail={selectedContractDetail}
          roleConfig={roleConfig}
          selectedContractSigned={selectedContractSigned}
          signCanvasRef={signCanvasRef}
          isSavingSignature={isSavingSignature}
          isSignatureDirty={isSignatureDirty}
          onClose={closeReviewModal}
          onClearSignaturePad={clearSignaturePad}
          onSaveSignature={saveSignature}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrawing}
        />
      </div>
    </div>
  );
}
