import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DashboardStats } from '../types';
import { CHART_COLORS } from '../constants';

interface ChartsProps {
  stats: DashboardStats;
}

export const DistributionChart: React.FC<ChartsProps> = ({ stats }) => {
  const data = Object.entries(stats.distribution).map(([name, value]) => ({
    name,
    value: value as number
  })).filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
        데이터 대기 중...
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            itemStyle={{ fontSize: '12px', fontWeight: 500 }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CountBarChart: React.FC<ChartsProps> = ({ stats }) => {
  const data = Object.entries(stats.distribution).map(([name, value]) => ({
    name,
    count: value as number
  })).sort((a, b) => b.count - a.count);

  if (data.every(d => d.count === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
        데이터 대기 중...
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
          <Tooltip 
             cursor={{fill: '#f1f5f9'}}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
             {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};