
// server-main/src/controllers/statsController.js
import { dbAll, dbGet } from "../db/index.js";

export async function ticketStats(req, res) {
  const byStatus = await dbAll(
    "SELECT Status AS status, COUNT(*) AS count FROM tickets GROUP BY Status ORDER BY count DESC",
  );

  const byPriority = await dbAll(
    "SELECT Priority AS priority, COUNT(*) AS count FROM tickets GROUP BY Priority ORDER BY count DESC",
  );

  const totals = await dbGet(`
  SELECT
    COUNT(*) AS total,

    SUM(
      CASE
        WHEN NULLIF(Close_Time,'') IS NULL THEN 1
        ELSE 0
      END
    ) AS open,

    SUM(
      CASE
        WHEN NULLIF(Close_Time,'') IS NOT NULL THEN 1
        ELSE 0
      END
    ) AS closed

  FROM tickets
`);


  const recent7 = await dbGet(
    "SELECT COUNT(*) AS count FROM tickets WHERE datetime(created_at) >= datetime('now','-7 days')"
  );

  const recentTickets = await dbAll(
    "SELECT id, CI_Name AS ciName, Status AS status, Priority AS priority, created_at AS createdAt FROM tickets WHERE datetime(created_at) >= datetime('now','-7 days') ORDER BY datetime(created_at) DESC LIMIT 20"
  );


  res.json({
    data: {
      totals: {
        total: totals?.total ?? 0,
        open: totals?.open ?? 0,
        closed: totals?.closed ?? 0,
      },
      by_status: byStatus,
      by_priority: byPriority,
      recent_7_days: {
        count: recent7?.count ?? 0,
        tickets: recentTickets,
      },
    },
  });
}
