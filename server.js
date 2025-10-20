// --------------------------
// Servidor Consulta CPF - Render.com
// --------------------------

import express from "express";
import fetch from "node-fetch";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

// --------------------
// Configuração inicial
// --------------------
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ZOOMEYES_TOKEN = process.env.ZOOMEYES_TOKEN;
const ZOOMEYES_API = "https://api.zoomeyes.dad/api/cpf";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --------------------
// Rotas
// --------------------

// Teste rápido (saúde do servidor)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Consulta CPF
app.post("/api/consultarCpf", async (req, res) => {
  try {
    const { cpf } = req.body || {};

    if (!cpf || !/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ error: "CPF inválido." });
    }

    if (!ZOOMEYES_TOKEN) {
      return res
        .status(500)
        .json({ error: "Token não configurado no servidor (.env)." });
    }

    const url = `${ZOOMEYES_API}?cpf=${cpf}&token=${ZOOMEYES_TOKEN}`;

    console.log("✅ Consulta realizada em:", url);

    const r = await fetch(url);
    const text = await r.text();

    console.log("📦 Resposta da API Zoomeyes:", text);

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Falha na resposta da API Zoomeyes",
        status: r.status,
        body: text,
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res
        .status(502)
        .json({ error: "Erro ao converter resposta da API", raw: text });
    }

    // 🔄 Normaliza campos pra enviar ao frontend
    const resposta = {
      CPF: data?.CPF || data?.cpf || cpf,
      NOME: data?.NOME || data?.nome || data?.data?.nome || "Não disponível",
      NASC:
        data?.NASC ||
        data?.nascimento ||
        data?.data?.nascimento ||
        "Não disponível",
      NOME_MAE:
        data?.NOME_MAE ||
        data?.mae ||
        data?.data?.mae ||
        "Não disponível",
    };

    res.json(resposta);
  } catch (err) {
    console.error("❌ Erro interno no servidor:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ----------------------
// Inicialização
// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado em Render na porta ${PORT}`);
  console.log("Token está presente?", Boolean(ZOOMEYES_TOKEN));
});
