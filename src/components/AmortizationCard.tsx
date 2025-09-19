// src/components/AmortizationCard.tsx
import type { PropsWithChildren } from "react";
import Card from "./Card";

export type AmortRow = {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

type AmortizationCardProps = PropsWithChildren<{
  rows: AmortRow[];
}>;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function AmortizationCard({ rows }: AmortizationCardProps) {
  return (
    <Card title="Amortization">
      <div className="amort-wrap">
        <table className="amort">
          <thead>
            <tr>
              <th>Month</th>
              <th>Payment</th>
              <th>Interest</th>
              <th>Principal</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{usd.format(r.payment)}</td>
                <td>{usd.format(r.interest)}</td>
                <td>{usd.format(r.principal)}</td>
                <td>{usd.format(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
