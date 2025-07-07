// File: src/components/results/EditChart.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { apiService } from '../../services/api.js';

const EditChart = ({ pages, analysisConfig }) => {
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPages, setSelectedPages] = useState(pages?.slice(0, 5) || []);
  const [editorType, setEditorType] = useState('user'); // 'user' ou 'all'

  // Couleurs pour les différentes pages (même palette que PageviewsChart)
  const colors = [
    '#8b5cf6', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', 
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
  ];

  // Récupérer les données d'éditions
  const fetchEditData = async () => {
    if (!selectedPages.length || !analysisConfig) return;

    setLoading(true);
    setError(null);

    try {
      const pageNames = selectedPages.map(page => page.title || page);
      
      const data = await apiService.fetchEditTimeseriesForChart(
        pageNames,
        analysisConfig.startDate,
        analysisConfig.endDate,
        analysisConfig.language || 'fr',
        editorType
      );

      setEditData(data);
    } catch (err) {
      console.error('Erreur récupération éditions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    setSelectedPages(pages?.slice(0, 5) || []);
  }, [pages]);

  useEffect(() => {
    fetchEditData();
  }, [selectedPages, analysisConfig, editorType]);

  // Gérer la sélection des pages
  const handlePageToggle = (pageIndex) => {
    const page = pages[pageIndex];
    const isSelected = selectedPages.some(p => (p.title || p) === (page.title || page));
    
    if (isSelected) {
      setSelectedPages(prev => prev.filter(p => (p.title || p) !== (page.title || page)));
    } else {
      if (selectedPages.length < 10) {
        setSelectedPages(prev => [...prev, page]);
      }
    }
  };

  // Formatter les nombres
  const formatNumber = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="pageviews-tooltip">
          <p className="tooltip-date">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatNumber(entry.value)} éditions`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculer les totaux pour l'en-tête
  const getTotalEdits = () => {
    if (!editData?.metadata?.pages_stats) return 0;
    return Object.values(editData.metadata.pages_stats)
      .reduce((sum, stats) => sum + (stats.total_edits || 0), 0);
  };

  return (
    <div className="pageviews-chart-container">
      {/* Header */}
      <div className="pageviews-header">
        <div className="header-content">
          <h4>✏️ Évolution des éditions</h4>
          <div className="header-stats">
            {editData && (
              <div className="total-views">
                <span className="views-number">{formatNumber(getTotalEdits())}</span>
                <span className="views-label">éditions totales</span>
              </div>
            )}
            <div className="period-info">
              {analysisConfig?.startDate} → {analysisConfig?.endDate}
            </div>
          </div>
        </div>
      </div>

      

      {/* Sélecteur de pages - compact (même design que PageviewsChart) */}
      {pages && pages.length > 1 && (
        <div className="pageviews-selector-compact">
          <div className="selector-header">
            <span className="selector-title">
              Pages affichées ({selectedPages.length}/10):
            </span>
            <button 
              className="select-all-btn"
              onClick={() => setSelectedPages(pages.slice(0, 10))}
              disabled={selectedPages.length === Math.min(pages.length, 10)}
            >
              Toutes
            </button>
          </div>
          <div className="pages-selector-compact">
            {pages.map((page, index) => {
              const isSelected = selectedPages.some(p => (p.title || p) === (page.title || page));
              const color = colors[index % colors.length];
              
              return (
                <button
                  key={index}
                  className={`page-selector-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handlePageToggle(index)}
                  disabled={!isSelected && selectedPages.length >= 10}
                  style={isSelected ? { 
                    borderColor: color, 
                    backgroundColor: `${color}15`,
                    color: color
                  } : {}}
                >
                  <span className="chip-number">#{index + 1}</span>
                  <span className="chip-title" title={page.title || page}>
                    {(page.title || page).length > 20 
                      ? `${(page.title || page).substring(0, 20)}...` 
                      : (page.title || page)
                    }
                  </span>
                  {isSelected && <span className="chip-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* États de chargement et erreur */}
      {loading && (
        <div className="pageviews-loading">
          <div className="mini-spinner"></div>
          <span>Récupération des données d'éditions...</span>
        </div>
      )}

      {error && (
        <div className="pageviews-error">
          <span>❌ {error}</span>
          <button onClick={fetchEditData} className="retry-btn">
            Réessayer
          </button>
        </div>
      )}

      {/* Graphique */}
      {editData && !loading && !error && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={editData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#666' }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={formatNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {selectedPages.map((page, index) => {
                const pageName = page.title || page;
                return (
                  <Line
                    key={pageName}
                    type="monotone"
                    dataKey={pageName}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistiques résumées - compact (même design que PageviewsChart) */}
      {editData && !loading && !error && (
        <div className="pageviews-stats-compact">
          <h5>📊 Statistiques d'éditions de la période</h5>
          <div className="stats-grid-compact">
            {Object.entries(editData.metadata.pages_stats || {}).map(([pageName, stats]) => {
              const pageIndex = selectedPages.findIndex(p => (p.title || p) === pageName);
              const color = colors[pageIndex % colors.length];
              
              return (
                <div key={pageName} className="stat-item-compact">
                  <div className="stat-header-compact">
                    <div 
                      className="stat-color-dot" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="stat-page-name" title={pageName}>
                      {pageName.length > 25 ? `${pageName.substring(0, 25)}...` : pageName}
                    </span>
                  </div>
                  <div className="stat-values-compact">
                    <div className="stat-main">
                      <span className="stat-number">{formatNumber(stats.total_edits)}</span>
                      <span className="stat-label">total</span>
                    </div>
                    <div className="stat-secondary">
                      <span>{formatNumber(Math.round(stats.avg_edits))}/jour</span>
                      <span>max: {formatNumber(stats.max_edits)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          
        </div>
      )}
    </div>
  );
};

export default EditChart;