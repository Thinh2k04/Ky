import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = join(__dirname, 'data', 'contracts.json');
const MAX_BODY_SIZE = 15 * 1024 * 1024;
const SIGN_TITLES = ['CỬA HÀNG', 'NHÂN VIÊN', 'GIÁM SÁT', 'CÔNG TY TNHH THƯƠNG MẠI ĐẠI VIỆT FOOD'];

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const ensureDataFile = async () => {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  try {
    await readFile(DATA_FILE, 'utf8');
  } catch {
    await writeFile(DATA_FILE, '[]\n', 'utf8');
  }
};

const buildSignedDate = (formData) => {
  if (!formData || typeof formData !== 'object') return '';

  const day = typeof formData.ngay === 'string' ? formData.ngay.trim().padStart(2, '0') : '';
  const month = typeof formData.thang === 'string' ? formData.thang.trim().padStart(2, '0') : '';
  const year = typeof formData.nam === 'string' ? formData.nam.trim() : '';

  return [day, month, year].filter(Boolean).join('/');
};

const createTaiKhoan = (savedBy, fallbackId) => {
  const username = typeof savedBy?.username === 'string' ? savedBy.username : 'unknown';
  const displayName = typeof savedBy?.displayName === 'string' ? savedBy.displayName : 'Không rõ';
  const role = savedBy?.role === 'admin' || savedBy?.role === 'contract' ? savedBy.role : 'contract';

  return {
    id: `tk-${fallbackId}`,
    username,
    displayName,
    role,
  };
};

const createCustomer = (payload, fallbackId) => {
  const source = payload?.khachHang ?? payload?.formData ?? payload?.hopDongChiTiet ?? {};

  return {
    id: `kh-${fallbackId}`,
    ten: typeof source.chuCuaHang === 'string' ? source.chuCuaHang : typeof source.ten === 'string' ? source.ten : '',
    cccd: typeof source.cccd === 'string' ? source.cccd : '',
    sdt: typeof source.sdt === 'string' ? source.sdt : '',
    maKhachHang: typeof source.maKhachHang === 'string' ? source.maKhachHang : '',
    diaChi: typeof source.diaChi === 'string' ? source.diaChi : '',
  };
};

const createHopDongChiTiet = (payload, signedDate) => {
  const source = payload?.hopDongChiTiet ?? payload?.formData ?? {};

  return {
    chuCuaHang: typeof source.chuCuaHang === 'string' ? source.chuCuaHang : '',
    cccd: typeof source.cccd === 'string' ? source.cccd : '',
    sdt: typeof source.sdt === 'string' ? source.sdt : '',
    maKhachHang: typeof source.maKhachHang === 'string' ? source.maKhachHang : '',
    diaChi: typeof source.diaChi === 'string' ? source.diaChi : '',
    mucKe: typeof source.mucKe === 'string' ? source.mucKe : '1',
    viTriTrungBay: typeof source.viTriTrungBay === 'string' ? source.viTriTrungBay : '',
    soLuongMauHang: typeof source.soLuongMauHang === 'string' ? source.soLuongMauHang : '',
    tieuChuan: typeof source.tieuChuan === 'string' ? source.tieuChuan : '',
    soKe: typeof source.soKe === 'string' ? source.soKe : '1',
    thoiGianThoaThuan: typeof source.thoiGianThoaThuan === 'string' ? source.thoiGianThoaThuan : '12',
    mucDoanhSo: typeof source.mucDoanhSo === 'string' ? source.mucDoanhSo : '',
    mucThuong: typeof source.mucThuong === 'string' ? source.mucThuong : '',
    signedDate,
  };
};

const createLichSuKyDuyet = (signatures, contractId, savedAtClient) => {
  return signatures.map((signature, index) => ({
    id: `ls-${contractId}-${index + 1}`,
    hopDongId: contractId,
    vaiTro: SIGN_TITLES[index] ?? `Vị trí ${index + 1}`,
    nguoiKy: SIGN_TITLES[index] ?? `Vị trí ${index + 1}`,
    signatureDataUrl: signature || '',
    trangThai: signature ? 'da_ky' : 'trong',
    kyLucAt: savedAtClient,
  }));
};

const asPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value;
};

const sanitizeSavedBy = (savedBy, fallbackId) => {
  if (!savedBy || typeof savedBy !== 'object') {
    return {
      username: 'unknown',
      displayName: 'Khong ro',
      role: 'contract',
      refId: `tk-${fallbackId}`,
    };
  }

  const role = savedBy.role === 'admin' || savedBy.role === 'contract' ? savedBy.role : 'contract';

  return {
    username: typeof savedBy.username === 'string' ? savedBy.username : 'unknown',
    displayName: typeof savedBy.displayName === 'string' ? savedBy.displayName : 'Khong ro',
    role,
    refId: typeof savedBy.id === 'string' ? savedBy.id : `tk-${fallbackId}`,
  };
};

const extractSignatures = (record) => {
  if (Array.isArray(record?.signatures)) {
    return record.signatures.map((signature) => (typeof signature === 'string' ? signature : ''));
  }

  if (Array.isArray(record?.lichSuKyDuyet)) {
    return record.lichSuKyDuyet.map((entry) => (typeof entry?.signatureDataUrl === 'string' ? entry.signatureDataUrl : ''));
  }

  return [];
};

