import { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  Clock,
  Briefcase,
  LifeBuoy,
  FileText,
  Bell,
  Trash2,
  Upload,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDate, formatFileSize, getErrorMessage } from '../utils/formatters';

const TABS = [
  { key: 'students', label: 'Students', icon: Users },
  { key: 'courses', label: 'Academics', icon: BookOpen },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'marks', label: 'Marks', icon: Award },
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'placements', label: 'Placements', icon: Briefcase },
  { key: 'tickets', label: 'Support Tickets', icon: LifeBuoy },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Forms
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    department: 'Computer Science & Engineering',
    semester: 6,
    credits: 4,
    faculty_name: '',
    faculty_email: '',
    description: '',
    announcement: '',
  });
  const [attForm, setAttForm] = useState({
    student_id: '',
    course_id: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    remarks: '',
  });
  const [marksForm, setMarksForm] = useState({
    student_id: '',
    course_id: '',
    assessment_name: 'Internal Assessment 1',
    marks_obtained: 22,
    max_marks: 25,
    grade: 'A',
    remarks: '',
  });
  const [examForm, setExamForm] = useState({
    course_id: '',
    exam_type: 'End-Semester Exam',
    exam_date: new Date().toISOString().slice(0, 10),
    start_time: '09:30 AM',
    end_time: '12:30 PM',
    room: 'Block A - Hall 101',
    department: 'Computer Science & Engineering',
    semester: 6,
    announcement: '',
  });
  const [placementForm, setPlacementForm] = useState({
    company_name: '',
    role_title: '',
    package_lpa: 12,
    location: 'Bengaluru',
    job_type: 'Full-Time',
    min_cgpa: 7.5,
    eligible_departments: 'Computer Science & Engineering, Artificial Intelligence & Data Science',
    max_backlogs: 0,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    description: '',
    announcement: '',
  });
  const [ticketEdits, setTicketEdits] = useState({});
  const [docFile, setDocFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('handbook');
  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    category: 'academic',
  });

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [ov, st, cr, tt, pl, apps, tk, docs] = await Promise.all([
        campusService.getAdminOverview(),
        campusService.getAdminStudents(),
        campusService.getCourses(),
        campusService.getTimetable(),
        campusService.getPlacements(),
        campusService.getAdminPlacementApplications(),
        campusService.getAdminTickets(),
        campusService.getAdminDocuments(),
      ]);
      setOverview(ov);
      setStudents(st);
      setCourses(cr);
      setTimetable(tt);
      setPlacements(pl);
      setApplications(apps);
      setTickets(tk);
      setDocuments(docs);

      if (st.length > 0) {
        setAttForm((p) => ({ ...p, student_id: p.student_id || String(st[0].id) }));
        setMarksForm((p) => ({ ...p, student_id: p.student_id || String(st[0].id) }));
      }
      if (cr.length > 0) {
        setAttForm((p) => ({ ...p, course_id: p.course_id || String(cr[0].id) }));
        setMarksForm((p) => ({ ...p, course_id: p.course_id || String(cr[0].id) }));
        setExamForm((p) => ({ ...p, course_id: p.course_id || String(cr[0].id) }));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load admin console data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await campusService.createCourse({
        ...courseForm,
        semester: Number(courseForm.semester),
        credits: Number(courseForm.credits),
      });
      toast.success('Course added');
      setCourseForm({ ...courseForm, code: '', name: '', faculty_name: '', description: '', announcement: '' });
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add course'));
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await campusService.deleteCourse(id);
      toast.info('Course removed');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete course'));
    }
  };

  const handleRecordAttendance = async (e) => {
    e.preventDefault();
    try {
      await campusService.recordAttendance({
        ...attForm,
        student_id: Number(attForm.student_id),
        course_id: Number(attForm.course_id),
      });
      toast.success('Attendance recorded');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record attendance'));
    }
  };

  const handleRecordMarks = async (e) => {
    e.preventDefault();
    try {
      await campusService.recordMarks({
        ...marksForm,
        student_id: Number(marksForm.student_id),
        course_id: Number(marksForm.course_id),
        marks_obtained: Number(marksForm.marks_obtained),
        max_marks: Number(marksForm.max_marks),
      });
      toast.success('Internal marks saved');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save marks'));
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await campusService.createTimetableEntry({
        ...examForm,
        course_id: Number(examForm.course_id),
        semester: Number(examForm.semester),
      });
      toast.success('Examination schedule added');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add exam schedule'));
    }
  };

  const handleCreatePlacement = async (e) => {
    e.preventDefault();
    try {
      await campusService.createPlacement({
        ...placementForm,
        package_lpa: Number(placementForm.package_lpa),
        min_cgpa: Number(placementForm.min_cgpa),
        max_backlogs: Number(placementForm.max_backlogs),
      });
      toast.success('Placement opportunity published');
      setPlacementForm({ ...placementForm, company_name: '', role_title: '', description: '' });
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create placement drive'));
    }
  };

  const handleApplicationStatus = async (appId, status) => {
    try {
      await campusService.updatePlacementApplicationStatus(appId, status);
      toast.success('Application status updated');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update application status'));
    }
  };

  const handleUpdateTicket = async (ticket) => {
    const edit = ticketEdits[ticket.id] || {};
    try {
      await campusService.updateAdminTicket(ticket.id, {
        status: edit.status ?? ticket.status,
        admin_response: edit.admin_response ?? ticket.admin_response ?? '',
      });
      toast.success(`Ticket ${ticket.ticket_code} updated`);
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update support ticket'));
    }
  };

  const handleAdminUploadDoc = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle.trim() || docFile.name);
      formData.append('category', docCategory);
      await campusService.uploadAdminDocument(formData);
      toast.success('Public campus document uploaded & indexed into ChromaDB');
      setDocFile(null);
      setDocTitle('');
      await loadAllAdminData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Document upload failed'));
    }
  };

  const handleBroadcastNotification = async (e) => {
    e.preventDefault();
    try {
      await campusService.broadcastNotification(notifForm);
      toast.success('Notification broadcasted to all students');
      setNotifForm({ title: '', message: '', category: 'academic' });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send broadcast'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Management Console">
        <LoadingSpinner label="Loading campus administration data..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Management Console">
      <div className="space-y-6">
        {/* Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={overview?.total_students ?? students.length}
            subtitle={`${overview?.total_courses ?? courses.length} active courses`}
            icon={Users}
            accent="emerald"
          />
          <StatCard
            title="Avg Attendance Rate"
            value={`${overview?.average_attendance_percentage ?? 0}%`}
            subtitle="Campus-wide average"
            icon={CalendarCheck}
            accent="emerald"
          />
          <StatCard
            title="Open Support Tickets"
            value={overview?.open_tickets ?? 0}
            subtitle={`${tickets.length} total tickets`}
            icon={LifeBuoy}
            accent="amber"
          />
          <StatCard
            title="Indexed RAG Docs"
            value={overview?.total_documents ?? documents.length}
            subtitle={`${overview?.active_placements ?? placements.length} active placement drives`}
            icon={FileText}
            accent="sky"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  activeTab === tab.key
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : 'bg-[#141a22] border-[#232d3b] text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Views */}
        {activeTab === 'students' && (
          <DataTable
            columns={[
              { key: 'register_number', label: 'Reg No' },
              { key: 'full_name', label: 'Student Name' },
              { key: 'email', label: 'Email' },
              { key: 'department', label: 'Department' },
              { key: 'semester', label: 'Sem' },
              { key: 'cgpa', label: 'CGPA' },
              { key: 'advisor_name', label: 'Advisor' },
            ]}
            rows={students}
          />
        )}

        {activeTab === 'courses' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateCourse} className="campus-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Add New Course</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={courseForm.code}
                  onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="Code (e.g. CS605)"
                  className="campus-input"
                  required
                />
                <input
                  value={courseForm.name}
                  onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Course Name"
                  className="campus-input"
                  required
                />
                <input
                  value={courseForm.faculty_name}
                  onChange={(e) => setCourseForm((p) => ({ ...p, faculty_name: e.target.value }))}
                  placeholder="Faculty Name"
                  className="campus-input"
                  required
                />
                <input
                  value={courseForm.department}
                  onChange={(e) => setCourseForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Department"
                  className="campus-input"
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={courseForm.semester}
                  onChange={(e) => setCourseForm((p) => ({ ...p, semester: e.target.value }))}
                  placeholder="Semester"
                  className="campus-input"
                />
                <input
                  value={courseForm.faculty_email}
                  onChange={(e) => setCourseForm((p) => ({ ...p, faculty_email: e.target.value }))}
                  placeholder="Faculty Email"
                  className="campus-input"
                />
              </div>
              <input
                value={courseForm.description}
                onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Course description / syllabus summary"
                className="campus-input"
              />
              <button type="submit" className="campus-btn-primary">
                Add Course
              </button>
            </form>

            <DataTable
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'department', label: 'Department' },
                { key: 'semester', label: 'Sem' },
                { key: 'faculty_name', label: 'Faculty' },
                {
                  key: 'actions',
                  label: 'Action',
                  render: (row) => (
                    <button
                      onClick={() => handleDeleteCourse(row.id)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ),
                },
              ]}
              rows={courses}
            />
          </div>
        )}

        {activeTab === 'attendance' && (
          <form onSubmit={handleRecordAttendance} className="campus-card p-5 space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">Record Student Attendance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={attForm.student_id}
                onChange={(e) => setAttForm((p) => ({ ...p, student_id: e.target.value }))}
                className="campus-input"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.register_number} — {s.full_name}
                  </option>
                ))}
              </select>
              <select
                value={attForm.course_id}
                onChange={(e) => setAttForm((p) => ({ ...p, course_id: e.target.value }))}
                className="campus-input"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={attForm.date}
                onChange={(e) => setAttForm((p) => ({ ...p, date: e.target.value }))}
                className="campus-input"
              />
              <select
                value={attForm.status}
                onChange={(e) => setAttForm((p) => ({ ...p, status: e.target.value }))}
                className="campus-input"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <input
              value={attForm.remarks}
              onChange={(e) => setAttForm((p) => ({ ...p, remarks: e.target.value }))}
              placeholder="Remarks (optional)"
              className="campus-input"
            />
            <button type="submit" className="campus-btn-primary">
              Save Attendance Record
            </button>
          </form>
        )}

        {activeTab === 'marks' && (
          <form onSubmit={handleRecordMarks} className="campus-card p-5 space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">Record Internal Marks</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={marksForm.student_id}
                onChange={(e) => setMarksForm((p) => ({ ...p, student_id: e.target.value }))}
                className="campus-input"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.register_number} — {s.full_name}
                  </option>
                ))}
              </select>
              <select
                value={marksForm.course_id}
                onChange={(e) => setMarksForm((p) => ({ ...p, course_id: e.target.value }))}
                className="campus-input"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <input
                value={marksForm.assessment_name}
                onChange={(e) => setMarksForm((p) => ({ ...p, assessment_name: e.target.value }))}
                placeholder="Assessment Name"
                className="campus-input"
                required
              />
              <input
                value={marksForm.grade}
                onChange={(e) => setMarksForm((p) => ({ ...p, grade: e.target.value }))}
                placeholder="Grade (e.g. A+)"
                className="campus-input"
              />
              <input
                type="number"
                step="0.5"
                value={marksForm.marks_obtained}
                onChange={(e) => setMarksForm((p) => ({ ...p, marks_obtained: e.target.value }))}
                placeholder="Marks Obtained"
                className="campus-input"
                required
              />
              <input
                type="number"
                step="0.5"
                value={marksForm.max_marks}
                onChange={(e) => setMarksForm((p) => ({ ...p, max_marks: e.target.value }))}
                placeholder="Max Marks"
                className="campus-input"
                required
              />
            </div>
            <button type="submit" className="campus-btn-primary">
              Save Internal Marks
            </button>
          </form>
        )}

        {activeTab === 'timetable' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateExam} className="campus-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Schedule Examination</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={examForm.course_id}
                  onChange={(e) => setExamForm((p) => ({ ...p, course_id: e.target.value }))}
                  className="campus-input"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <input
                  value={examForm.exam_type}
                  onChange={(e) => setExamForm((p) => ({ ...p, exam_type: e.target.value }))}
                  placeholder="Exam Type"
                  className="campus-input"
                />
                <input
                  type="date"
                  value={examForm.exam_date}
                  onChange={(e) => setExamForm((p) => ({ ...p, exam_date: e.target.value }))}
                  className="campus-input"
                />
                <input
                  value={examForm.start_time}
                  onChange={(e) => setExamForm((p) => ({ ...p, start_time: e.target.value }))}
                  placeholder="Start Time"
                  className="campus-input"
                />
                <input
                  value={examForm.end_time}
                  onChange={(e) => setExamForm((p) => ({ ...p, end_time: e.target.value }))}
                  placeholder="End Time"
                  className="campus-input"
                />
                <input
                  value={examForm.room}
                  onChange={(e) => setExamForm((p) => ({ ...p, room: e.target.value }))}
                  placeholder="Room / Hall"
                  className="campus-input"
                />
              </div>
              <button type="submit" className="campus-btn-primary">
                Add Schedule Entry
              </button>
            </form>

            <DataTable
              columns={[
                { key: 'exam_date', label: 'Date', render: (r) => formatDate(r.exam_date) },
                { key: 'course_code', label: 'Code' },
                { key: 'course_name', label: 'Subject' },
                { key: 'exam_type', label: 'Type' },
                { key: 'room', label: 'Room' },
                {
                  key: 'del',
                  label: 'Action',
                  render: (r) => (
                    <button
                      onClick={async () => {
                        await campusService.deleteTimetableEntry(r.id);
                        loadAllAdminData();
                      }}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ),
                },
              ]}
              rows={timetable}
            />
          </div>
        )}

        {activeTab === 'placements' && (
          <div className="space-y-6">
            <form onSubmit={handleCreatePlacement} className="campus-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Create Placement Drive</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={placementForm.company_name}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="Company Name"
                  className="campus-input"
                  required
                />
                <input
                  value={placementForm.role_title}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, role_title: e.target.value }))}
                  placeholder="Role Title"
                  className="campus-input"
                  required
                />
                <input
                  type="number"
                  step="0.5"
                  value={placementForm.package_lpa}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, package_lpa: e.target.value }))}
                  placeholder="Package LPA"
                  className="campus-input"
                />
                <input
                  value={placementForm.location}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Location"
                  className="campus-input"
                />
                <input
                  type="number"
                  step="0.1"
                  value={placementForm.min_cgpa}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, min_cgpa: e.target.value }))}
                  placeholder="Min CGPA"
                  className="campus-input"
                />
                <input
                  type="date"
                  value={placementForm.deadline}
                  onChange={(e) => setPlacementForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="campus-input"
                />
              </div>
              <input
                value={placementForm.description}
                onChange={(e) => setPlacementForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Job description and selection rounds"
                className="campus-input"
              />
              <button type="submit" className="campus-btn-primary">
                Publish Placement Opportunity
              </button>
            </form>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Student Applications</h3>
              <DataTable
                columns={[
                  { key: 'student_name', label: 'Student' },
                  { key: 'register_number', label: 'Reg No' },
                  { key: 'company_name', label: 'Company' },
                  { key: 'role_title', label: 'Role' },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (row) => (
                      <select
                        value={row.status}
                        onChange={(e) => handleApplicationStatus(row.id, e.target.value)}
                        className="campus-input py-1 px-2 text-xs w-44"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    ),
                  },
                ]}
                rows={applications}
              />
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {tickets.map((t) => {
              const edit = ticketEdits[t.id] || {};
              return (
                <div key={t.id} className="campus-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 mr-2">
                        {t.ticket_code}
                      </span>
                      <span className="text-sm font-semibold text-white">{t.subject}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Student: {t.student_name} ({t.register_number})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">{t.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <select
                      value={edit.status ?? t.status}
                      onChange={(e) =>
                        setTicketEdits((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], status: e.target.value },
                        }))
                      }
                      className="campus-input"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <input
                      value={edit.admin_response ?? t.admin_response ?? ''}
                      onChange={(e) =>
                        setTicketEdits((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], admin_response: e.target.value },
                        }))
                      }
                      placeholder="Write admin response..."
                      className="campus-input sm:col-span-2"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdateTicket(t)}
                    className="campus-btn-primary py-1.5 text-xs"
                  >
                    Update Ticket
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <form onSubmit={handleAdminUploadDoc} className="campus-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Upload Official Public University Document (ChromaDB RAG)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document Title"
                  className="campus-input"
                />
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="campus-input"
                >
                  <option value="handbook">University Handbook</option>
                  <option value="syllabus">Official Syllabus</option>
                  <option value="circular">Official Circular</option>
                  <option value="placement">Placement Policy</option>
                </select>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-300"
                />
              </div>
              <button type="submit" disabled={!docFile} className="campus-btn-primary">
                <Upload className="w-4 h-4" />
                <span>Upload Public RAG Document</span>
              </button>
            </form>

            <DataTable
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'filename', label: 'File' },
                { key: 'category', label: 'Category' },
                { key: 'visibility', label: 'Visibility' },
                { key: 'chunk_count', label: 'Chunks' },
                {
                  key: 'size',
                  label: 'Size',
                  render: (r) => formatFileSize(r.file_size),
                },
                {
                  key: 'del',
                  label: 'Action',
                  render: (r) => (
                    <button
                      onClick={async () => {
                        await campusService.deleteAdminDocument(r.id);
                        loadAllAdminData();
                      }}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ),
                },
              ]}
              rows={documents}
            />
          </div>
        )}

        {activeTab === 'notifications' && (
          <form onSubmit={handleBroadcastNotification} className="campus-card p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold text-white">Broadcast Campus Notification</h3>
            <select
              value={notifForm.category}
              onChange={(e) => setNotifForm((p) => ({ ...p, category: e.target.value }))}
              className="campus-input"
            >
              <option value="academic">Academic</option>
              <option value="exam">Examination</option>
              <option value="placement">Placement</option>
              <option value="attendance">Attendance</option>
            </select>
            <input
              value={notifForm.title}
              onChange={(e) => setNotifForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Notification Title"
              className="campus-input"
              required
            />
            <textarea
              rows={4}
              value={notifForm.message}
              onChange={(e) => setNotifForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Notification message for all students..."
              className="campus-input"
              required
            />
            <button type="submit" className="campus-btn-primary">
              Send Broadcast Notification
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

