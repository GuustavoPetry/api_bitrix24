const axios = require("axios");

// === CONFIGURAÇÕES ==";
const WEBHOOK = "";
const SOURCE_DEAL_ID = 12345; // ID do negócio que será migrado
const TARGET_CATEGORY_ID = 24; // pipeline de destino
const TARGET_STAGE_ID = ""; // primeira etapa do funil destino
const CLOSE_STAGE_ID = ""; // etapa usada para fechar o negócio original

// === FUNÇÕES AUXILIARES === //

// Busca todos os campos do negócio original
async function getDeal(id) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.get.json`;
  const res = await axios.post(url, { id });
  return res.data.result;
}

// Busca os produtos do negócio
async function getDealProducts(id) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.productrows.get.json`;
  const res = await axios.post(url, { id });
  return res.data.result;
}

// Cria o novo negócio
async function createDeal(fields) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.add.json`;
  const res = await axios.post(url, { fields });
  return res.data.result;
}

// Adiciona produtos ao novo negócio
async function setDealProducts(id, products) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.productrows.set.json`;
  const res = await axios.post(url, { id, rows: products });
  return res.data.result;
}

// Fecha o negócio original
async function closeDeal(id, stageId) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.update.json`;
  const res = await axios.post(url, { id, fields: { STAGE_ID: stageId } });
  return res.data.result;
}

// Adiciona comentário no histórico
async function addComment(entityId, text) {
  const url = `${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.timeline.comment.add.json`;
  const res = await axios.post(url, {
    fields: {
      ENTITY_ID: entityId,
      ENTITY_TYPE: "deal",
      COMMENT: text,
    },
  });
  return res.data.result;
}

// === PROCESSO PRINCIPAL === //
async function processMove() {
  try {
    console.log(`🔍 Buscando negócio ${SOURCE_DEAL_ID}...`);
    const deal = await getDeal(SOURCE_DEAL_ID);

    if (!deal) {
      console.error("❌ Negócio não encontrado.");
      return;
    }

    console.log(`📦 Buscando produtos vinculados...`);
    const products = await getDealProducts(SOURCE_DEAL_ID);

    // Remove campos de sistema que não podem ser copiados
    const excluded = [
      "ID",
      "DATE_CREATE",
      "DATE_MODIFY",
      "STAGE_ID",
      "CATEGORY_ID",
      "CLOSED",
      "BEGINDATE",
      "CLOSEDATE",
      "ADDITIONAL_INFO",
    ];

    const newDealData = {};
    for (const [key, value] of Object.entries(deal)) {
      if (!excluded.includes(key)) newDealData[key] = value;
    }

    // Define a nova pipeline e a primeira etapa
    newDealData.CATEGORY_ID = TARGET_CATEGORY_ID;
    newDealData.STAGE_ID = TARGET_STAGE_ID;
    newDealData.TITLE = `${deal.TITLE} (migrado)`;

    console.log(`🚀 Criando novo negócio na pipeline ${TARGET_CATEGORY_ID}...`);
    const newDealId = await createDeal(newDealData);
    console.log(`✅ Novo negócio criado: ID ${newDealId}`);

    if (products?.length) {
      console.log(`📦 Copiando ${products.length} produtos...`);
      await setDealProducts(newDealId, products);
    }

    console.log(`🔒 Fechando o negócio original (${SOURCE_DEAL_ID})...`);
    await closeDeal(SOURCE_DEAL_ID, CLOSE_STAGE_ID);

    console.log(`🗒️ Adicionando comentário de histórico...`);
    await addComment(
      SOURCE_DEAL_ID,
      `Negócio migrado automaticamente para outra pipeline (novo ID: ${newDealId}).`
    );

    console.log(`✅ Migração concluída com sucesso.`);
  } catch (err) {
    console.error("❌ Erro durante a migração:", err.response?.data || err.message);
  }
}

processMove();
