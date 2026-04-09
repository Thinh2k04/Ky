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

const readContracts = async () => {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
};

const writeContracts = async (contracts) => {
  await writeFile(DATA_FILE, JSON.stringify(contracts, null, 2), 'utf8');
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
      const formData = payload?.formData;
      const signatures = Array.isArray(payload?.signatures) ? payload.signatures : [];

      if (!formData || typeof formData !== 'object') {
        sendJson(res, 400, { message: 'Thiếu formData.' });
        return;
      }

      const contracts = await readContracts();
      const record = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        formData,
        signatures,
        savedAtClient: payload?.savedAtClient ?? null,
      };

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
