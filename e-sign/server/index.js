import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import mongoose from 'mongoose';
import { Contract } from './models/Contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/esign';
const MAX_BODY_SIZE = 15 * 1024 * 1024;

// Kết nối MongoDB
await mongoose.connect(MONGO_URI);
console.log(`Đã kết nối MongoDB: ${MONGO_URI}`);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
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
      const contracts = await Contract.find().sort({ createdAt: -1 }).lean();
      sendJson(res, 200, { total: contracts.length, items: contracts });
    } catch {
      sendJson(res, 500, { message: 'Không thể đọc dữ liệu.' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/contracts') {
    try {
      const payload = await readBody(req);
      const formData = payload?.formData;
      const signatures = Array.isArray(payload?.signatures) ? payload.signatures : [];

      if (!formData || typeof formData !== 'object') {
        sendJson(res, 400, { message: 'Thiếu formData.' });
        return;
      }

      const record = await Contract.create({
        formData,
        signatures,
        savedAtClient: payload?.savedAtClient ?? null,
      });

      sendJson(res, 201, { id: record._id, message: 'Lưu dữ liệu thành công.' });
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
