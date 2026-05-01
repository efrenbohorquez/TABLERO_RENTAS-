import { useState, useEffect } from 'react';
import type { DashboardData } from '../types';

export function useData() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/data/dashboard_data.json').then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            }),
            fetch('/data/xgboost_forecast.json').then(res => {
                if (!res.ok) return null; // If not found, just return null
                return res.json();
            }).catch(() => null),
            fetch('/data/cv_metrics.json').then(res => {
                if (!res.ok) return null;
                return res.json();
            }).catch(() => null)
        ])
            .then(([dashboardJson, xgboostJson, cvMetricsJson]) => {
                const combinedData = {
                    ...dashboardJson,
                    xgboost_forecast: xgboostJson || [],
                    cv_metrics: cvMetricsJson || null
                };
                setData(combinedData);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return { data, loading, error };
}
