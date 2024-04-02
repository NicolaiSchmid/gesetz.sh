const DOMAIN = "https://www.gesetze-im-internet.de";

const partialLists = "abcdefghijklmnopqrstuvwxyz123456789"
  .split("")
  .map((character) => `Teilliste_${character}`);

// TKTK Parse links to laws from partial list page
// https://www.gesetze-im-internet.de/Teilliste_A.html
async function crawlpartialList(list) {
  console.log(list);
}

export default async function () {
  return await Promise.all(partialLists.map((list) => crawlpartialList(list)));
}
