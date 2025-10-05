const readline = require("readline")

// --- CONFIGURAÇÕES --- //
const BITRIX_DOMAIN = "";
const WEBHOOK = "";

const CATEGORY_ID = 22; // pipeline para buscar os negócios
const SOURCE_STAGE_ID = "C22:LOSE"; // ID da etapa de busca

const fieldCardMigrado = "UF_CRM_1759494223";
const fieldDatahoraMigrate = "UF_CRM_1759494245";

// Timer
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Confirmação para executar update
async function askToContinue(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(`${message} (pressione ENTER para continuar ou CTRL+C para cancelar) `, () => {
            rl.close();
            resolve();
        });
    });
}

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
                select: ["ID", "STAGE_ID", "UF_CRM_1759494178", "UF_CRM_1759494167"],
                start: start
            })
        });

        const data = await response.json();

        if (data.result && data.result.length > 0) {
            deals = deals.concat(data.result);
        }

        if (typeof data.next !== "undefined") {
            start = data.next;
        } else {
            hasMore = false;
        }
    }

    return deals;
}


// --- FUNÇÃO PARA ATUALIZAR UM NEGÓCIO --- //
async function updateDeal(dealId) {
    const response = await fetch(`${BITRIX_DOMAIN}/rest/${WEBHOOK}/crm.deal.update.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: dealId,
            fields: {
                [fieldCardMigrado]: true,
                [fieldDatahoraMigrate]: new Date().toISOString()
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

        // Filtra apenas os negócios de determinada etapa
        const sourceStageDeals = deals.filter(deal =>
                deal.STAGE_ID === SOURCE_STAGE_ID &&
                Boolean(deal["UF_CRM_1759494178"]) &&
                Boolean(deal["UF_CRM_1759494167"])
            );
        console.log(`Negócios na primeira etapa encontrados: ${sourceStageDeals.length}`);

        // Confirmação para executar update
        await askToContinue("Deseja continuar com a migração?");

        let i = 1;
        for (const deal of sourceStageDeals) {
            const updateStage = await updateDeal(deal.ID);
            if (updateStage.error) {
                console.error(`Erro ao atualizar negócio ${deal.ID}:`, updateStage.error_description);
            } else {
                console.log(`Negócio ${deal.ID} atualizado | ${i} de ${sourceStageDeals.length}`);
            }
            ++i;
            await sleep(300);
        }

        console.log("Atualização concluída!");

    } catch (error) {

        console.error("Erro na migração:", error);

    }
}

migrateDeals();


// TESTES:
// async function main() {
//   const data = await getDeals(25);
//   console.log(data);
// }

// main();