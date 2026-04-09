import type { StoredContractRecord } from '../../types/admin';

export const getCustomerName = (contract: StoredContractRecord) => contract.khachHang?.ten || contract.formData?.chuCuaHang || 'Chưa nhập';

export const getContractDetail = (contract: StoredContractRecord) => contract.hopDongChiTiet ?? null;

export const getSignatureByIndex = (contract: StoredContractRecord, index: number) => {
  const signatureFromArray = Array.isArray(contract.signatures) && typeof contract.signatures[index] === 'string' ? contract.signatures[index].trim() : '';
  if (signatureFromArray) return signatureFromArray;

  const signatureFromHistory =
    Array.isArray(contract.lichSuKyDuyet) && typeof contract.lichSuKyDuyet[index]?.signatureDataUrl === 'string'
      ? contract.lichSuKyDuyet[index].signatureDataUrl.trim()
      : '';
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