const compactAttachment = (attachment) => {
  const source = asPlainObject(attachment);
  if (!source) {
    return null;
  }

  return {
    fileName: typeof source.fileName === 'string' ? source.fileName : '',
    fileType: typeof source.fileType === 'string' ? source.fileType : '',
    fileUrl: typeof source.fileUrl === 'string' ? source.fileUrl : '',
    uploadedAt: typeof source.uploadedAt === 'string' ? source.uploadedAt : '',
  };
};

const toCompactRecord = (record) => {
  const normalizedId = typeof record?.id === 'string' ? record.id : randomUUID();
  const createdAt = typeof record?.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  const savedAtClient = typeof record?.savedAtClient === 'string' ? record.savedAtClient : null;
  const sourceSavedBy = record?.savedBy ?? record?.taiKhoan ?? record?.nhanVien?.taiKhoan;
  const signatures = extractSignatures(record);

  const attachments = Array.isArray(record?.tepDinhKem)
    ? record.tepDinhKem.map((item) => compactAttachment(item)).filter(Boolean)
    : [];

  return {
    id: normalizedId,
    createdAt,
    savedAtClient,
    savedBy: sanitizeSavedBy(sourceSavedBy, normalizedId),
    formData: asPlainObject(record?.formData),
    hopDongChiTiet: asPlainObject(record?.hopDongChiTiet),
    signatures,
    tepDinhKem: attachments,
  };
};

const normalizeStoredRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const normalizedId = typeof record.id === 'string' ? record.id : randomUUID();
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  const savedAtClient = typeof record.savedAtClient === 'string' ? record.savedAtClient : null;

  if (record.taiKhoan && record.khachHang && record.nhanVien && record.hopDong && record.hopDongChiTiet) {
    return {
      ...record,
      id: normalizedId,
      createdAt,
      savedAtClient,
      lichSuKyDuyet: Array.isArray(record.lichSuKyDuyet) ? record.lichSuKyDuyet : [],
      tepDinhKem: Array.isArray(record.tepDinhKem) ? record.tepDinhKem : [],
      signatures: Array.isArray(record.signatures)
        ? record.signatures
        : Array.isArray(record.lichSuKyDuyet)
          ? record.lichSuKyDuyet.map((entry) => entry.signatureDataUrl || '')
          : [],
    };
  }

  const legacyFormData = record.formData ?? {};
  const signedDate = typeof legacyFormData.signedDate === 'string' ? legacyFormData.signedDate : buildSignedDate(legacyFormData);
  const signatures = Array.isArray(record.signatures) ? record.signatures : [];
  const taiKhoan = createTaiKhoan(record.savedBy, normalizedId);
  const khachHang = createCustomer(record, normalizedId);
  const hopDongChiTiet = createHopDongChiTiet(record, signedDate);
  const hopDongId = `hd-${normalizedId}`;
  const nhanVienId = `nv-${normalizedId}`;
  const khachHangId = `kh-${normalizedId}`;

  return {
    id: normalizedId,
    createdAt,
    savedAtClient,
    taiKhoan,
    khachHang,
    nhanVien: {
      id: nhanVienId,
      taiKhoanId: taiKhoan.id,
      taiKhoan,
      hoTen: taiKhoan.displayName,
    },
    hopDong: {
      id: hopDongId,
      khachHangId,
      nhanVienId,
      signedDate,
      trangThai: signatures.some(Boolean) ? 'da_luu' : 'cho_ky',
    },
    hopDongChiTiet,
    lichSuKyDuyet: createLichSuKyDuyet(signatures, hopDongId, savedAtClient ?? createdAt),
    tepDinhKem: Array.isArray(record.tepDinhKem) ? record.tepDinhKem : [],
    formData: record.formData,
    signatures,
  };
};

const readContracts = async () => {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed.map((record) => normalizeStoredRecord(record)) : [];
};

const writeContracts = async (contracts) => {
  const compacted = contracts.map((record) => toCompactRecord(record));
  await writeFile(DATA_FILE, JSON.stringify(compacted, null, 2), 'utf8');
};

const readBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_SIZE) {
        reject(new Error('Payload quá lớn.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON không hợp lệ.'));
      }
    });

    req.on('error', () => reject(new Error('Không đọc được request body.')));
  });
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { message: 'Request không hợp lệ.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/contracts') {
    try {
      const contracts = await readContracts();
      sendJson(res, 200, { total: contracts.length, items: contracts });
    } catch {
      sendJson(res, 500, { message: 'Không thể đọc dữ liệu.' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/contracts') {
    try {
      const payload = await readBody(req);
      const contracts = await readContracts();
      const record = normalizeStoredRecord({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        savedAtClient: payload?.savedAtClient ?? null,
        savedBy: payload?.savedBy ?? null,
        khachHang: payload?.khachHang ?? null,
        hopDongChiTiet: payload?.hopDongChiTiet ?? null,
        formData: payload?.formData ?? null,
        signatures: Array.isArray(payload?.signatures) ? payload.signatures : [],
        tepDinhKem: Array.isArray(payload?.tepDinhKem) ? payload.tepDinhKem : [],
      });

      contracts.push(record);
      await writeContracts(contracts);

      sendJson(res, 201, { id: record.id, message: 'Lưu dữ liệu thành công.' });
    } catch (error) {
      sendJson(res, 400, { message: error instanceof Error ? error.message : 'Không thể lưu dữ liệu.' });
    }
    return;
  }

  sendJson(res, 404, { message: 'Không tìm thấy endpoint.' });
});

server.listen(PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${PORT}`);
});