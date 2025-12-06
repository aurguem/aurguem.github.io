import React from 'react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  colorClass: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, trend, colorClass }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        {trend && <p className="text-xs text-slate-400 mt-2">{trend}</p>}
      </div>
      <div className={`p-4 rounded-xl ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
};

export default KPICard;