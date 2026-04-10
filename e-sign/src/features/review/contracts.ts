import type { StoredContractRecord } from '../../types/admin';

const isBlankCanvasDataUrl = (value: string) => {
  const signature = value.trim();
  if (!signature.startsWith('data:image/png;base64,')) return false;

  // Legacy blank signature snapshots from 240x160 canvas were persisted as a full PNG string.
  // They should be treated as empty so UI and status are accurate.
  return (
    signature.length <= 2000
    && signature.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACgCAY')
    && signature.endsWith('AAAABklEQVQDACuEAUE/rbBKAAAAAElFTkSuQmCC')
  );
};

const normalizeSignature = (value: unknown) => {
  if (typeof value !== 'string') return '';

  const signature = value.trim();
  if (!signature || isBlankCanvasDataUrl(signature)) {
    return '';
  }

  return signature;
};

export const getCustomerName = (contract: StoredContractRecord) => contract.khachHang?.ten || contract.formData?.chuCuaHang || 'Chưa nhập';

export const getContractDetail = (contract: StoredContractRecord) => contract.hopDongChiTiet ?? null;

export const getSignatureByIndex = (contract: StoredContractRecord, index: number) => {
  const signatureFromArray = Array.isArray(contract.signatures) ? normalizeSignature(contract.signatures[index]) : '';
  if (signatureFromArray) return signatureFromArray;

  const signatureFromHistory = Array.isArray(contract.lichSuKyDuyet) ? normalizeSignature(contract.lichSuKyDuyet[index]?.signatureDataUrl) : '';
  if (signatureFromHistory) return signatureFromHistory;

  return '';
};

export const hasSignedByRole = (contract: StoredContractRecord, index: number) => Boolean(getSignatureByIndex(contract, index).trim());

export const getReviewStatusText = (contract: StoredContractRecord, index: number) => (hasSignedByRole(contract, index) ? 'Đã ký' : 'Chưa ký');

export const sortPendingFirst = (contracts: StoredContractRecord[], signIndex: number) => {
  return [...contracts].sort((first, second) => {
    const firstSigned = hasSignedByRole(first, signIndex);
    const secondSigned = hasSignedByRole(second, signIndex);

    if (firstSigned !== secondSigned) {
      return firstSigned ? 1 : -1;
    }

    return second.createdAt.localeCompare(first.createdAt);
  });
};