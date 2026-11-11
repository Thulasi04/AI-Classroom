import api from './api';

export const campusService = {
  // Dashboard & Profile
  getDashboardSummary: () => api.get('/students/me/dashboard').then((r) => r.data),
  getMyProfile: () => api.get('/students/me').then((r) => r.data),
  updateMyProfile: (payload) => api.put('/students/me', payload).then((r) => r.data),
  getNotifications: () => api.get('/students/notifications').then((r) => r.data),
  markNotificationRead: (id) => api.patch(`/students/notifications/${id}/read`).then((r) => r.data),

  // Academics
  getCourses: (params) => api.get('/courses', { params }).then((r) => r.data),
  getAttendance: (params) => api.get('/attendance/me', { params }).then((r) => r.data),
  getMarks: () => api.get('/marks/me').then((r) => r.data),
  getTimetable: (params) => api.get('/timetable', { params }).then((r) => r.data),

  // Placements
  getPlacements: () => api.get('/placements').then((r) => r.data),
  getMyApplications: () => api.get('/placements/applications/me').then((r) => r.data),
  applyForPlacement: (id) => api.post(`/placements/${id}/apply`).then((r) => r.data),

  // Campus Services
  getCampusServices: (category) =>
    api.get('/campus-services', { params: category ? { category } : {} }).then((r) => r.data),

  // Support Tickets
  getMyTickets: () => api.get('/support/tickets').then((r) => r.data),
  createTicket: (payload) => api.post('/support/tickets', payload).then((r) => r.data),

  // Documents
  getDocuments: () => api.get('/documents').then((r) => r.data),
  uploadDocument: (formData, onProgress) =>
    api
      .post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      })
      .then((r) => r.data),
  deleteDocument: (id) => api.delete(`/documents/${id}`).then((r) => r.data),

  // Admin
  getAdminOverview: () => api.get('/admin/overview').then((r) => r.data),
  getAdminStudents: () => api.get('/admin/students').then((r) => r.data),
  createCourse: (payload) => api.post('/admin/courses', payload).then((r) => r.data),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`).then((r) => r.data),
  recordAttendance: (payload) => api.post('/admin/attendance', payload).then((r) => r.data),
  recordMarks: (payload) => api.post('/admin/marks', payload).then((r) => r.data),
  createTimetableEntry: (payload) => api.post('/admin/timetable', payload).then((r) => r.data),
  deleteTimetableEntry: (id) => api.delete(`/admin/timetable/${id}`).then((r) => r.data),
  createPlacement: (payload) => api.post('/admin/placements', payload).then((r) => r.data),
  getAdminPlacementApplications: () =>
    api.get('/admin/placements/applications').then((r) => r.data),
  updatePlacementApplicationStatus: (id, status) =>
    api.patch(`/admin/placements/applications/${id}`, { status }).then((r) => r.data),
  getAdminTickets: () => api.get('/admin/tickets').then((r) => r.data),
  updateAdminTicket: (id, payload) =>
    api.patch(`/admin/tickets/${id}`, payload).then((r) => r.data),
  getAdminDocuments: () => api.get('/admin/documents').then((r) => r.data),
  uploadAdminDocument: (formData, onProgress) =>
    api
      .post('/admin/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      })
      .then((r) => r.data),
  deleteAdminDocument: (id) => api.delete(`/admin/documents/${id}`).then((r) => r.data),
  broadcastNotification: (payload) => api.post('/admin/notifications', payload).then((r) => r.data),
};

