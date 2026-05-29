/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ClassSection, AttendanceRecord, AttendanceStatus, ProjectTeamMember } from './types';

export const CLASSES: ClassSection[] = [
  { id: 'class-10a', name: 'Grade 10-A', advisor: 'Mrs. Sarah Harrison', room: 'Room 301' },
  { id: 'class-11b', name: 'Grade 11-B', advisor: 'Mr. Robert Chen', room: 'Room 404' },
  { id: 'class-12c', name: 'Grade 12-C', advisor: 'Miss Evelyn Stone', room: 'Science Lab B' }
];

export const STUDENTS_SEED: Student[] = [
  // Grade 10-A
  { id: 's-101', name: 'Arjun Mehta', rollNumber: '10A-01', classId: 'class-10a', email: 'arjun.mehta@school.edu', status: 'Active' },
  { id: 's-102', name: 'Bella Thorne', rollNumber: '10A-02', classId: 'class-10a', email: 'bella.t@school.edu', status: 'Active' },
  { id: 's-103', name: 'Chao Wang', rollNumber: '10A-03', classId: 'class-10a', email: 'chao.wang@school.edu', status: 'Active' },
  { id: 's-104', name: 'Daniel Kim', rollNumber: '10A-04', classId: 'class-10a', email: 'daniel.kim@school.edu', status: 'Active' },
  { id: 's-105', name: 'Emily Watson', rollNumber: '10A-05', classId: 'class-10a', email: 'emily.w@school.edu', status: 'Active' },
  { id: 's-106', name: 'Fahad Al-Mansoor', rollNumber: '10A-06', classId: 'class-10a', email: 'fahad.am@school.edu', status: 'Active' },
  { id: 's-107', name: 'Grace Hopper', rollNumber: '10A-07', classId: 'class-10a', email: 'grace.h@school.edu', status: 'Active' },
  { id: 's-108', name: 'Haruto Tanaka', rollNumber: '10A-08', classId: 'class-10a', email: 'haruto.t@school.edu', status: 'Active' },
  
  // Grade 11-B
  { id: 's-201', name: 'Ishita Roy', rollNumber: '11B-01', classId: 'class-11b', email: 'ishita.r@school.edu', status: 'Active' },
  { id: 's-202', name: 'Jamal Crawford', rollNumber: '11B-02', classId: 'class-11b', email: 'jamal.c@school.edu', status: 'Active' },
  { id: 's-203', name: 'Katherine Pierce', rollNumber: '11B-03', classId: 'class-11b', email: 'katherine.p@school.edu', status: 'Active' },
  { id: 's-204', name: 'Liam Neeson', rollNumber: '11B-04', classId: 'class-11b', email: 'liam.n@school.edu', status: 'Active' },
  { id: 's-205', name: 'Maya Angelou', rollNumber: '11B-05', classId: 'class-11b', email: 'maya.a@school.edu', status: 'Active' },
  { id: 's-206', name: 'Noah Centineo', rollNumber: '11B-06', classId: 'class-11b', email: 'noah.c@school.edu', status: 'Active' },
  { id: 's-207', name: 'Olivia Rodrigo', rollNumber: '11B-07', classId: 'class-11b', email: 'olivia.r@school.edu', status: 'Active' },
  { id: 's-208', name: 'Priya Patel', rollNumber: '11B-08', classId: 'class-11b', email: 'priya.patel@school.edu', status: 'Active' },

  // Grade 12-C
  { id: 's-301', name: 'Quentin Tarantino', rollNumber: '12C-01', classId: 'class-12c', email: 'quentin.t@school.edu', status: 'Active' },
  { id: 's-302', name: 'Riya Sen', rollNumber: '12C-02', classId: 'class-12c', email: 'riya.sen@school.edu', status: 'Active' },
  { id: 's-303', name: 'Samuel L. Jackson', rollNumber: '12C-03', classId: 'class-12c', email: 'sam.jackson@school.edu', status: 'Active' },
  { id: 's-304', name: 'Taylor Swift', rollNumber: '12C-04', classId: 'class-12c', email: 'taylor.s@school.edu', status: 'Active' },
  { id: 's-305', name: 'Usain Bolt', rollNumber: '12C-05', classId: 'class-12c', email: 'usain.b@school.edu', status: 'Active' },
  { id: 's-306', name: 'Victoria Beckham', rollNumber: '12C-06', classId: 'class-12c', email: 'victoria.b@school.edu', status: 'Active' },
  { id: 's-307', name: 'William Shakespeare', rollNumber: '12C-07', classId: 'class-12c', email: 'will.s@school.edu', status: 'Active' },
  { id: 's-308', name: 'Xavier Woods', rollNumber: '12C-08', classId: 'class-12c', email: 'xavier.w@school.edu', status: 'Active' }
];

export const PROJECT_TEAM: ProjectTeamMember[] = [
  { name: 'Rithwik Rampuram', rollId: 'CS2026-042', role: 'Team Lead & UI Designer', contribution: 'Designed responsive notebook UI dashboard layout using React & TailwindCSS.' },
  { name: 'Suhas K.', rollId: 'CS2026-089', role: 'Frontend Engineer', contribution: 'Developed state persistence engine, mock attendance generator, and stats filters.' },
  { name: 'Ananya Rao', rollId: 'CS2026-015', role: 'Analytics Designer', contribution: 'Crafted student attendance contribution grids and status alerts.' }
];

// Helper to generate history for past N days (excluding weekends)
export function generateMockAttendanceHistory(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Last 10 days
  let count = 0;
  let dayOffset = 1;
  
  while (count < 8) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - dayOffset);
    const dayOfWeek = checkDate.getDay();
    
    // Skip weekends (0 is Sunday, 6 is Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Seed attendance for each of our 3 classes
      for (const cls of CLASSES) {
        const classStudents = STUDENTS_SEED.filter(s => s.classId === cls.id);
        const recordsMap: Record<string, AttendanceStatus> = {};
        
        classStudents.forEach(student => {
          const rand = Math.random();
          let status: AttendanceStatus = 'Present';
          
          // Let's create some interesting persistent properties for specific students
          // e.g., 's-105' (Emily Watson) is often absent
          // e.g., 's-204' (Liam Neeson) is often late
          // e.g., 's-305' (Usain Bolt) is fast and 100% present
          if (student.id === 's-105') {
            status = rand < 0.45 ? 'Present' : (rand < 0.8 ? 'Absent' : 'Excused');
          } else if (student.id === 's-204') {
            status = rand < 0.3 ? 'Present' : (rand < 0.8 ? 'Late' : 'Absent');
          } else if (student.id === 's-305') {
            status = 'Present';
          } else {
            // General standard high attendance
            if (rand < 0.85) status = 'Present';
            else if (rand < 0.92) status = 'Late';
            else if (rand < 0.97) status = 'Absent';
            else status = 'Excused';
          }
          
          recordsMap[student.id] = status;
        });

        records.push({
          id: `${cls.id}_${dateString}`,
          classId: cls.id,
          date: dateString,
          markedBy: cls.advisor,
          timestamp: `${dateString}T08:45:00Z`,
          records: recordsMap,
          notes: Math.random() > 0.70 ? 'Cooperative participation. Morning assembly finished on time.' : undefined
        });
      }
      count++;
    }
    dayOffset++;
  }
  
  return records;
}
