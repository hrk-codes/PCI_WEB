const history = [
  ['2015–16',766.34],['2016–17',2506.77],['2017–18',4986.64],['2018–19',12297.99],['2019–20',13128.31],
  ['2020–21',11187.38],['2021–22',11867.24],['2022–23',12773.08],['2023–24',16524.41],['2024–25',27709.79],
] as const
const inr = new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})

export function Turnover() {
  return <div className="turnover"><h2>Annual turnover</h2><p>Financial year totals, in ₹ lakh, as published by PCI Cables.</p>
    <div className="turnover-chart" aria-hidden="true">{history.map(([year, value])=><div key={year}><span style={{height:value/300+'%'}}/><small>{year.slice(-2)}</small></div>)}</div>
    <details><summary>View turnover data</summary><table><thead><tr><th scope="col">Financial year</th><th scope="col">Turnover (₹ lakh)</th></tr></thead><tbody>{history.map(([year,value])=><tr key={year}><th scope="row">{year}</th><td>{inr.format(value)}</td></tr>)}</tbody></table></details>
  </div>
}
