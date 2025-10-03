// --- CONFIGURAÇÕES --- //
const BITRIX_DOMAIN = "";
const WEBHOOK = "";
const CATEGORY_ID = 27; // pipeline para buscar os negócios
const FIRST_STAGE_ID = "C27:PREPAYMENT_INVOIC"; // ID da primeira etapa do pipeline
const TARGET_STAGE_ID = "C27:NEW"; // ID do stage alvo

// --- FUNÇÃO PARA PEGAR TODOS OS NEGÓCIOS DE UMA CATEGORIA --- //
async function getDeals(categoryId) {
    let deals = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await fetch(`${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.list.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filter: { "CATEGORY_ID": categoryId },
                select: ["ID", "STAGE_ID"],
                start: start
            })
        });

        const data = await response.json();

        if (data.result && data.result.length > 0) {
            deals = deals.concat(data.result);
        }

        if (typeof data.next !== "undefined") {
            start = data.next; // Bitrix devolve o próximo token de paginação
        } else {
            hasMore = false;   // não tem mais páginas
        }
    }

    return deals;
}


// --- FUNÇÃO PARA ATUALIZAR UM NEGÓCIO --- //
async function updateDeal(dealId, newStageId) {
    const response = await fetch(`${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.update.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: dealId,
            fields: {
                STAGE_ID: newStageId
            }
        })
    });

    const data = await response.json();
    return data;
}

// --- FUNÇÃO PRINCIPAL --- //
async function migrateDeals() {
    try {
        const deals = await getDeals(CATEGORY_ID);

        // Filtra apenas os negócios que estão na primeira etapa
        const firstStageDeals = deals.filter(deal => deal.STAGE_ID === FIRST_STAGE_ID);
        console.log(`Negócios na primeira etapa encontrados: ${firstStageDeals.length}`);

        for (const deal of firstStageDeals) {
            const result = await updateDeal(deal.ID, TARGET_STAGE_ID);
            if (result.error) {
                console.error(`Erro ao atualizar negócio ${deal.ID}:`, result.error_description);
            } else {
                console.log(`Negócio ${deal.ID} atualizado para STAGE_ID=${TARGET_STAGE_ID}`);
            }
        }

        console.log("Atualização concluída!");
    } catch (error) {
        console.error("Erro na migração:", error);
    }
}

// --- EXECUTA MIGRAÇÃO --- //
migrateDeals();


// TESTES:
// async function main() {
//   const data = await getDeals(25);
//   console.log(data);
// }

// main();