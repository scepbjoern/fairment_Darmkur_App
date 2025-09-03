export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Auswertungen</h1>
      <div className="card p-4">
        <div className="flex gap-2 mb-4">
          <button className="pill active">Woche</button>
          <button className="pill">Phase</button>
          <button className="pill">Gesamt</button>
        </div>
        <div className="text-sm text-gray-400">Placeholder für Charts</div>
      </div>
    </div>
  )
}
