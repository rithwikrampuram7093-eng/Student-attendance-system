/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  email: string;
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
}

export interface ClassSection {
  id: string;
  name: string;
  advisor: string;
  room: string;
}

export interface AttendanceRecord {
  id: string; // classId_date
  classId: string;
  date: string; // YYYY-MM-DD
  markedBy: string;
  timestamp: string;
  records: Record<string, AttendanceStatus>; // studentId -> status
  notes?: string;
}

export interface ProjectTeamMember {
  name: string;
  rollId: string;
  role: string;
  contribution: string;
}
