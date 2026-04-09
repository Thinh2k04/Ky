import type { ContractFormData } from '../../types/contract';
import {
  CONTRACT_FIELD_LABELS,
  NUMERIC_CONTRACT_FIELDS,
  REQUIRED_CONTRACT_FIELDS,
} from './constants';

const isDigitsOnly = (value: string) => /^\d+$/.test(value.trim());
const toTrimmedNumber = (value: string) => Number.parseInt(value.trim(), 10);

const isValidCalendarDate = (day: number, month: number, year: number) => {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const validateContractFormData = (formData: ContractFormData): string | null => {
  for (const field of REQUIRED_CONTRACT_FIELDS) {
    if (!formData[field].trim()) {
      return `Vui lòng nhập ${CONTRACT_FIELD_LABELS[field]}.`;
    }
  }

  for (const field of NUMERIC_CONTRACT_FIELDS) {
    if (!isDigitsOnly(formData[field])) {
      return `${CONTRACT_FIELD_LABELS[field]} chỉ được chứa chữ số.`;
    }
  }

  if (formData.cccd.trim().length !== 12) {
    return 'CCCD phải gồm đúng 12 chữ số.';
  }

  if (!/^0\d{9}$/.test(formData.sdt.trim())) {
    return 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';
  }

  const day = toTrimmedNumber(formData.ngay);
  const month = toTrimmedNumber(formData.thang);
  const year = toTrimmedNumber(formData.nam);

  if (day < 1 || day > 31) {
    return 'Ngày phải trong khoảng từ 1 đến 31.';
  }

  if (month < 1 || month > 12) {
    return 'Tháng phải trong khoảng từ 1 đến 12.';
  }

  if (year < 1900 || year > 2100) {
    return 'Năm phải trong khoảng từ 1900 đến 2100.';
  }

  if (!isValidCalendarDate(day, month, year)) {
    return 'Ngày ký không hợp lệ.';
  }

  const positiveFields: Array<{ key: keyof ContractFormData; min: number; max?: number }> = [
    { key: 'mucKe', min: 1, max: 100 },
    { key: 'soLuongMauHang', min: 1, max: 100000 },
    { key: 'soKe', min: 1, max: 100 },
    { key: 'thoiGianThoaThuan', min: 1, max: 120 },
    { key: 'mucDoanhSo', min: 1 },
    { key: 'mucThuong', min: 1 },
  ];

  for (const rule of positiveFields) {
    const value = toTrimmedNumber(formData[rule.key]);

    if (value < rule.min) {
      return `${CONTRACT_FIELD_LABELS[rule.key]} phải lớn hơn hoặc bằng ${rule.min}.`;
    }

    if (typeof rule.max === 'number' && value > rule.max) {
      return `${CONTRACT_FIELD_LABELS[rule.key]} phải nhỏ hơn hoặc bằng ${rule.max}.`;
    }
  }

  if (formData.chuCuaHang.trim().length < 2) {
    return 'Chủ cửa hàng phải có ít nhất 2 ký tự.';
  }

  if (formData.diaChi.trim().length < 5) {
    return 'Địa chỉ phải có ít nhất 5 ký tự.';
  }

  if (formData.viTriTrungBay.trim().length < 2) {
    return 'Vị trí trưng bày phải có ít nhất 2 ký tự.';
  }

  if (!/^\d{5}$/.test(formData.maKhachHang.trim())) {
    return 'Mã khách hàng phải gồm đúng 5 chữ số.';
  }

  return null;
};