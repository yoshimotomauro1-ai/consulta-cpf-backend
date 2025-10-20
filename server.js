// server.js (ESM)
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

// === Carrega variáveis de ambiente (.env) ===
dotenv.config();

// __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Configuração ===
const app = express();
const PORT = process.env.PORT || 3000;
const ZOOMEYES_TOKEN = process.env.ZOOMEYES_TOKEN;
const ZOOMEYES_BASE = 'https://api.zoomeyes.dad';

// === Middlewares ===
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// === Healthcheck ===
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// === Rota principal de consulta CPF ===
app.post('/api/consultarCpf', async (req, res) => {
  try {
    console.log('POST /api/consultarCpf body:', req.body);

    const { cpf } = req.body || {};
    if (!cpf || !/^\d{11}$/.test(cpf)) {
      console.warn('CPF inválido recebido:', cpf);
      return res.status(400).json({ error: 'CPF inválido. Envie apenas dígitos (11 números).' });
    }

    if (!ZOOMEYES_TOKEN) {
      console.error('Token ausente no servidor (.env não configurado ou sem ZOOMEYES_TOKEN)');
      return res.status(500).json({ error: 'Token não configurado no servidor.' });
    }

    // 🔄 Tenta dois endpoints possíveis, começando pelo /api/cpf
    const urls = [
      `${ZOOMEYES_BASE}/api/cpf?cpf=${cpf}&token=${ZOOMEYES_TOKEN}`,
      `${ZOOMEYES_BASE}/api/cpfBasic?cpf=${cpf}&token=${ZOOMEYES_TOKEN}`
    ];

    let successData = null;
    for (const url of urls) {
      console.log('Consultando URL externa:', url.replace(ZOOMEYES_TOKEN, '***TOKEN***'));
      const resp = await fetch(url, { method: 'GET' });
      const text = await resp.text();
      console.log('Resposta externa status:', resp.status, 'body:', text);

      if (!resp.ok) {
        console.warn('Falha na consulta externa:', resp.status);
        continue;
      }

      try {
        const json = JSON.parse(text);
        successData = json;
        break;
      } catch (e) {
        console.error('Falha ao parsear JSON da API externa:', e);
      }
    }

    if (!successData) {
      return res.status(502).json({ error: 'Nenhuma resposta válida da API externa' });
    }

    const data = successData;

    // === Normalização ===
    const normalized = {
      CPF: data?.CPF || data?.cpf || data?.documento || cpf,
      NOME:
        data?.NOME || data?.nome || data?.nome_completo ||
        data?.data?.nome || data?.data?.NOME || null,
      NASC:
        data?.NASC || data?.nascimento || data?.data_nascimento ||
        data?.data?.nascimento || null,
      NOME_MAE:
        data?.NOME_MAE || data?.mae || data?.nome_mae ||
        data?.data?.nome_mae || null
    };

    console.log('Normalizado para front:', normalized);
    return res.json(normalized);

  } catch (err) {
    console.error('Erro /api/consultarCpf:', err);
    return res.status(500).json({ error: 'Falha interna no servidor' });
  }
});

// === Fallback: retorna o index.html da raiz ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === Inicia o servidor ===
app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});