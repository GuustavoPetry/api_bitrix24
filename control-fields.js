const axios = require("axios");

// Configurações
const WEBHOOK_URL = "";
const CATEGORY_ID = 27;

// Campos personalizados
const pipelineAnterior = "UF_CRM_1759489538";
const etapaAnterior = "UF_CRM_1759425630";
const dataFechamento = "UF_CRM_1759427112";

// Cache de títulos para não chamar API a cada card
let pipelineCache = {};
let stageCache = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Buscar título do pipeline
async function getPipelineTitle(categoryId) {
  if (pipelineCache[categoryId]) return pipelineCache[categoryId];

  const response = await axios.post(`${WEBHOOK_URL}/crm.dealcategory.get`, {
    id: categoryId
  });

  const title = response.data.result.NAME;
  pipelineCache[categoryId] = title;
  return title;
}

// Buscar título da etapa
async function getStageTitle(categoryId, stageId) {
  if (stageCache[stageId]) return stageCache[stageId];

  const response = await axios.post(`${WEBHOOK_URL}/crm.dealcategory.stage.list`, {
    id: categoryId
  });

  const stage = response.data.result.find(s => s.STATUS_ID === stageId);
  const title = stage ? stage.NAME : stageId;

  stageCache[stageId] = title;
  return title;
}

// Função para buscar todos os negócios da categoria
async function getDealsByCategory(categoryId) {
  let start = 0;
  let deals = [];

  while (true) {
    const response = await axios.post(`${WEBHOOK_URL}/crm.deal.list`, {
      filter: { CATEGORY_ID: categoryId },
      select: ["ID", "CLOSEDATE", "CATEGORY_ID", "STAGE_ID"],
      start: start
    });

    const result = response.data.result || [];
    deals = deals.concat(result);

    if (!response.data.next) break;
    start = response.data.next;
  }

  return deals;
}

// Atualizar os campos personalizados
async function updateDealField(dealId, closeDate, pipelineTitle, stageTitle) {
  await axios.post(`${WEBHOOK_URL}/crm.deal.update`, {
    id: dealId,
    fields: {
      [dataFechamento]: closeDate || "",    // pode gravar vazio se não tiver data
      [pipelineAnterior]: pipelineTitle,
      [etapaAnterior]: stageTitle
    }
  });

  console.log(`Negócio ${dealId} atualizado`);
}

// Função principal
async function run() {
  try {
    const deals = await getDealsByCategory(CATEGORY_ID);
    console.log(`Total de negócios encontrados: ${deals.length}`);

    for (const deal of deals) {
      const pipelineTitle = await getPipelineTitle(deal.CATEGORY_ID);
      const stageTitle = await getStageTitle(deal.CATEGORY_ID, deal.STAGE_ID);

      await updateDealField(deal.ID, deal.CLOSEDATE, pipelineTitle, stageTitle);
      await sleep(600);
      console.log("Timer 500ms")
    }
  } catch (err) {
    console.error("Erro:", err.response ? err.response.data : err.message);
  }
}

run();
