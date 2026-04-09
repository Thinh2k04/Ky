import mongoose from 'mongoose';

const ContractSchema = new mongoose.Schema({
  formData: {
    chuCuaHang:       { type: String, default: '' },
    cccd:             { type: String, default: '' },
    sdt:              { type: String, default: '' },
    maKhachHang:      { type: String, default: '' },
    diaChi:           { type: String, default: '' },
    mucKe:            { type: String, default: '1' },
    viTriTrungBay:    { type: String, default: '' },
    soLuongMauHang:   { type: String, default: '' },
    tieuChuan:        { type: String, default: '' },
    soKe:             { type: String, default: '1' },
    thoiGianThoaThuan:{ type: String, default: '12' },
    mucDoanhSo:       { type: String, default: '' },
    mucThuong:        { type: String, default: '' },
    ngay:             { type: String, default: '' },
    thang:            { type: String, default: '' },
    nam:              { type: String, default: '' },
  },
  signatures:    { type: [String], default: [] },
  savedAtClient: { type: String, default: null },
  createdAt:     { type: Date, default: Date.now },
});

export const Contract = mongoose.model('Contract', ContractSchema);