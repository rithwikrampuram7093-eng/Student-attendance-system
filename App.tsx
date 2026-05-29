/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  BarChart3, 
  AlertTriangle, 
  Search, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  FileText, 
  Mail, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Check, 
  X, 
  ChevronDown, 
  RefreshCw, 
  Trash2,
  CalendarDays,
  MapPin,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { AttendanceStatus, Student, ClassSection, AttendanceRecord, ProjectTeamMember } from './types';
import { CLASSES, STUDENTS_SEED, PROJECT_TEAM, generateMockAttendanceHistory } from './data';

export default function App() {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('sa_students');
    return saved ? JSON.parse(saved) : STUDENTS_SEED;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('sa_records');
    return saved ? JSON.parse(saved) : generateMockAttendanceHistory();
  });

  // Today as Default Date YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Use the timezone safe offset to get YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [selectedClassId, setSelectedClassId] = useState<string>('class-10a');
  const [currentView, setCurrentView] = useState<'teacher' | 'admin' | 'student-lookup' | 'project-info'>('teacher');
  
  // Searching & Selection for Student Lookup view
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filter inside Admin view (low attendance threshold, class filter)
  const [adminClassFilter, setAdminClassFilter] = useState<string>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [absenteeThreshold, setAbsenteeThreshold] = useState<number>(85); // Critical early warning limit

  // Current attendance session states for class teacher inputs
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [temporaryAttendance, setTemporaryAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSavedToastOpen, setIsSavedToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Project Info States
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState<boolean>(false);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem('sa_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('sa_records', JSON.stringify(records));
  }, [records]);

  // --- MERGE OR LOAD ATTENDANCE SESSION FOR SELECTED DATE/CLASS ---
  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && s.status === 'Active');
  }, [students, selectedClassId]);

  const activeClassDetails = useMemo(() => {
    return CLASSES.find(c => c.id === selectedClassId) || CLASSES[0];
  }, [selectedClassId]);

  // Load existing records if any, or default all to 'Present'
  useEffect(() => {
    const existing = records.find(r => r.classId === selectedClassId && r.date === selectedDate);
    if (existing) {
      setTemporaryAttendance(existing.records);
      setSessionNotes(existing.notes || '');
    } else {
      // Default to Present for all active class students
      const defaultState: Record<string, AttendanceStatus> = {};
      currentClassStudents.forEach(student => {
        defaultState[student.id] = 'Present';
      });
      setTemporaryAttendance(defaultState);
      setSessionNotes('');
    }
  }, [selectedClassId, selectedDate, currentClassStudents, records]);

  // --- ACTIONS ---
  
  // Set all students to a specific status (batch event)
  const handleBatchMark = (status: AttendanceStatus) => {
    const updated = { ...temporaryAttendance };
    currentClassStudents.forEach(student => {
      updated[student.id] = status;
    });
    setTemporaryAttendance(updated);
    
    // Add brief notes if they marked everyone present
    if (status === 'Present') {
      setSessionNotes(prev => prev || 'All student roll calls responded.');
    }
  };

  // Toggle single student status sequence
  const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
    setTemporaryAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Copy Previous recorded session status to today if present
  const handleCopyPreviousSession = () => {
    // Look for the latest recorded session for this class that is older than selectedDate
    const classRecordsRef = records
      .filter(r => r.classId === selectedClassId && r.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // descending sorted

    if (classRecordsRef.length > 0) {
      const latestPast = classRecordsRef[0];
      setTemporaryAttendance({ ...latestPast.records });
      setSessionNotes(`Duplicated sequence from prior record dated ${latestPast.date}.`);
      triggerToast(`Loaded entries from previous record (${latestPast.date})`);
    } else {
      triggerToast('No historical record available to copy for this class.');
    }
  };

  // Save/Update records
  const handleSaveAttendance = () => {
    const recordId = `${selectedClassId}_${selectedDate}`;
    
    // Validate if any student status is missing
    const missingCount = currentClassStudents.filter(s => !temporaryAttendance[s.id]).length;
    if (missingCount > 0) {
      triggerToast(`Please assign values for all ${missingCount} active students.`);
      return;
    }

    const updatedRecords = [...records];
    const existingIndex = updatedRecords.findIndex(r => r.id === recordId);

    const recordPayload: AttendanceRecord = {
      id: recordId,
      classId: selectedClassId,
      date: selectedDate,
      markedBy: activeClassDetails.advisor,
      timestamp: new Date().toISOString(),
      records: { ...temporaryAttendance },
      notes: sessionNotes.trim() || undefined
    };

    if (existingIndex > 0 || (existingIndex === 0 && updatedRecords.length > 0)) {
      updatedRecords[existingIndex] = recordPayload;
    } else {
      updatedRecords.push(recordPayload);
    }

    setRecords(updatedRecords);
    triggerToast(`Roll Call Saved! Recorded for ${activeClassDetails.name}.`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setIsSavedToastOpen(true);
    setTimeout(() => {
      setIsSavedToastOpen(false);
    }, 3800);
  };

  // Reset/Regenerate Mock Database
  const handleResetToFactorySeeding = () => {
    if (confirm('Verify: Reset to initial coursework demonstration records? This replaces raw edits.')) {
      localStorage.removeItem('sa_students');
      localStorage.removeItem('sa_records');
      setStudents(STUDENTS_SEED);
      setRecords(generateMockAttendanceHistory());
      triggerToast('Database re-seeded with previous 8 days records successfully!');
    }
  };

  // Add a new student directly in client
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('class-10a');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  const handleCreateStudent = (e: FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) {
      alert('Please fill out basic fields.');
      return;
    }
    const targetClass = STUDENTS_SEED.filter(s => s.classId === newStudentClass);
    const newRollOffset = String(targetClass.length + 1).padStart(2, '0');
    const classMeta = CLASSES.find(c => c.id === newStudentClass);
    const code = classMeta?.name.replace('Grade ', '') || '10A';
    
    const newStudent: Student = {
      id: `s-${Date.now()}`,
      name: newStudentName.trim(),
      rollNumber: `${code}-${newRollOffset}`,
      classId: newStudentClass,
      email: newStudentEmail.trim(),
      status: 'Active'
    };

    const nextStudents = [...students, newStudent];
    setStudents(nextStudents);
    setNewStudentName('');
    setNewStudentEmail('');
    setIsAddingStudent(false);
    triggerToast(`Added ${newStudent.name} successfully to ${classMeta?.name}!`);
  };

  const handleDeleteStudentRecord = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove student "${name}"? Historical records will be kept.`)) {
      setStudents(prev => prev.filter(s => s.id !== id));
      triggerToast(`Removed student record for ${name}`);
      if (selectedStudentId === id) setSelectedStudentId(null);
    }
  };

  // --- STATS CALCULATIONS (MEMOIZED) ---

  // Comprehensive Student attendance summary across records
  const studentStatsMap = useMemo<Record<string, { 
    total: number; 
    present: number; 
    absent: number; 
    late: number; 
    excused: number; 
    rate: number;
    history: { date: string; status: AttendanceStatus }[];
  }>>(() => {
    const stats: Record<string, { 
      total: number; 
      present: number; 
      absent: number; 
      late: number; 
      excused: number; 
      rate: number;
      history: { date: string; status: AttendanceStatus }[];
    }> = {};

    // Initialize map
    students.forEach(student => {
      stats[student.id] = { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100, history: [] };
    });

    // Pass through all records chronologically
    const sortedRecords = [...records].sort((a,b) => a.date.localeCompare(b.date));
    
    sortedRecords.forEach(record => {
      Object.entries(record.records).forEach(([studentId, status]) => {
        const castStatus = status as AttendanceStatus;
        if (!stats[studentId]) {
          // fallback placeholder
          stats[studentId] = { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0, history: [] };
        }
        
        stats[studentId].total++;
        if (castStatus === 'Present') stats[studentId].present++;
        else if (castStatus === 'Absent') stats[studentId].absent++;
        else if (castStatus === 'Late') stats[studentId].late++;
        else if (castStatus === 'Excused') stats[studentId].excused++;

        stats[studentId].history.push({
          date: record.date,
          status: castStatus
        });
      });
    });

    // Calculate rates
    Object.keys(stats).forEach(studentId => {
      const s = stats[studentId];
      if (s.total > 0) {
        // Weighted regular attendance credit: Present (100%), Excused (100%), Late (75%), Absent (0%)
        const credit = s.present + s.excused + (s.late * 0.75);
        s.rate = Math.round((credit / s.total) * 100);
      } else {
        s.rate = 100; // Treat as perfect if no markings exist yet
      }
    });

    return stats;
  }, [records, students]);

  // Overall General Attendance Rate (weighted)
  const generalAttendanceAverage = useMemo(() => {
    const totalStudentsMarked = Object.values(studentStatsMap) as { rate: number }[];
    if (totalStudentsMarked.length === 0) return 100;
    
    const sum = totalStudentsMarked.reduce((acc, current) => acc + current.rate, 0);
    return Math.round(sum / totalStudentsMarked.length);
  }, [studentStatsMap]);

  // Class-wise statistics average
  const classStatsComparison = useMemo(() => {
    const list: { classId: string; className: string; advisor: string; rate: number; count: number }[] = [];
    
    CLASSES.forEach(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      if (clsStudents.length === 0) {
        list.push({ classId: cls.id, className: cls.name, advisor: cls.advisor, rate: 100, count: 0 });
        return;
      }
      
      const sumRates = clsStudents.reduce((acc, stud) => acc + ((studentStatsMap[stud.id]?.rate ?? 100) as number), 0);
      const avgRate = Math.round(sumRates / clsStudents.length);
      list.push({
        classId: cls.id,
        className: cls.name,
        advisor: cls.advisor,
        rate: avgRate,
        count: clsStudents.length
      });
    });

    return list;
  }, [students, studentStatsMap]);

  // Flagged students lists under the user's specific warning limit (e.g., Attendance < 85%)
  const flaggedAtRiskStudents = useMemo(() => {
    return students
      .map(student => {
        const stats = studentStatsMap[student.id] || { rate: 100, total: 0, absent: 0, late: 0 };
        return {
          ...student,
          rate: stats.rate,
          totalDays: stats.total,
          absenteeCount: stats.absent,
          lateCount: stats.late,
          history: stats.history
        };
      })
      .filter(s => s.totalDays > 0 && s.rate < absenteeThreshold)
      .sort((a, b) => a.rate - b.rate); // Sort from highest severity (lowest attendance)
  }, [students, studentStatsMap, absenteeThreshold]);

  // Compute stats for Admin filtered list
  const filteredStudentsList = useMemo(() => {
    return students
      .map(s => {
        const stats = studentStatsMap[s.id] || { rate: 100, total: 0, present: 0, absent: 0, late: 0, excused: 0 };
        const cls = CLASSES.find(c => c.id === s.classId);
        return {
          ...s,
          className: cls?.name || 'Unknown',
          advisor: cls?.advisor || 'advisor',
          stats
        };
      })
      .filter(s => {
        const matchesClass = adminClassFilter === 'all' || s.classId === adminClassFilter;
        const matchesSearch = s.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                              s.rollNumber.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                              s.email.toLowerCase().includes(adminSearchQuery.toLowerCase());
        return matchesClass && matchesSearch;
      })
      .sort((a,b) => a.rollNumber.localeCompare(b.rollNumber));
  }, [students, studentStatsMap, adminClassFilter, adminSearchQuery]);

  // Active student for lookup view
  const activeLookupStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    const basic = students.find(s => s.id === selectedStudentId);
    if (!basic) return null;

    const stats = studentStatsMap[basic.id] || { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100, history: [] };
    const classMeta = CLASSES.find(c => c.id === basic.classId);

    return {
      ...basic,
      className: classMeta?.name || 'Outside Section',
      advisor: classMeta?.advisor || 'Teacher',
      room: classMeta?.room || '301',
      stats
    };
  }, [selectedStudentId, students, studentStatsMap]);

  // Handle setting student search dropdown selection
  const matchingQueryStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
      s.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [studentSearchQuery, students]);

  // Quick Calendar state day navigation
  const shiftSelectedDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-150 relative">
      
      {/* HEADER BAR styled with beautiful, charming student coursework banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
            
            {/* Branding with nice educational crest */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                <BookOpen className="h-6 w-6" id="brand-logo" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">EduTrack Roll Call</h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                    Academic Year 2026
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Submitted as Web-Dev Project Group 4 • Roll Call Portal
                </p>
              </div>
            </div>

            {/* Portal Navigation Hub */}
            <div className="flex flex-wrap items-center gap-2">
              <nav className="flex p-1 bg-slate-100 rounded-lg border border-slate-250">
                <button
                  id="tab-teacher"
                  onClick={() => { setCurrentView('teacher'); setSelectedStudentId(null); }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    currentView === 'teacher' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Teacher Portal</span>
                </button>
                <button
                  id="tab-admin"
                  onClick={() => { setCurrentView('admin'); setSelectedStudentId(null); }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    currentView === 'admin' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Admin Reports</span>
                </button>
                <button
                  id="tab-student"
                  onClick={() => { setCurrentView('student-lookup'); }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    currentView === 'student-lookup' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span>Student lookup</span>
                </button>
              </nav>

              <button
                id="tab-project"
                onClick={() => { setCurrentView('project-info'); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'project-info' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                }`}
                title="View Student team coursework contributors"
              >
                <Info className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden leading-none lg:inline">Project Mates</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* SUB-BAR Quick Database Simulator Tool */}
      <div className="bg-blue-900 text-blue-100 text-xs py-2 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SIMULATION ENGINE ONLINE : <b>{records.length}</b> attendance logs stored in client memory</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleResetToFactorySeeding} 
              className="hover:text-white underline decoration-blue-400 underline-offset-2 flex items-center gap-1 cursor-pointer transition-all"
            >
              <RotateCcw className="h-3 w-3" /> Reseed Mock History
            </button>
            <span className="text-blue-400">|</span>
            <button 
              onClick={() => {
                const generated = generateMockAttendanceHistory();
                setRecords(prev => [...prev, ...generated]);
                triggerToast(`Injected ${generated.length} additional random class history records!`);
              }}
              className="hover:text-white underline decoration-blue-400 underline-offset-2 flex items-center gap-1 cursor-pointer transition-all text-xs font-medium"
            >
              <Sparkles className="h-3 w-3 text-amber-300" /> Populate Random Days
            </button>
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {isSavedToastOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 z-50 bg-slate-900 text-white rounded-lg px-4 py-3.5 shadow-xl max-w-sm flex items-start gap-3 border border-slate-700"
          >
            <div className="p-1 rounded-full bg-blue-500 text-white">
              <Check className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">Notification</p>
              <p className="text-xs text-slate-300 mt-0.5">{toastMessage}</p>
            </div>
            <button onClick={() => setIsSavedToastOpen(false)} className="text-slate-400 hover:text-white text-xs">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 py-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VIEW 1: TEACHER WORKSPACE */}
        {currentView === 'teacher' && (
          <div className="space-y-6">
            
            {/* Header Control Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                {/* Intro section */}
                <div>
                  <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    Teacher Desk • Daily Roll-Call
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a date and class section below to fill out or update the registry record.
                  </p>
                </div>

                {/* Class / Date controllers */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Class Badge selectors */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {CLASSES.map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`text-xs px-3 py-1.5 font-semibold rounded-md transition-all ${
                          selectedClassId === cls.id 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        {cls.name}
                      </button>
                    ))}
                  </div>

                  {/* Day Picker */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                    <button 
                      onClick={() => shiftSelectedDate(-1)}
                      className="p-1 px-1.5 hover:bg-slate-100 text-slate-600 rounded transition-all"
                      title="Previous School Day"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-xs font-mono font-medium text-slate-700 bg-transparent py-1 border-0 focus:ring-0 cursor-pointer"
                    />

                    <button 
                      onClick={() => shiftSelectedDate(1)}
                      className="p-1 px-1.5 hover:bg-slate-100 text-slate-600 rounded transition-all"
                      title="Next School Day"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Inspector/Adviser Alert bar */}
              <div className="mt-4 pt-4 border-t border-slate-150 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Advisor:</span>
                  <span className="font-medium text-slate-800">{activeClassDetails.advisor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Assigned Classroom:</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {activeClassDetails.room}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:justify-end text-slate-500">
                  <span>Checked state: {records.some(r => r.classId === selectedClassId && r.date === selectedDate) ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1 inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" /> History Loaded!
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold inline-flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Unsaved Today
                    </span>
                  )}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Quick Actions:</span>
                <button
                  type="button"
                  onClick={() => handleBatchMark('Present')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium rounded-lg border border-emerald-100 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMark('Absent')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium rounded-lg border border-red-100 transition-all cursor-pointer"
                >
                  <XCircle className="h-3 w-3" />
                  Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={handleCopyPreviousSession}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-250 text-xs font-medium rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  Load Previous Roll Call
                </button>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Grade Population: <b>{currentClassStudents.length} Active</b> students
              </div>
            </div>

            {/* Attendance list container with notebook styling */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              
              {/* Table header */}
              <div className="grid grid-cols-12 bg-slate-50 py-3.5 px-6 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-5 sm:col-span-4 lg:col-span-5">Student Information</div>
                <div className="col-span-7 sm:col-span-8 lg:col-span-7 flex justify-end text-right">Attendance Status Markings</div>
              </div>

              {/* Student Rows */}
              <div className="divide-y divide-slate-150">
                {currentClassStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No active students assigned to this class section. Use "Add Student" below!
                  </div>
                ) : (
                  currentClassStudents.map((student, idx) => {
                    const currentStatus = temporaryAttendance[student.id] || 'Present';
                    const isAbsent = currentStatus === 'Absent';
                    const isLate = currentStatus === 'Late';
                    const isExcused = currentStatus === 'Excused';
                    const isPresent = currentStatus === 'Present';
                    
                    // Historical stats summary specifically for tooltip
                    const rate = studentStatsMap[student.id]?.rate ?? 100;
                    
                    return (
                      <div 
                        key={student.id} 
                        className={`grid grid-cols-12 items-center py-4 px-6 transition-all ${
                          isAbsent ? 'bg-red-50/15' : isLate ? 'bg-amber-50/10' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Student details column */}
                        <div className="col-span-5 sm:col-span-4 lg:col-span-5 flex items-center gap-3.5">
                          {/* Circular Badge Initials */}
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-display font-medium text-xs shadow-2xs ${
                            isPresent ? 'bg-emerald-100 text-emerald-800' :
                            isAbsent ? 'bg-red-100 text-red-800' :
                            isLate ? 'bg-amber-100 text-amber-800' :
                            'bg-sky-100 text-slate-800'
                          }`}>
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          
                          <div className="truncate">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-semibold text-slate-800 tracking-tight">{student.name}</span>
                              <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                #{student.rollNumber}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-2 truncate mt-0.5">
                              <span>{student.email}</span>
                              <span>•</span>
                              <span className={`font-semibold ${rate < 85 ? 'text-red-500' : 'text-slate-400'}`}>
                                Regularity: {rate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status toggles column */}
                        <div className="col-span-7 sm:col-span-8 lg:col-span-7 flex items-center justify-end">
                          <div className="flex flex-wrap sm:flex-nowrap items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-150">
                            
                            {/* PRESENT button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student.id, 'Present')}
                              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                isPresent 
                                  ? 'bg-emerald-500 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white hidden sm:inline"></span>
                              Present
                            </button>

                            {/* LATE button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student.id, 'Late')}
                              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                isLate 
                                  ? 'bg-amber-500 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-2 w-2 text-white font-bold hidden sm:inline-flex items-center justify-center">L</span>
                              Late
                            </button>

                            {/* ABSENT button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student.id, 'Absent')}
                              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                isAbsent 
                                  ? 'bg-red-500 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white hidden sm:inline"></span>
                              Absent
                            </button>

                            {/* EXCUSED button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student.id, 'Excused')}
                              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                isExcused 
                                  ? 'bg-blue-500 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-1 text-white hidden sm:inline">Exe</span>
                              Excused
                            </button>

                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Attendance Comments note & Trigger save */}
              <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-3/5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Teacher Desk Memo / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Enter school remarks (e.g., Emily represented school team, 3 late entries due to bus delay)"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-250 rounded-lg placeholder-slate-400 text-slate-700 outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>

                <div className="w-full md:w-auto flex justify-end gap-3 self-end">
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all hover:shadow-lg"
                  >
                    <Check className="h-5 w-5" />
                    Save Today's Attendance
                  </button>
                </div>
              </div>

            </div>

            {/* Quick interactive sidebar inside view for adding a new Student simulated database item */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              {!isAddingStudent ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
                      Class Roster Enrollment Office
                    </h3>
                    <p className="text-xs text-slate-500">
                      Simulate enrolling a new student intoGrade 10, 11, or 12 instantly.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingStudent(true)}
                    className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 text-xs font-semibold rounded-lg transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Enroll New Student
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">New Student Enrollment Entry</h4>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingStudent(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Student Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Johnathan Davis"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email ID</label>
                      <input 
                        type="email" 
                        required
                        placeholder="john.davis@school.edu"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class Section Assignment</label>
                      <select 
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-slate-800"
                      >
                        {CLASSES.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name} ({cls.advisor})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingStudent(false)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                    >
                      Confirm Enrollment
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: ADMIN ANALYTICS & MONITOR DECK */}
        {currentView === 'admin' && (
          <div className="space-y-6">
            
            {/* Overview KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Attendance Percentage */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">Overall regular average</span>
                    <h3 className="text-3xl font-bold font-display text-slate-950 mt-1">{generalAttendanceAverage}%</h3>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="h-5 w-5" />
                  </div>
                </div>
                {/* Visual mini chart */}
                <div className="mt-3.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${generalAttendanceAverage}%` }}></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 inline-block">Weighted formula credits late/excused marks</span>
                </div>
              </div>

              {/* Card 2: Severe Alerts (Absenteeism threshold under 85%) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">early absenteeism flags</span>
                    <h3 className="text-3xl font-bold font-display text-red-600 mt-1">{flaggedAtRiskStudents.length}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${Math.min(100, (flaggedAtRiskStudents.length / students.length) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 inline-block">Students falling under {absenteeThreshold}% presence</span>
                </div>
              </div>

              {/* Card 3: Total Recorded Days */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">historical databases logs</span>
                    <h3 className="text-3xl font-bold font-display text-blue-600 mt-1">{records.length}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>Sections tracked: {CLASSES.length}</span>
                  <span>Avg 8 entries/day</span>
                </div>
              </div>

              {/* Card 4: Total Student Body */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">Total enrolled students</span>
                    <h3 className="text-3xl font-bold font-display text-slate-900 mt-1">{students.length}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>10A: {students.filter(s => s.classId === 'class-10a').length}</span>
                  <span>• 11B: {students.filter(s => s.classId === 'class-11b').length}</span>
                  <span>• 12C: {students.filter(s => s.classId === 'class-12c').length}</span>
                </div>
              </div>

            </div>

            {/* Class-wise comparative charts panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Comparator lists */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Class Sectors Performance Benchmark</h3>
                    <p className="text-xs text-slate-400 font-mono">Compare cumulative attendance records across assigned courses</p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    Highest: {Math.max(...classStatsComparison.map(c => c.rate))}%
                  </span>
                </div>

                <div className="space-y-5">
                  {classStatsComparison.map(item => {
                    const isOptimal = item.rate >= 90;
                    return (
                      <div key={item.classId} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{item.className}</span>
                            <span className="text-slate-450 ml-2">({item.advisor} • Room {CLASSES.find(c => c.id === item.classId)?.room.replace('Room', '')})</span>
                          </div>
                          <span className={`font-mono font-bold text-sm ${isOptimal ? 'text-slate-800' : 'text-amber-600'}`}>
                            {item.rate}% Presence Log
                          </span>
                        </div>

                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              item.rate >= 93 ? 'bg-indigo-500' : item.rate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.rate}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{item.count} Active Students Marked</span>
                          <span>Alert index: {item.rate < 90 ? 'High Absenteeism Rate' : 'Healthy Regularity'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info Tip block */}
                <div className="mt-5 p-3.5 bg-blue-50 border border-blue-105 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 leading-relaxed">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <b>Did you know?</b> Attendance levels falling below 90% typically indicate early academic drop-out risks. Admins should schedule counselors to contact Grade advisor teachers in listed alert areas.
                  </div>
                </div>
              </div>

              {/* ABSENTEEISM ACTION DESK: Alert Trigger Config & Low Attenders list */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start pb-4 border-b border-zinc-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Absenteeism Warning Desk</h3>
                      <p className="text-xs text-slate-400">Identifies chronic absentees early for guidance</p>
                    </div>
                    <span className="animate-ping h-2.5 w-2.5 rounded-full bg-red-400 inline-block"></span>
                  </div>

                  {/* Threshold trigger controller */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-mono font-medium text-slate-600">
                      <span>Threshold alert trigger:</span>
                      <span className="font-bold text-red-600">{absenteeThreshold}% Attendance</span>
                    </div>
                    <input 
                      type="range" 
                      min="65" 
                      max="95" 
                      value={absenteeThreshold}
                      onChange={(e) => setAbsenteeThreshold(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600 outline-none"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>65% (Severe Drop)</span>
                      <span>85% (Our Standard)</span>
                      <span>95% (Excellent)</span>
                    </div>
                  </div>

                  {/* Scrollable list of flagged students */}
                  <div className="mt-5 space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {flaggedAtRiskStudents.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-mono">
                        ✓ Excellent! No students are currently below {absenteeThreshold}%.
                      </div>
                    ) : (
                      flaggedAtRiskStudents.map(student => (
                        <div 
                          key={student.id}
                          className="p-2.5 rounded-lg bg-red-50/40 border border-red-100/50 flex items-center justify-between gap-2.5"
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs font-bold text-slate-800 truncate">{student.name}</span>
                              <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                {student.rollNumber}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Advisor: {CLASSES.find(c => c.id === student.classId)?.advisor.split('. ')[1] || 'Teacher'}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-mono font-extrabold text-red-600 block">
                              {student.rate}%
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400">
                              {student.absenteeCount} absents
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 text-[10px] text-slate-450 font-mono">
                  {flaggedAtRiskStudents.length} of {students.length} students currently require early attendance intervention counseling.
                </div>
              </div>

            </div>

            {/* MASTER DATA DIRECTORY TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              
              {/* Header search parameters */}
              <div className="p-5 border-b border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">School Student Body Registry Directory</h3>
                  <p className="text-xs text-slate-400">Detailed overview of attendance percentages and credentials</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-60">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search name, roll, or email..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-250 rounded-lg outline-none placeholder-slate-400 text-slate-700 focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={adminClassFilter}
                    onChange={(e) => setAdminClassFilter(e.target.value)}
                    className="px-3.5 py-2 text-xs bg-white border border-slate-250 rounded-lg outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="all">All Grades Sections</option>
                    {CLASSES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Table details */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-6">Roll Number</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Grade (Section)</th>
                      <th className="py-3 px-4">Advisor Teacher</th>
                      <th className="py-3 px-4 text-center">Score Card Ratio</th>
                      <th className="py-3 px-4 text-center">Regularity Rate</th>
                      <th className="py-3 px-6 text-center">System Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                    {filteredStudentsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                          No registered student matching filter criteria found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudentsList.map(item => {
                        const score = item.stats;
                        const isUnder = score.rate < absenteeThreshold;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-6 font-mono font-semibold text-slate-500">#{item.rollNumber}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              <div>{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono font-medium">{item.email}</div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-600">{item.className}</td>
                            <td className="py-3 px-4 text-slate-500">{item.advisor}</td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span className="text-emerald-600" title="Present days">{score.present}P</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-amber-500" title="Late days">{score.late}L</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-red-500" title="Absent days">{score.absent}A</span>
                              <span className="text-indigo-400 mx-1">/</span>
                              <span className="text-blue-500" title="Excused days">{score.excused}E</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold">
                              <span className={`px-2 py-1 rounded ${isUnder ? 'bg-red-50 text-red-600 border border-red-100 font-extrabold' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold'}`}>
                                {score.rate}%
                              </span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(item.id);
                                    setCurrentView('student-lookup');
                                  }}
                                  className="px-2 py-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-all cursor-pointer"
                                >
                                  View profile
                                </button>
                                <button
                                  onClick={() => handleDeleteStudentRecord(item.id, item.name)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                  title="Delete Student account info"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: STUDENT SEARCH PROFILE & CONTRIBUTION GRID */}
        {currentView === 'student-lookup' && (
          <div className="space-y-6">
            
            {/* Search Hub Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-3xl mx-auto">
              <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-indigo-500" />
                Student Attendance Terminal Check
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Students can lookup their attendance history, regularity status, and attendance scorecard.
              </p>

              {/* Autocomplete Input container */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student full name or roll ID (e.g. Taylor, 10A-01, 11B...)"
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      if (selectedStudentId) setSelectedStudentId(null);
                    }}
                    className="w-full text-sm pl-10.5 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:border-indigo-500 transition-all font-sans"
                  />
                  {studentSearchQuery.trim() && (
                    <button 
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown list */}
                {studentSearchQuery.trim() && !selectedStudentId && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {matchingQueryStudents.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs font-mono">
                        No results found. Verify spelling or roll number structure.
                      </div>
                    ) : (
                      matchingQueryStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setStudentSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-all cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-xs text-slate-900 block">{student.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Roll: #{student.rollNumber} • Section: {CLASSES.find(c => c.id === student.classId)?.name}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Help Quick Chips */}
              {!selectedStudentId && !studentSearchQuery && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono mr-2">Try quick search:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {students.slice(0, 4).map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                      >
                        {s.name} ({s.rollNumber})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Looked up student Profile Card detail visualizer */}
            {activeLookupStudent ? (
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Master Badge Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center gap-5 shadow-xs">
                  
                  {/* Huge avatar initials with colorful accent circles */}
                  <div className={`h-20 w-20 rounded-2xl flex items-center justify-center text-3xl font-bold font-display shadow-sm ${
                    activeLookupStudent.stats.rate >= 90 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' :
                    activeLookupStudent.stats.rate >= 80 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                    'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                  }`}>
                    {activeLookupStudent.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>

                  {/* Profile info details */}
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 justify-center sm:justify-start">
                      <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">{activeLookupStudent.name}</h3>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block self-center">
                        Roll: #{activeLookupStudent.rollNumber}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-600 flex justify-center sm:justify-start items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      Class Sect: <span className="text-slate-800">{activeLookupStudent.className}</span> 
                      <span>•</span> Room {activeLookupStudent.room}
                    </p>
                    
                    <p className="text-xs text-slate-400 font-mono">
                      School Email: {activeLookupStudent.email}
                    </p>
                  </div>

                  {/* Presence score summary */}
                  <div className="text-center bg-slate-50 border border-slate-150 p-4 rounded-xl flex-shrink-0 min-w-36">
                    <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider font-mono">Regularity Rate</span>
                    <div className={`text-4xl font-extrabold font-display leading-none mt-1 ${
                      activeLookupStudent.stats.rate >= 90 ? 'text-emerald-600' :
                      activeLookupStudent.stats.rate >= 85 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {activeLookupStudent.stats.rate}%
                    </div>
                    <span className={`text-[10px] inline-block font-semibold px-2 py-0.5 rounded-md mt-1.5 ${
                      activeLookupStudent.stats.rate >= 93 ? 'bg-emerald-100 text-emerald-800' :
                      activeLookupStudent.stats.rate >= 85 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-850'
                    }`}>
                      {activeLookupStudent.stats.rate >= 93 ? 'Excellent A+' :
                       activeLookupStudent.stats.rate >= 85 ? 'Good Regularity' :
                       'Severe Absence Risk'}
                    </span>
                  </div>

                </div>

                {/* KPI score breakdown card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Present */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">Total present</span>
                    <div className="text-2xl font-bold font-display text-emerald-600 mt-1">{activeLookupStudent.stats.present} days</div>
                    <span className="text-[10px] text-zinc-400">Full attendance</span>
                  </div>

                  {/* Late */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">total late</span>
                    <div className="text-2xl font-bold font-display text-amber-600 mt-1">{activeLookupStudent.stats.late} days</div>
                    <span className="text-[10px] text-zinc-400">75% credit score</span>
                  </div>

                  {/* Absent */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">total absent</span>
                    <div className="text-2xl font-bold font-display text-red-600 mt-1">{activeLookupStudent.stats.absent} days</div>
                    <span className="text-[10px] text-zinc-400">Early alerts index</span>
                  </div>

                  {/* Excused */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">total excused</span>
                    <div className="text-2xl font-bold font-display text-blue-600 mt-1">{activeLookupStudent.stats.excused} days</div>
                    <span className="text-[10px] text-zinc-400">Medical or authorized</span>
                  </div>
                </div>

                {/* THE HIGHLIGHT: INTERACTIVE ATTENDANCE CHRONOLOGICAL CONTRIBUTIONS GRID (GitHub Style) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Coursework Presence Heatmap Grid</h4>
                      <p className="text-xs text-slate-400">Chronological daily check cards logged inside the administrative servers</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block"></span> Present
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-amber-500 inline-block"></span> Late
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-red-500 inline-block"></span> Absent
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-blue-500 inline-block"></span> Excused
                      </div>
                    </div>
                  </div>

                  {/* Grid of historic daily indicators */}
                  {activeLookupStudent.stats.history.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-mono">
                      No roll calls marked for Grade {activeLookupStudent.className} in records. Mark attendance inside Teacher Desk first!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Grid representation block */}
                      <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50 rounded-xl justify-center sm:justify-start">
                        {activeLookupStudent.stats.history.map((record, i) => {
                          const isP = record.status === 'Present';
                          const isA = record.status === 'Absent';
                          const isL = record.status === 'Late';
                          const isE = record.status === 'Excused';
                          
                          // friendly date represent formatting
                          const d = new Date(record.date);
                          const dayOf = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

                          return (
                            <div 
                              key={i} 
                              className={`h-11 w-11 rounded-lg flex flex-col justify-between items-center p-1.5 text-[9px] font-mono leading-none border transition-all hover:scale-105 select-none ${
                                isP ? 'bg-emerald-500 border-emerald-600/20 text-emerald-50' :
                                isA ? 'bg-red-500 border-red-600/20 text-red-50 animate-pulse' :
                                isL ? 'bg-amber-500 border-amber-600/20 text-amber-50' :
                                'bg-blue-500 border-blue-600/20 text-blue-50'
                              }`}
                              title={`Date: ${record.date} Status: ${record.status}`}
                            >
                              <span className="text-[8px] opacity-75">{dayOf.split(',')[0]}</span>
                              <span className="text-[12px] font-bold">
                                {isP ? 'P' : isA ? 'A' : isL ? 'L' : 'E'}
                              </span>
                              <span className="text-[8px] opacity-75">{d.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-slate-400 font-mono text-center sm:text-left">
                        Showing last {activeLookupStudent.stats.history.length} active school session records chronologically (left to right).
                      </p>
                    </div>
                  )}

                </div>

                {/* Scholastic Guidance recommendation Box */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-750">System Academic Counciling Advice</h5>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      {activeLookupStudent.stats.rate >= 93 ? (
                        'Congratulations! Your regularity rate is in the top tier (Grade Excellent A+). No actions required. High attendance directly correlates with strong course scores and lab mastery.'
                      ) : activeLookupStudent.stats.rate >= 85 ? (
                        'Your attendance score qualifies under standard board compliance metrics. Try to keep late entries to a minimum as they disrupt the initial classroom morning reminders.'
                      ) : (
                        `Warning: Your presence average has fallen to ${activeLookupStudent.stats.rate}% which triggers critical failure warnings. You are requested to schedule a desk meeting with Mr. Advisor (${activeLookupStudent.advisor}) and submit missed letters immediately.`
                      )}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
                      <span>Advisor Contact: mailto:{activeLookupStudent.email.replace('school.edu', 'advisory.edu')}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              // Empty search screen helper
              !studentSearchQuery.trim() && (
                <div className="text-center py-12 text-slate-400">
                  <span className="block text-4xl mb-2">🔍</span>
                  <p className="text-xs font-mono">Enter a search query above to look up detailed attendance charts.</p>
                </div>
              )
            )}

          </div>
        )}

        {/* VIEW 4: STUDENT TEAM PROJECT SUBMISSION DETAILS */}
        {currentView === 'project-info' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Main Notebook Spine themed header card */}
            <div className="bg-white border-l-4 border-amber-500 bg-linear-to-r from-amber-50/10 to-amber-50/5 rounded-2xl border-y border-r border-slate-200 p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-dashed border-slate-200">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                    Lab Assignment #3 Submission
                  </span>
                  <h2 className="text-2xl font-bold font-display text-slate-900 mt-2">Web Application Engineering Course</h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Subject Code: CSE-302 • Fall Semester 2026
                  </p>
                </div>

                {/* Simulated Grade sticker */}
                <div className="h-20 w-20 rounded-full border-4 border-double border-emerald-500/30 flex items-center justify-center text-center rotate-6 select-none shadow-2xs">
                  <div>
                    <span className="text-[10px] text-emerald-600 block leading-none font-bold">PROJECT</span>
                    <span className="text-2xl font-black text-emerald-600">A+</span>
                    <span className="text-[8px] text-slate-400 block leading-none font-mono">MARKED</span>
                  </div>
                </div>
              </div>

              {/* Problem Statement details */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Project Objective & Goal Checklist:</h4>
                <p className="text-sm text-slate-700 leading-relaxed font-sans">
                  "Build a lightweight, student-facing Student Attendance System tracking school sections. Teachers should be logged into their local workspace securely to update logs, whereas administrators can audit comparative trends and trigger warning alarms for students dropping below regularity norms."
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-650 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="p-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓</span>
                    <span>Multi-Section Class roster selections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓</span>
                    <span>Reactive KPIs (Absenteeism thresholds)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓</span>
                    <span>Interactive Github-style contribution heatmap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓</span>
                    <span>Dynamic Calendar scrolling & data copying</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members Bios layout */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-505 tracking-wider font-mono">Project Group #4 Contributor Mates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PROJECT_TEAM.map(member => (
                  <div 
                    key={member.rollId} 
                    className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{member.rollId}</span>
                      <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        CS Section C
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mt-2.5">{member.name}</h4>
                    <p className="text-xs text-indigo-600 font-medium">{member.role}</p>
                    
                    <p className="text-xs text-slate-500 leading-relaxed mt-3 border-t border-slate-100 pt-3 italic">
                      " {member.contribution} "
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* interactive review grade simulator */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center">
              <h4 className="text-sm font-bold text-slate-900 mb-1">Do you like Group 4's attendance engine coursework?</h4>
              <p className="text-xs text-slate-400 font-mono mb-4">Click "Submit Assignment" to simulate sending grades to Professor Evelyn Stone's portal.</p>
              
              {!showSubmissionSuccess ? (
                <button
                  onClick={() => {
                    setShowSubmissionSuccess(true);
                    triggerToast('Gradebook Entry Sent to Board Servers successfully!');
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4 text-emerald-400" />
                  Submit Assignment Report
                </button>
              ) : (
                <div className="max-w-md mx-auto p-4 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-800 text-xs text-center space-y-2">
                  <p className="font-bold">🎉 Homework Report successfully lodged!</p>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    "Thank you students for submitting the EduTrack system on time. All client-side indicators have compiled safely under Antigravity guidelines."
                  </p>
                  <button 
                    onClick={() => setShowSubmissionSuccess(false)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 underline font-semibold block mx-auto pt-1 cursor-pointer"
                  >
                    Resubmit homework
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR with Student group project credits */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-850 text-xs font-mono mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 border-b border-slate-800 pb-5">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-300">EduTrack School Roll Call System</p>
              <p className="text-[10px] mt-0.5 text-slate-500">Design submission for Web-Dev Lab assignment #3</p>
            </div>
            
            {/* Quick footer helper links */}
            <div className="flex gap-4 text-slate-550 text-[11px]">
              <button onClick={() => { setCurrentView('teacher'); setSelectedStudentId(null); }} className="hover:text-slate-300 cursor-pointer">Teacher Portal</button>
              <span>•</span>
              <button onClick={() => { setCurrentView('admin'); setSelectedStudentId(null); }} className="hover:text-slate-300 cursor-pointer">Admin Reports</button>
              <span>•</span>
              <button onClick={() => { setCurrentView('student-lookup'); }} className="hover:text-slate-300 cursor-pointer">Personal lookup</button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed w-full max-w-2xl mx-auto">
            This workspace utilizes local memory persistence inside the browser sandbox directory to protect classroom credentials. Clean state resets and seed simulations can be initialized instantly inside the top dashboard settings bar.
          </p>
          
          <p className="text-[10px] text-slate-600 pt-2 font-mono">
            &copy; 2026 Project Group #4 (Rithwik Rampuram, Suhas K., Ananya Rao). Released under Apache-2.0 License.
          </p>
        </div>
      </footer>

    </div>
  );
}
