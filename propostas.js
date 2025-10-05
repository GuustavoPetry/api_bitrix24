const axios = require("axios");

// Configurações
const WEBHOOK_URL = "";
const CATEGORY_ID = 22;
const dataFechamento = "UF_CRM_1759494199";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Busca todos negócios de um pipeline especifico
async function getDealsByCategory(categoryId) {
  let start = 0;
  let deals = [];

  while (true) {
    const response = await axios.post(`${WEBHOOK_URL}/crm.deal.list`, {
      filter: { CATEGORY_ID: categoryId },
      select: ["ID", "CLOSEDATE"],
      start: start
    });

    const result = response.data.result || [];
    deals = deals.concat(result);

    if (!response.data.next) break;
    start = response.data.next;
  }

  return deals;
}

// Atualiza campos customizados
async function updateDealField(dealId, closeDate) {
  await axios.post(`${WEBHOOK_URL}/crm.deal.update`, {
    id: dealId,
    fields: {
      [dataFechamento]: closeDate,
    }
  });

}

// Função principal
async function run() {
  try {
    const deals = await getDealsByCategory(CATEGORY_ID);
    console.log(`Total de negócios encontrados: ${deals.length}`);

    let i = 1;
    for (const deal of deals) {

      await updateDealField(deal.ID, deal.CLOSEDATE);
      await sleep(700);
      console.log(`Negócio ${deal.ID} atualizado | ${i} de ${deals.length}`);
      ++i;
    }
  } catch (err) {
    console.error("Erro:", err.response ? err.response.data : err.message);
  }
  console.log("Campos Atualizados com Sucesso")
}

run();
