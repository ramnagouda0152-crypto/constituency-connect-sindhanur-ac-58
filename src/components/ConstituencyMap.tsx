import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Filter,
  Layers,
  Home,
  Vote,
  AlertCircle,
  TrendingUp,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  Search,
  X,
  Users,
  Building2,
  Phone
} from 'lucide-react';
import { Village, Booth, Issue, DevelopmentProject, User } from '../types.ts';
import { Language, t } from '../translations.ts';

interface ConstituencyMapProps {
  currentUser: User;
  villages: Village[];
  issues: Issue[];
  projects: DevelopmentProject[];
  lang: Language;
}

export const ConstituencyMap: React.FC<ConstituencyMapProps> = ({
  currentUser,
  villages,
  issues,
  projects,
  lang
}) => {
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [showBooths, setShowBooths] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  // Compute bounding box dynamically from all official AC-58 villages
  const lats = villages.map(v => v.latitude).filter(Boolean);
  const lngs = villages.map(v => v.longitude).filter(Boolean);

  const minLat = lats.length ? Math.min(...lats) - 0.025 : 15.66;
  const maxLat = lats.length ? Math.max(...lats) + 0.025 : 15.92;
  const minLng = lngs.length ? Math.min(...lngs) - 0.025 : 76.65;
  const maxLng = lngs.length ? Math.max(...lngs) + 0.025 : 76.92;

  const mapWidth = 840;
  const mapHeight = 580;

  // Project lat/lng to SVG x,y with proportional padding
  const projectCoordinates = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 120) + 60;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (mapHeight - 120) + 60;
    return { x, y };
  };

  useEffect(() => {
    if (isVillageHead && currentUser.village_id) {
      const v = villages.find(vil => vil.village_id === currentUser.village_id);
      if (v) {
        setSelectedVillage(v);
        setZoomLevel(1.5);
      }
    }
  }, [isVillageHead, currentUser, villages]);

  const filteredIssues = issues.filter(i => {
    if (selectedCategory && i.category !== selectedCategory) return false;
    return true;
  });

  // Filtered villages for quick selector
  const searchedVillages = villages.filter(v =>
    v.village_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.kannada_name.includes(searchQuery) ||
    v.gp_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Touch and mouse pan drag handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX - panOffset.x, y: clientY - panOffset.y };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    setPanOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedVillage(null);
  };

  // AC-58 Outer Boundary polygon points calculated from perimeter anchor villages
  // (Virupapur/Alabanoor in South, Dhadesugur/Madasirwar in North, Gorebal in West, Salagunda/Banniganur in East)
  const boundaryPoints = [
    projectCoordinates(15.89, 76.78), // North: Dhadesugur
    projectCoordinates(15.91, 76.81), // North-East apex
    projectCoordinates(15.87, 76.89), // East: Banniganur
    projectCoordinates(15.82, 76.91), // East: Salagunda
    projectCoordinates(15.74, 76.88), // South-East
    projectCoordinates(15.68, 76.80), // South: Belgurki / Virupapur
    projectCoordinates(15.68, 76.74), // South: Alabanoor
    projectCoordinates(15.72, 76.67), // South-West
    projectCoordinates(15.79, 76.66), // West: Gorebal
    projectCoordinates(15.85, 76.70)  // North-West: Somalapura
  ];

  const boundaryPathD = `M ${boundaryPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} Z`;

  // Issues and stats for selected village
  const selectedVillageIssues = selectedVillage
    ? issues.filter(i => i.village_id === selectedVillage.village_id)
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('constituencyMap', lang)}
            </h1>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              AC-58 Sindhanur GIS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Jurisdiction Focus: Assigned Village (${currentUser.village_id})`
              : 'Official spatial visualizer for 124 revenue villages, Gram Panchayats, and civic hotspots'}
          </p>
        </div>

        {/* Quick Jump & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Village Search Select */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedVillage?.village_id || ''}
              onChange={e => {
                const vil = villages.find(v => v.village_id === e.target.value);
                if (vil) {
                  setSelectedVillage(vil);
                  setZoomLevel(1.6);
                } else {
                  setSelectedVillage(null);
                }
              }}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="">-- Jump to Village ({villages.length}) --</option>
              {villages.map(v => (
                <option key={v.village_id} value={v.village_id}>
                  {v.village_name} ({v.kannada_name}) • {v.gp_id}
                </option>
              ))}
            </select>
          </div>

          {/* Layer Toggles */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-sm">
            <button
              onClick={() => setShowIssues(!showIssues)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                showIssues ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Issues</span> ({filteredIssues.length})
            </button>
            <button
              onClick={() => setShowProjects(!showProjects)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                showProjects ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Projects</span> ({projects.length})
            </button>
            <button
              onClick={() => setShowBooths(!showBooths)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                showBooths ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Booths</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative select-none">
        {/* Mobile-Friendly Floating Controls (min-h-[44px] for finger tap targets) */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3.0))}
            className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-center transition-transform active:scale-95"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.7))}
            className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-center transition-transform active:scale-95"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={resetView}
            className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-center transition-transform active:scale-95"
            title="Reset Map View"
            aria-label="Reset Map View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] sm:text-xs text-slate-300 space-y-1 shadow-lg max-w-[200px]">
          <span className="font-bold text-slate-100 block border-b border-slate-800 pb-0.5">Map Layers</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300 shrink-0" />
            <span className="truncate">Revenue Village</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="truncate">Civic Grievance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
            <span className="truncate">Public Project</span>
          </div>
        </div>

        {/* Interactive SVG Canvas with Mouse & Touch Pan/Drag */}
        <div
          className="w-full h-[460px] sm:h-[560px] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing p-2"
          onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={e => {
            if (e.touches.length === 1) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={e => {
            if (e.touches.length === 1) {
              handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handlePointerUp}
        >
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
          >
            <defs>
              <radialGradient id="issueGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="villageGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
              </pattern>
            </defs>

            {/* Subtle GIS Background Grid */}
            <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

            {/* Official AC-58 Constituency Boundary Polygon */}
            <path
              d={boundaryPathD}
              fill="#064e3b"
              fillOpacity="0.16"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />

            {/* Major Connectivity Arteries across Sindhanur */}
            <path
              d={`
                M ${projectCoordinates(15.70, 76.75).x},${projectCoordinates(15.70, 76.75).y}
                L ${projectCoordinates(15.77, 76.76).x},${projectCoordinates(15.77, 76.76).y}
                L ${projectCoordinates(15.88, 76.78).x},${projectCoordinates(15.88, 76.78).y}
              `}
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <path
              d={`
                M ${projectCoordinates(15.79, 76.68).x},${projectCoordinates(15.79, 76.68).y}
                L ${projectCoordinates(15.77, 76.76).x},${projectCoordinates(15.77, 76.76).y}
                L ${projectCoordinates(15.84, 76.89).x},${projectCoordinates(15.84, 76.89).y}
              `}
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />

            {/* Render 124 AC-58 Revenue Villages */}
            {villages.map(v => {
              const { x, y } = projectCoordinates(v.latitude, v.longitude);
              const isSelected = selectedVillage?.village_id === v.village_id;

              return (
                <g
                  key={v.village_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVillage(v);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Selection Glow Pulse */}
                  {isSelected && (
                    <circle cx={x} cy={y} r="26" fill="url(#villageGlow)" />
                  )}

                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 9 : 5.5}
                    fill={isSelected ? '#34d399' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="transition-transform group-hover:scale-125"
                  />

                  {/* Village Name Labels */}
                  {(zoomLevel >= 1.2 || isSelected) && (
                    <text
                      x={x}
                      y={y + (isSelected ? 16 : 13)}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={isSelected ? '11' : '9'}
                      fontWeight={isSelected ? '700' : '500'}
                      className="select-none pointer-events-none drop-shadow-md"
                    >
                      {v.village_name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Civic Issues Overlay */}
            {showIssues && filteredIssues.map(issue => {
              const v = villages.find(vil => vil.village_id === issue.village_id);
              if (!v) return null;
              const { x, y } = projectCoordinates(v.latitude, v.longitude);
              const hash = issue.issue_id.charCodeAt(issue.issue_id.length - 1);
              const offsetX = (hash % 5) * 6 - 12;
              const offsetY = (hash % 4) * 6 - 10;

              return (
                <g key={issue.issue_id} className="cursor-pointer">
                  <circle cx={x + offsetX} cy={y + offsetY} r="10" fill="url(#issueGlow)" />
                  <circle
                    cx={x + offsetX}
                    cy={y + offsetY}
                    r="3.5"
                    fill="#ef4444"
                    stroke="#fee2e2"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Public Development Projects Overlay */}
            {showProjects && projects.map(proj => {
              const v = villages.find(vil => vil.village_id === proj.village_id);
              if (!v) return null;
              const { x, y } = projectCoordinates(v.latitude, v.longitude);
              const projOffsetX = 12;
              const projOffsetY = -12;

              return (
                <g key={proj.project_id} className="cursor-pointer">
                  <circle
                    cx={x + projOffsetX}
                    cy={y + projOffsetY}
                    r="4.5"
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Village Info Panel (Responsive for mobile & desktop) */}
        {selectedVillage && (
          <div className="absolute top-3 left-3 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700 w-72 sm:w-80 text-xs space-y-2.5 text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-sm text-amber-400">
                  {selectedVillage.village_name}
                </h4>
                <p className="text-xs text-slate-300 font-kannada">
                  {selectedVillage.kannada_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedVillage(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Gram Panchayat:</span>
                <strong className="text-white font-medium">{selectedVillage.gp_id}</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Village ID:</span>
                <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                  {selectedVillage.village_id}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Registered Voters:</span>
                <strong className="text-emerald-400 font-bold">
                  {selectedVillage.voter_count?.toLocaleString() || 'N/A'}
                </strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Total Population:</span>
                <span className="text-white font-medium">{selectedVillage.population?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">Active Civic Issues:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedVillageIssues.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {selectedVillageIssues.length} logged
                </span>
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                onClick={() => {
                  setZoomLevel(2.0);
                  const { x, y } = projectCoordinates(selectedVillage.latitude, selectedVillage.longitude);
                  setPanOffset({
                    x: (mapWidth / 2 - x) * 1.5,
                    y: (mapHeight / 2 - y) * 1.5
                  });
                }}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Center Village
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
