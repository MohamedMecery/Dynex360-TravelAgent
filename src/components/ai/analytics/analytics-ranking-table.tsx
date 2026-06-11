import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface RankingColumn {
  key: string;
  label: string;
}

interface AnalyticsRankingTableProps {
  title: string;
  columns: RankingColumn[];
  rows: Array<Record<string, string | number>>;
  emptyLabel: string;
}

export function AnalyticsRankingTable({
  title,
  columns,
  rows,
  emptyLabel,
}: AnalyticsRankingTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto px-4 pb-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {columns.map((col) => (
                  <th key={col.key} className="pb-2 pe-4 font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="py-2 pe-4">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
