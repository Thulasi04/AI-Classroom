import { Calendar, MapPin, Clock } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function UpcomingExamsCard({ exams = [] }) {
  return (
    <div className="campus-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Upcoming Examinations</h3>
      </div>

      {exams.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">No upcoming exams scheduled.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="p-3.5 rounded-lg bg-[#10151c] border border-[#202937] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="text-xs font-semibold text-emerald-400">{exam.course_code}</p>
                <p className="text-sm font-medium text-white">{exam.course_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{exam.exam_type}</p>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-300 space-y-1">
                <div className="font-medium text-white">{formatDate(exam.exam_date)}</div>
                <div className="flex sm:justify-end items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{exam.start_time} - {exam.end_time}</span>
                </div>
                <div className="flex sm:justify-end items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span>{exam.room}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

