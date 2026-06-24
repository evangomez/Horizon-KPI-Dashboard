
const BOARD_ID = "7594026969";
 
// Whitelist — only the columns the dashboard reads. No contact/PII columns here.
const COLUMN_IDS = [
  "short_text0__1",   // event name
  "date__1",          // event date
  "status8__1",       // status (Done filter)
  "number__1",        // contacts
  "number0__1",       // meaningful engagements
  "number7__1",       // MySCE App downloads
  "number6__1",       // TLL registrations
  "number1__1",       // mailing list sign-ups
  "numbert53d6h04",   // Interplay sign-ups
  "number74__1",      // in-language (Spanish)
  "numberxxpvj0ip",   // CARE/FERA
  "numbero8jm2ohq",   // ESA
  "number9kpyudx0",   // MBL
  "multi_select__1",  // programs promoted
  "multi_select3__1", // staff attended
  "single_select__1", // SCE requester
];
 
const idsLiteral = JSON.stringify(COLUMN_IDS); // e.g. ["short_text0__1",...]
 
const Q_FIRST = `query($board:[ID!]) {
  boards(ids:$board) {
    items_page(limit:500) {
      cursor
      items { id name column_values(ids:${idsLiteral}) { id text value } }
    }
  }
}`;
 
const Q_NEXT = `query($cursor:String!) {
  next_items_page(limit:500, cursor:$cursor) {
    cursor
    items { id name column_values(ids:${idsLiteral}) { id text value } }
  }
}`;
 
async function monday(query, variables){
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": process.env.MONDAY_TOKEN,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors && j.errors.length) throw new Error(j.errors[0].message);
  return j.data;
}
 
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  try {
    const first = await monday(Q_FIRST, { board: [BOARD_ID] });
    let page = first.boards[0].items_page;
    let items = page.items || [];
    let cursor = page.cursor;
    let safety = 0;
    while (cursor && safety < 20) {
      const next = await monday(Q_NEXT, { cursor });
      items = items.concat(next.next_items_page.items || []);
      cursor = next.next_items_page.cursor;
      safety++;
    }
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
