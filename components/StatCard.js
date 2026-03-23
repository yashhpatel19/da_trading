export default function StatCard({ label, value, sub, accent = 'blue', trend, onClick }) {
  const accentMap = {
    blue: 'border-l-brand-blue',
    green: 'border-l-brand-green',
    red: 'border-l-brand-red',
    yellow: 'border-l-brand-yellow',
    purple: 'border-l-brand-purple',
    cyan: 'border-l-brand-cyan',
  }

  return (
    <div
      className={`card border-l-2 ${accentMap[accent]} ${onClick ? 'cursor-pointer hover:bg-dark-hover transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">{label}</div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      {trend && (
        <div className={`text-xs mt-1 ${trend.up ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.up ? '↑' : '↓'} {trend.label}
        </div>
      )}
    </div>
  )
}
