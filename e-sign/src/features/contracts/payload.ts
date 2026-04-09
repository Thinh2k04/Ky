import type { AdminUser } from '../../types/admin';
import type { ContractFormData } from '../../types/contract';

interface BuildContractSavePayloadArgs {
  formData: ContractFormData;
  sessionUser: AdminUser | null | undefined;
  signatures: string[];
  savedAtClient?: string;
}

export const buildContractSavePayload = ({ formData, sessionUser, signatures, savedAtClient = new Date().toISOString() }: BuildContractSavePayloadArgs) => {
  const { ngay, thang, nam, ...restFormData } = formData;
  const signedDate = [ngay.trim().padStart(2, '0'), thang.trim().padStart(2, '0'), nam.trim()].filter(Boolean).join('/');

  return {
    savedBy: sessionUser ?? null,
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
    signatures,
    savedAtClient,
  };
};