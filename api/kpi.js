// Vercel serverless proxy — holds the Monday token, returns board items only.
const BOARD_ID = "7594026969";
const Q_FIRST = `query($board:[ID!]) { boards(ids:$board) { items_page(limit:500) { cursor items { id name column_values { id text value } } } } }`;
const Q_NEXT  = `query($cursor:String!) { next_items_page(limit:500, cursor:$cursor) { cursor items { id name column_values { id text value } } } }`;

async function monday(query, variables){
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": process.env.MONDAY_TOKEN, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors && j.errors.length) throw new Error(j.errors[0].message);
  return j.data;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const first = await monday(Q_FIRST, { board: [BOARD_ID] });
    let page = first.boards[0].items_page, items = page.items || [], cursor = page.cursor, safety = 0;
    while (cursor && safety < 20) {
      const next = await monday(Q_NEXT, { cursor });
      items = items.concat(next.next_items_page.items || []);
      cursor = next.next_items_page.cursor; safety++;
    }
    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
