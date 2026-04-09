import { ROLE_SIGNATURE_INDEXES } from './constants';

export const getRequiredSignatureIndexesByRole = (role: string): number[] => {
  if (role === 'contract') return ROLE_SIGNATURE_INDEXES.contract;
  if (role === 'supervisor') return ROLE_SIGNATURE_INDEXES.supervisor;
  if (role === 'company') return ROLE_SIGNATURE_INDEXES.company;
  return [];
};

export const getMissingSignatureIndexes = (signatureDataUrls: string[], requiredIndexes: number[]) => {
  return requiredIndexes.filter((index) => !signatureDataUrls[index]);
};

export const getMissingSignatureMessage = (role: string) => {
  if (role === 'contract') {
    return 'Nhân viên phải ký đủ phần Cửa hàng và Nhân viên trước khi lưu.';
  }

  if (role === 'supervisor') {
    return 'Giám sát phải ký phần Giám sát trước khi lưu.';
  }

  if (role === 'company') {
    return 'Công ty phải ký phần Công ty trước khi lưu.';
  }

  return 'Thiếu chữ ký bắt buộc theo vai trò hiện tại.';
};