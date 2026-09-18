import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { money } from '../../../utils/formatters'

export default function MyPayPage() {
  const [paychecks, setPaychecks] = useState([])

  useEffect(() => {
    appService.getPaychecks().then(setPaychecks)
  }, [])

  return (
    <PortalLayout title="My Pay">
      <Card title="Paychecks">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Check ID</th>
                <th>Period</th>
                <th>Gross</th>
                <th>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paychecks.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.period}</td>
                  <td>{money(item.gross)}</td>
                  <td>{money(item.net)}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
