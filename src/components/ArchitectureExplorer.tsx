import React, { useState } from 'react';
import { BLUEPRINT_FILES, CodeFileBlueprint } from '../data/blueprintData';
import { GolferUser, GolfPost, GolfMatch, FriendRequest } from '../types/golf';
import gardenRouteSeed from '../data/gardenRouteCoursesSeed.json';
import { runGardenRouteIngestion, validateCourseScorecard } from '../scripts/seedGardenRouteCourses';
import { 
  Database, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  Code2, 
  FileJson, 
  Server, 
  FileCode, 
  Cpu, 
  FolderTree, 
  Eye, 
  Sparkles,
  ExternalLink,
  MapPin,
  Flag,
  Compass,
  Terminal,
  Award,
  Play
} from 'lucide-react';

interface ArchitectureExplorerProps {
  currentUser: GolferUser;
  posts: GolfPost[];
  matches: GolfMatch[];
  friendRequests: FriendRequest[];
}

export const ArchitectureExplorer: React.FC<ArchitectureExplorerProps> = ({
  currentUser,
  posts,
  matches,
  friendRequests,
}) => {
  const [activeSection, setActiveSection] = useState<'system_design' | 'garden_route_db' | 'blueprint' | 'rules' | 'rn_files' | 'live_db'>('garden_route_db');
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Garden Route DB Explorer state
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const [gardenRouteSubView, setGardenRouteSubView] = useState<'scorecard' | 'json' | 'script'>('scorecard');
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [hasRunValidation, setHasRunValidation] = useState(false);

  const selectedFile = BLUEPRINT_FILES[selectedFileIdx] || BLUEPRINT_FILES[0];
  const selectedCourse = gardenRouteSeed.courses[selectedCourseIdx] || gardenRouteSeed.courses[0];

  const handleCopy = (code: string, fileName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleRunValidation = async () => {
    setValidationLogs(['[GolfDB] Initializing Garden Route Database Ingestion Suite...']);
    const result = await runGardenRouteIngestion({ dryRun: true });
    
    const logs: string[] = [
      `[GolfDB] Ingestion Engine v1.2.0 active. Target Region: Western Cape, South Africa`,
      `[GolfDB] Total Courses Processed: ${result.totalCoursesProcessed}`,
      `[GolfDB] Status: ${result.success ? 'ALL CHECKS PASSED (100% VALIDATED)' : 'FAILED'}`,
      '------------------------------------------------------------'
    ];

    result.reports.forEach((r) => {
      logs.push(`⛳️ Course: ${r.courseName} (${r.courseId})`);
      logs.push(`   • Holes: ${r.holesCount}/18 | Total Par: ${r.parTotal} (Expected: ${r.expectedPar})`);
      logs.push(`   • White Tees Distance: ${r.whiteTeeMeters}m (Expected: ${r.expectedWhiteTeeMeters}m)`);
      logs.push(`   • Stroke Index Distribution (1-18): ${r.strokeIndexValid ? 'Valid & Unique' : 'Invalid'}`);
      r.verifiedKeyPoints.forEach(kp => logs.push(`   • ${kp}`));
      if (r.errors.length > 0) {
        r.errors.forEach(e => logs.push(`   ❌ Error: ${e}`));
      }
      logs.push('');
    });

    logs.push(`[GolfDB] Ingestion batch validated & ready for Cloud Firestore / PostgreSQL JSONB.`);
    setValidationLogs(logs);
    setHasRunValidation(true);
  };

  const RAW_INGESTION_SCRIPT_CODE = `/**
 * Garden Route Championship Golf Courses - Database Ingestion Script
 * Target: Cloud Firestore / PostgreSQL JSONB
 * Region: Garden Route, Western Cape, South Africa
 */

import gardenRouteSeed from '../data/gardenRouteCoursesSeed.json';

export async function runGardenRouteIngestion(options = { dryRun: true }) {
  console.log('Ingesting 3 Garden Route championship courses...');
  for (const course of gardenRouteSeed.courses) {
    // 1. Validate Par & Holes
    const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
    if (totalPar !== course.par) throw new Error(\`Par mismatch for \${course.name}\`);

    // 2. Validate White Tee Meters
    const whiteMeters = course.holes.reduce((sum, h) => sum + h.distances.whiteMeters, 0);
    const whiteTee = course.teeBoxes.find(t => t.color === 'White');
    if (whiteMeters !== whiteTee.totalMeters) throw new Error(\`White tee mismatch for \${course.name}\`);

    // 3. Upsert into database
    console.log(\`✅ Validated \${course.name}: Par \${totalPar}, White \${whiteMeters}m\`);
  }
}
`;

  return (
    <div id="architecture-explorer-container" className="space-y-5">
      {/* Top Section Nav Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl overflow-x-auto text-xs shadow-xs">
        <button
          onClick={() => setActiveSection('garden_route_db')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'garden_route_db'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flag className="w-4 h-4 text-emerald-400" /> Garden Route Database & Ingestion
        </button>

        <button
          onClick={() => setActiveSection('system_design')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'system_design'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> System Architecture & WHS
        </button>

        <button
          onClick={() => setActiveSection('blueprint')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'blueprint'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileJson className="w-4 h-4" /> Firestore Schema Blueprint
        </button>

        <button
          onClick={() => setActiveSection('rules')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'rules'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Security Rules (firestore.rules)
        </button>

        <button
          onClick={() => setActiveSection('rn_files')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'rn_files'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" /> React Native Code Blueprints
        </button>

        <button
          onClick={() => setActiveSection('live_db')}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSection === 'live_db'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" /> Live Firestore State Inspector
        </button>
      </div>

      {/* SECTION: Garden Route Database Seed & Ingestion */}
      {activeSection === 'garden_route_db' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-emerald-700" /> Garden Route, South Africa Championship Database
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-700" /> Verified Scorecard Data Points
              </span>
            </div>
            
            <h2 className="text-xl font-black text-slate-900">
              Garden Route Championship Courses Seed & Ingestion Engine
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Production-grade scorecard schema and database ingestion module for <strong>Simola Golf and Country Estate</strong>, <strong>Knysna Golf Club</strong>, and <strong>Plettenberg Bay Country Club</strong> in the Western Cape, South Africa.
            </p>

            {/* Verified Key Data Points Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">1. Simola Golf Estate</span>
                  <span className="text-2xs font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">Par 72</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  White tees: <strong>5,943m</strong>. Hole 6 is <strong>Stroke Index 1 (Par 3, 183m)</strong>. Jack Nicklaus Signature layout.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">2. Knysna Golf Club</span>
                  <span className="text-2xs font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">Par 72</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  White tees: <strong>5,752m</strong>. Hole 6 is <strong>Stroke Index 1 (Par 4, 371m)</strong>, featuring <strong>Hole 8 Island Green (Par 3)</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">3. Plettenberg Bay CC</span>
                  <span className="text-2xs font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">Par 72</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  White tees: <strong>5,812m</strong>. Hole 5 is <strong>Stroke Index 1 (Par 4, 367m)</strong>. Robberg Valley wildlife sanctuary.
                </p>
              </div>
            </div>
          </div>

          {/* Sub Navigation Bar: Course Selector + View Modes */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Course Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {gardenRouteSeed.courses.map((course, idx) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseIdx(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    selectedCourseIdx === idx
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {course.name}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
              <button
                onClick={() => setGardenRouteSubView('scorecard')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  gardenRouteSubView === 'scorecard'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Scorecard & Tees
              </button>
              <button
                onClick={() => setGardenRouteSubView('json')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  gardenRouteSubView === 'json'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" /> JSON Schema
              </button>
              <button
                onClick={() => setGardenRouteSubView('script')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  gardenRouteSubView === 'script'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Ingestion Script
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: Interactive Scorecard & Course Details */}
          {gardenRouteSubView === 'scorecard' && (
            <div className="space-y-4">
              {/* Course Profile Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {selectedCourse.region} • {selectedCourse.country}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">{selectedCourse.name}</h3>
                    <p className="text-xs text-slate-500">{selectedCourse.location}</p>
                    <p className="text-xs text-slate-600 mt-1 font-medium">Architect: <span className="font-bold text-slate-800">{selectedCourse.architect}</span></p>
                  </div>

                  {/* Rating Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center">
                      <span className="text-2xs font-bold text-slate-500 uppercase block">Total Par</span>
                      <span className="text-base font-black text-slate-900">{selectedCourse.par}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center">
                      <span className="text-2xs font-bold text-slate-500 uppercase block">White Tees</span>
                      <span className="text-base font-black text-emerald-900">{selectedCourse.teeBoxes.find(t => t.color === 'White')?.totalMeters}m</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center">
                      <span className="text-2xs font-bold text-slate-500 uppercase block">Course Rating</span>
                      <span className="text-base font-black text-slate-900">{selectedCourse.teeBoxes.find(t => t.color === 'White')?.courseRating}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center">
                      <span className="text-2xs font-bold text-slate-500 uppercase block">Slope Rating</span>
                      <span className="text-base font-black text-slate-900">{selectedCourse.teeBoxes.find(t => t.color === 'White')?.slopeRating}</span>
                    </div>
                  </div>
                </div>

                {/* Tee Box Options Table */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tee Box Options & WHS Slope Specifications</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedCourse.teeBoxes.map((t) => (
                      <div key={t.name} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{t.name}</span>
                          <span className={`w-3 h-3 rounded-full border ${
                            t.color === 'Yellow' ? 'bg-amber-400 border-amber-500' :
                            t.color === 'White' ? 'bg-white border-slate-400' :
                            t.color === 'Blue' ? 'bg-blue-500 border-blue-600' :
                            'bg-rose-500 border-rose-600'
                          }`} />
                        </div>
                        <div className="text-2xs text-slate-600 flex justify-between">
                          <span>Total Distance:</span>
                          <span className="font-bold text-slate-900">{t.totalMeters}m ({Math.round(t.totalMeters * 1.09361)}y)</span>
                        </div>
                        <div className="text-2xs text-slate-600 flex justify-between">
                          <span>Rating / Slope:</span>
                          <span className="font-bold text-slate-900">{t.courseRating} / {t.slopeRating}</span>
                        </div>
                        <div className="text-2xs text-slate-600 flex justify-between">
                          <span>Front / Back:</span>
                          <span className="font-bold text-slate-900">{t.frontNineMeters}m / {t.backNineMeters}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 18-Hole Mapped Scorecard Table */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Full 18-Hole Mapped Scorecard (Meters)</h4>
                    <span className="text-2xs text-slate-500">All distances measured in meters (m)</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 text-2xs uppercase tracking-wider font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Hole</th>
                          <th className="py-2.5 px-2 text-center">Par</th>
                          <th className="py-2.5 px-2 text-center text-emerald-900">Stroke Index</th>
                          <th className="py-2.5 px-2 text-center bg-amber-50">Yellow (m)</th>
                          <th className="py-2.5 px-2 text-center bg-slate-50 font-black text-slate-900">White (m)</th>
                          <th className="py-2.5 px-2 text-center bg-blue-50">Blue (m)</th>
                          <th className="py-2.5 px-2 text-center bg-rose-50">Red (m)</th>
                          <th className="py-2.5 px-3">Hole Note / Feature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCourse.holes.map((h) => {
                          const isSI1 = h.strokeIndex === 1;
                          const isSpecial = h.feature || isSI1;
                          return (
                            <tr key={h.holeNumber} className={isSpecial ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
                              <td className="py-2 px-3 font-black text-slate-900">
                                #{h.holeNumber}
                                {h.holeNumber === 9 && <span className="ml-1 text-2xs text-slate-400 font-normal">(Out)</span>}
                                {h.holeNumber === 18 && <span className="ml-1 text-2xs text-slate-400 font-normal">(In)</span>}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-800">{h.par}</td>
                              <td className="py-2 px-2 text-center font-black">
                                {isSI1 ? (
                                  <span className="bg-emerald-900 text-white px-2 py-0.5 rounded-md text-2xs font-extrabold shadow-2xs">
                                    SI 1 (Hardest)
                                  </span>
                                ) : (
                                  <span className="text-slate-700 font-bold">{h.strokeIndex}</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center font-medium text-slate-700 bg-amber-50/50">{h.distances.yellowMeters}m</td>
                              <td className="py-2 px-2 text-center font-black text-slate-900 bg-slate-100/60">{h.distances.whiteMeters}m</td>
                              <td className="py-2 px-2 text-center font-medium text-slate-700 bg-blue-50/50">{h.distances.blueMeters}m</td>
                              <td className="py-2 px-2 text-center font-medium text-slate-700 bg-rose-50/50">{h.distances.redMeters}m</td>
                              <td className="py-2 px-3 text-2xs text-slate-600">
                                {h.feature && <span className="font-bold text-emerald-800 mr-1.5">[{h.feature}]</span>}
                                {h.description}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Summary Totals Row */}
                      <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                        <tr>
                          <td className="py-2.5 px-3">Total (18 Holes)</td>
                          <td className="py-2.5 px-2 text-center">{selectedCourse.par}</td>
                          <td className="py-2.5 px-2 text-center text-2xs text-slate-600 font-normal">SI 1-18</td>
                          <td className="py-2.5 px-2 text-center bg-amber-100/70">{selectedCourse.teeBoxes.find(t => t.color === 'Yellow')?.totalMeters}m</td>
                          <td className="py-2.5 px-2 text-center bg-slate-200/80">{selectedCourse.teeBoxes.find(t => t.color === 'White')?.totalMeters}m</td>
                          <td className="py-2.5 px-2 text-center bg-blue-100/70">{selectedCourse.teeBoxes.find(t => t.color === 'Blue')?.totalMeters}m</td>
                          <td className="py-2.5 px-2 text-center bg-rose-100/70">{selectedCourse.teeBoxes.find(t => t.color === 'Red')?.totalMeters}m</td>
                          <td className="py-2.5 px-3 text-2xs font-bold text-emerald-800">
                            Verified White Total: {selectedCourse.teeBoxes.find(t => t.color === 'White')?.totalMeters}m
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: JSON Schema Structure */}
          {gardenRouteSubView === 'json' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-emerald-700" /> gardenRouteCoursesSeed.json
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete seed payload with 18-hole mapping, slope/course ratings, and stroke indexes for all 3 courses.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(JSON.stringify(gardenRouteSeed, null, 2), 'gardenRouteSeed')}
                  className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
                >
                  {copiedFile === 'gardenRouteSeed' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedFile === 'gardenRouteSeed' ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[580px] border border-slate-800 leading-relaxed">
                {JSON.stringify(gardenRouteSeed, null, 2)}
              </pre>
            </div>
          )}

          {/* SUB-VIEW 3: Database Ingestion Script */}
          {gardenRouteSubView === 'script' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-700" /> seedGardenRouteCourses.ts
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Validation engine and database mutation script for Firestore batch writes or PostgreSQL JSONB ingestion.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunValidation}
                    className="py-1.5 px-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Run Validation Suite
                  </button>
                  <button
                    onClick={() => handleCopy(RAW_INGESTION_SCRIPT_CODE, 'ingestionScript')}
                    className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    {copiedFile === 'ingestionScript' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFile === 'ingestionScript' ? 'Copied' : 'Copy Script'}
                  </button>
                </div>
              </div>

              {/* Live Terminal Output Window */}
              {hasRunValidation && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-2xs font-mono text-emerald-400 border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Ingestion Engine Output
                    </span>
                    <span>Status: 200 OK</span>
                  </div>
                  <pre className="text-xs font-mono text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">
                    {validationLogs.join('\n')}
                  </pre>
                </div>
              )}

              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-[480px] border border-slate-800 leading-relaxed">
                {RAW_INGESTION_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: System Architecture & WHS Engine */}
      {activeSection === 'system_design' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-700" /> Full-Stack Architecture Blueprint
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Cross-Platform Playtomic Golf Architecture (React Native / Expo + Firebase)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Engineered with a high-performance modular React Native client stack powered by Firebase Auth, Cloud Firestore real-time listeners, and a World Handicap System (WHS) calculation engine.
            </p>

            {/* Architecture Stack Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  📱
                </div>
                <h4 className="font-bold text-slate-900 text-sm">React Native & Expo</h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>• Expo Router & React Navigation v7</li>
                  <li>• Modular TypeScript screens & components</li>
                  <li>• FlashList for 60fps activity feed scrolling</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  🔥
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Firebase Backend</h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>• Firebase Authentication (Google & Apple ID)</li>
                  <li>• Firestore NoSQL with compound indexing</li>
                  <li>• Subcollections for Likes & Comments</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  ⛳️
                </div>
                <h4 className="font-bold text-slate-900 text-sm">WHS & Playtomic Levels</h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>• Playing HCP = (Index × (Slope / 113)) + (CR - Par)</li>
                  <li>• Score Differential = (Gross - CR) × (113 / Slope)</li>
                  <li>• Best 8 of 20 score differentials</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Expo Project Folder Structure */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-700" /> Modular React Native / Expo Directory Structure
            </h3>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
{`playtomic-golf-app/
├── app/                      # Expo Router File-Based Routing
│   ├── (auth)/               # Auth group: sign-in, onboarding, handicap-setup
│   ├── (tabs)/               # Bottom tab navigator
│   │   ├── index.tsx         # Activity Feed & Stories
│   │   ├── matches.tsx       # Matchmaking & Open Games
│   │   ├── create.tsx        # Post / Round Score Publisher
│   │   ├── scorecard.tsx     # 18-Hole Live GPS & Stroke Index Card
│   │   └── profile.tsx       # Golfer Profile & Bag
│   └── _layout.tsx           # Root navigation provider & Auth state
├── src/
│   ├── components/           # UI Components (Feed, Scorecard, MatchCard)
│   ├── hooks/                # useGolfFeed, useScorecard, useHandicapEngine
│   ├── services/             # Firestore, Auth & WHS Math services
│   ├── data/                 # South African Garden Route Championship Seeds
│   └── types/                # Strict TypeScript schemas
├── firestore.rules           # Zero-trust ABAC security rules
└── package.json`}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 2: Schema Blueprint */}
      {activeSection === 'blueprint' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-emerald-700" /> firebase-blueprint.json
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Complete Data Modeling Definition for Users, Friendships, Matches, Posts, and Comments.
                </p>
              </div>
              <button
                onClick={() => handleCopy(BLUEPRINT_FILES[0].code, 'blueprint')}
                className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
              >
                {copiedFile === 'blueprint' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFile === 'blueprint' ? 'Copied' : 'Copy JSON Schema'}
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed">
              {BLUEPRINT_FILES[0].code}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 3: Firestore Rules */}
      {activeSection === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> firestore.rules (Zero-Trust ABAC)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Attribute-Based Access Control, Schema Blueprint Validation Helpers, Server Timestamps, and Immutability.
                </p>
              </div>
              <button
                onClick={() => handleCopy(BLUEPRINT_FILES[1].code, 'rules')}
                className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
              >
                {copiedFile === 'rules' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFile === 'rules' ? 'Copied' : 'Copy Rules'}
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed">
              {BLUEPRINT_FILES[1].code}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 4: React Native Code Blueprints */}
      {activeSection === 'rn_files' && (
        <div className="space-y-4">
          {/* File Picker */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {BLUEPRINT_FILES.slice(2).map((file, idx) => (
              <button
                key={file.fileName}
                onClick={() => setSelectedFileIdx(idx + 2)}
                className={`py-2 px-3 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedFileIdx === idx + 2
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                {file.fileName}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-mono">{selectedFile.fileName}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{selectedFile.description}</p>
              </div>
              <button
                onClick={() => handleCopy(selectedFile.code, selectedFile.fileName)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
              >
                {copiedFile === selectedFile.fileName ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFile === selectedFile.fileName ? 'Copied' : 'Copy File'}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed">
              {selectedFile.code}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 5: Live Firestore State Inspector */}
      {activeSection === 'live_db' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" /> Live Firestore Documents Snapshot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Real-time synchronization payload reflecting all user activity in the mobile simulator.
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Live Sync Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Current User Doc */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block">/users/{currentUser.id}</span>
                <pre className="text-slate-300 max-h-60 overflow-y-auto">
                  {JSON.stringify(currentUser, null, 2)}
                </pre>
              </div>

              {/* Feed Posts */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block">/posts (Total: {posts.length})</span>
                <pre className="text-slate-300 max-h-60 overflow-y-auto">
                  {JSON.stringify(posts[0], null, 2)}
                </pre>
              </div>

              {/* Friend Requests */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block">/friendships (Pending: {friendRequests.filter(r => r.status === 'pending').length})</span>
                <pre className="text-slate-300 max-h-60 overflow-y-auto">
                  {JSON.stringify(friendRequests, null, 2)}
                </pre>
              </div>

              {/* Matches */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block">/matches (Open: {matches.length})</span>
                <pre className="text-slate-300 max-h-60 overflow-y-auto">
                  {JSON.stringify(matches[0], null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
