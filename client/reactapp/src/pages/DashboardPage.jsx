import { Link } from 'react-router-dom'

function SortTh({ children, className = '' }) {
  return (
    <th scope="col" className={className}>
      <span className="th-sort">
        {children}
        <span className="sort-arrows" aria-hidden="true">
          <span>▲</span>
          <span>▼</span>
        </span>
      </span>
    </th>
  )
}

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Portfolio</h1>
          <p>Holdings overview — data will load from your API / MongoDB later.</p>
        </div>
        <nav>
          <Link to="/login">Sign out (link placeholder)</Link>
        </nav>
      </header>

      <div className="table-wrap">
        <table className="portfolio-table">
          <caption className="caption">
            Positions table — columns match your portfolio view.
          </caption>
          <thead>
            <tr>
              <SortTh>Symbol</SortTh>
              <SortTh className="num">Last price</SortTh>
              <SortTh className="num">Today&apos;s gain/loss</SortTh>
              <SortTh className="num">Total gain/loss</SortTh>
              <SortTh className="num">Current value</SortTh>
              <SortTh className="num">Cost basis</SortTh>
              <SortTh className="num">Quantity</SortTh>
              <SortTh className="num th-pct-account">% of account</SortTh>
            </tr>
          </thead>
          <tbody>
            <tr className="placeholder-row">
              <td colSpan={8}>
                No holdings yet — rows will be rendered from the database.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
