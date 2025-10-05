const axios = require("axios");

const BITRIX_URL = "";

const findPipeline = "Propostas"

async function getStagesByPipelineName(pipelineName) {
  try {
    // Busca todos pipelines
    const { data: categoriesData } = await axios.get(`${BITRIX_URL}crm.dealcategory.list.json`);
    const categories = categoriesData.result;

    const pipeline = categories.find(c => c.NAME.toLowerCase() === pipelineName.toLowerCase());
    if (!pipeline) {
      console.log(`Pipeline "${pipelineName}" não encontrado.`);
      return;
    }

    console.log(`Pipeline encontrado: ${pipeline.NAME} | ID: ${pipeline.ID}`);

    // Busca todas etapas do funil
    const { data: stagesData } = await axios.get(`${BITRIX_URL}crm.status.list.json`);
    const allStatuses = stagesData.result;

    const stages = allStatuses
      .filter(s => s.ENTITY_ID === `DEAL_STAGE_${pipeline.ID}`)
      .map(s => ({
        id: s.STATUS_ID,
        name: s.NAME,
        sort: s.SORT,
      }))
      .sort((a, b) => a.sort - b.sort);

    console.log("\nEtapas do pipeline:");
    stages.forEach(s => console.log(`- ${s.name} | ID: ${s.id}\n`));

    return stages;
  } catch (error) {
    console.error("Erro ao buscar etapas:", error.response?.data || error.message);
  }
}

getStagesByPipelineName(findPipeline);
