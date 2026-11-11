from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.database.models import (
    Attendance,
    CampusService,
    Course,
    Document,
    InternalMark,
    Notification,
    PlacementApplication,
    PlacementOpportunity,
    StudentProfile,
    SupportTicket,
    Timetable,
    User,
)
from app.rag.document_processor import chunk_text
from app.rag.vector_store import get_vector_store


OFFICIAL_RAG_DOCS = [
    {
        "title": "University Academic & Examination Regulations Handbook 2026",
        "filename": "academic_regulations_2026.txt",
        "category": "handbook",
        "content": (
            "UNIVERSITY ACADEMIC & EXAMINATION REGULATIONS 2026\n\n"
            "1. Attendance Policy:\n"
            "Students must maintain a minimum of 75% attendance in each registered course during a semester "
            "to be eligible to appear in the End-Semester Examinations. Students with attendance between "
            "65% and 74% may apply for condonation only on verified medical grounds with Head of Department approval.\n\n"
            "2. Internal Assessment Weightage:\n"
            "Each theory course carries 50 internal assessment marks distributed across Internal Assessment 1 (25 marks), "
            "Internal Assessment 2 (25 marks), and Assignments/Lab Evaluation (25 marks) normalized to 40% of total course grade, "
            "while the End-Semester Examination accounts for 60%.\n\n"
            "3. Examination Hall Rules:\n"
            "Students must carry their University ID card and Hall Ticket 20 minutes prior to examination start time. "
            "Programmable calculators and smartwatches are strictly prohibited inside examination halls.\n\n"
            "4. Grading Scale:\n"
            "O (90-100%), A+ (80-89%), A (70-79%), B+ (60-69%), B (50-59%), C (40-49%). Minimum pass mark is 40%."
        ),
    },
    {
        "title": "B.Tech CSE Semester 6 Curriculum & Syllabus Guide",
        "filename": "cse_sem6_syllabus.txt",
        "category": "syllabus",
        "content": (
            "B.TECH COMPUTER SCIENCE & ENGINEERING - SEMESTER 6 SYLLABUS\n\n"
            "CS601 - Machine Learning & Neural Networks (4 Credits):\n"
            "Supervised and unsupervised learning, SVMs, decision trees, ensemble methods, backpropagation, CNNs, and Transformers.\n\n"
            "CS602 - Distributed Systems & Cloud Architecture (4 Credits):\n"
            "Clock synchronization, Raft consensus, MapReduce, microservices, container orchestration, and fault-tolerant storage.\n\n"
            "CS603 - Compiler Design (3 Credits):\n"
            "Lexical analysis, LL(1)/LR(1) parsing, syntax-directed translation, intermediate code generation, and code optimization.\n\n"
            "CS604 - Information & Network Security (3 Credits):\n"
            "Symmetric and asymmetric cryptography, TLS/PKI, OAuth2/JWT security, OWASP Top 10, and intrusion detection.\n\n"
            "CS605 - Capstone Software Engineering Lab (2 Credits):\n"
            "Agile full-stack system design, automated CI/CD, API testing, and production observability."
        ),
    },
    {
        "title": "Campus Placement Policy & Career Cell Guidelines",
        "filename": "placement_policy_2026.txt",
        "category": "placement",
        "content": (
            "CAMPUS PLACEMENT CELL GUIDELINES 2026\n\n"
            "1. Eligibility Criteria:\n"
            "Students in Semester 6 and above with zero active backlogs and meeting the company's minimum CGPA threshold "
            "are eligible to register for campus placement drives via the Placement Portal.\n\n"
            "2. Dream & Super-Dream Offers:\n"
            "Students securing an offer below 8 LPA remain eligible for Dream tier drives (8-15 LPA) and Super-Dream drives (>15 LPA). "
            "Once a student accepts a Super-Dream offer, they exit further placement rounds to preserve opportunities for peers.\n\n"
            "3. Pre-Placement Preparation:\n"
            "Mock technical interviews and coding clinics run every Wednesday and Friday from 4:00 PM to 6:00 PM at Innovation Block Seminar Hall 2."
        ),
    },
]


def seed_database(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    settings = get_settings()
    today = date.today()

    # 1. Users
    admin_user = User(
        email="admin@campus.edu",
        password_hash=hash_password("Admin@1234"),
        full_name="Dr. Ramesh Iyer",
        role="admin",
        is_active=True,
    )
    student_1 = User(
        email="arjun.mehta@campus.edu",
        password_hash=hash_password("Student@1234"),
        full_name="Arjun Mehta",
        role="student",
        is_active=True,
    )
    student_2 = User(
        email="priya.nair@campus.edu",
        password_hash=hash_password("Student@1234"),
        full_name="Priya Nair",
        role="student",
        is_active=True,
    )
    db.add_all([admin_user, student_1, student_2])
    db.flush()

    # 2. Student Profiles
    profile_1 = StudentProfile(
        user_id=student_1.id,
        register_number="22CS1001",
        department="Computer Science & Engineering",
        semester=6,
        section="A",
        batch_year="2022-2026",
        cgpa=8.65,
        phone="+91 98765 43210",
        hostel_resident=True,
        advisor_name="Dr. Kavitha Nair",
    )
    profile_2 = StudentProfile(
        user_id=student_2.id,
        register_number="22CS1002",
        department="Computer Science & Engineering",
        semester=6,
        section="A",
        batch_year="2022-2026",
        cgpa=7.40,
        phone="+91 98765 11223",
        hostel_resident=False,
        advisor_name="Dr. Kavitha Nair",
    )
    db.add_all([profile_1, profile_2])
    db.flush()

    # 3. Courses
    courses = [
        Course(
            code="CS601",
            name="Machine Learning & Neural Networks",
            department="Computer Science & Engineering",
            semester=6,
            credits=4,
            faculty_name="Dr. Ananya Rao",
            faculty_email="ananya.rao@campus.edu",
            description="Supervised learning, deep neural networks, backpropagation, and transformer architectures.",
            announcement="Project proposal abstract submission due next Monday by 5:00 PM.",
        ),
        Course(
            code="CS602",
            name="Distributed Systems & Cloud Architecture",
            department="Computer Science & Engineering",
            semester=6,
            credits=4,
            faculty_name="Prof. Vikram Menon",
            faculty_email="vikram.menon@campus.edu",
            description="Consensus protocols (Raft/Paxos), distributed storage, Kubernetes, and fault tolerance.",
            announcement="Cloud lab assignment 2 has been published on the department portal.",
        ),
        Course(
            code="CS603",
            name="Compiler Design",
            department="Computer Science & Engineering",
            semester=6,
            credits=3,
            faculty_name="Dr. Suresh Kulkarni",
            faculty_email="suresh.k@campus.edu",
            description="Lexical analysis, LL/LR parsers, syntax-directed translation, and LLVM IR optimization.",
            announcement=None,
        ),
        Course(
            code="CS604",
            name="Information & Network Security",
            department="Computer Science & Engineering",
            semester=6,
            credits=3,
            faculty_name="Dr. Meera Krishnan",
            faculty_email="meera.k@campus.edu",
            description="Applied cryptography, TLS 1.3, OAuth2/JWT security, and secure software architecture.",
            announcement="Guest lecture on Zero-Trust Cloud Security this Friday at 2:00 PM.",
        ),
        Course(
            code="CS605",
            name="Capstone Software Engineering Lab",
            department="Computer Science & Engineering",
            semester=6,
            credits=2,
            faculty_name="Prof. Karthik Subramanian",
            faculty_email="karthik.s@campus.edu",
            description="Full-stack production engineering, automated testing, and AI agent integration.",
            announcement=None,
        ),
    ]
    db.add_all(courses)
    db.flush()

    # 4. Attendance records for student_1 (realistic mix including 1 course near/below 75% to demonstrate alerts)
    attendance_patterns = {
        "CS601": ["present"] * 9 + ["absent"],                 # 90%
        "CS602": ["present"] * 8 + ["late", "absent"],         # 90%
        "CS603": ["present"] * 6 + ["absent"] * 4,             # 60% (below 75%!)
        "CS604": ["present"] * 8 + ["absent"] * 2,             # 80%
        "CS605": ["present"] * 9 + ["late"],                   # 100%
    }
    for course in courses:
        statuses = attendance_patterns[course.code]
        for idx, st in enumerate(statuses):
            db.add(
                Attendance(
                    student_id=profile_1.id,
                    course_id=course.id,
                    date=today - timedelta(days=20 - idx * 2),
                    status=st,
                    remarks="Regular lecture session" if st != "absent" else "Absent - unexcused",
                )
            )
        # Seed baseline attendance for student_2 as well
        for idx in range(6):
            db.add(
                Attendance(
                    student_id=profile_2.id,
                    course_id=course.id,
                    date=today - timedelta(days=12 - idx * 2),
                    status="present" if idx < 5 else "absent",
                    remarks="Regular lecture session",
                )
            )

    # 5. Internal Marks
    marks_seed_p1 = [
        (courses[0], "Internal Assessment 1", 23.0, 25.0, "O"),
        (courses[0], "Internal Assessment 2", 21.5, 25.0, "A+"),
        (courses[0], "Lab & Assignment", 24.0, 25.0, "O"),
        (courses[1], "Internal Assessment 1", 20.0, 25.0, "A+"),
        (courses[1], "Internal Assessment 2", 22.0, 25.0, "A+"),
        (courses[2], "Internal Assessment 1", 17.5, 25.0, "A"),
        (courses[2], "Internal Assessment 2", 18.5, 25.0, "A"),
        (courses[3], "Internal Assessment 1", 22.5, 25.0, "O"),
        (courses[3], "Internal Assessment 2", 21.0, 25.0, "A+"),
        (courses[4], "Capstone Sprint Review", 23.5, 25.0, "O"),
    ]
    for course, name, obt, mx, grade in marks_seed_p1:
        db.add(
            InternalMark(
                student_id=profile_1.id,
                course_id=course.id,
                assessment_name=name,
                marks_obtained=obt,
                max_marks=mx,
                grade=grade,
                remarks="Evaluated by course faculty",
            )
        )

    db.add(
        InternalMark(
            student_id=profile_2.id,
            course_id=courses[0].id,
            assessment_name="Internal Assessment 1",
            marks_obtained=19.0,
            max_marks=25.0,
            grade="A",
            remarks="Evaluated by course faculty",
        )
    )

    # 6. Examination Timetable
    exam_entries = [
        (courses[0], "End-Semester Exam", today + timedelta(days=10), "09:30 AM", "12:30 PM", "Block A - Hall 101", "Carry non-programmable scientific calculator."),
        (courses[1], "End-Semester Exam", today + timedelta(days=13), "09:30 AM", "12:30 PM", "Block A - Hall 102", "Hall ticket verification starts at 09:05 AM."),
        (courses[2], "End-Semester Exam", today + timedelta(days=16), "09:30 AM", "12:30 PM", "Block B - Hall 204", None),
        (courses[3], "End-Semester Exam", today + timedelta(days=19), "09:30 AM", "12:30 PM", "Block A - Hall 105", None),
        (courses[4], "Practical Exam", today + timedelta(days=6), "02:00 PM", "05:00 PM", "Innovation Lab 3", "Bring signed project demo checklist."),
    ]
    for course, etype, edate, stime, etime, room, ann in exam_entries:
        db.add(
            Timetable(
                course_id=course.id,
                exam_type=etype,
                exam_date=edate,
                start_time=stime,
                end_time=etime,
                room=room,
                department=course.department,
                semester=course.semester,
                announcement=ann,
            )
        )

    # 7. Placement Opportunities
    placements = [
        PlacementOpportunity(
            company_name="Apex Cloud Systems",
            role_title="Software Engineer — Distributed Backend",
            package_lpa=18.5,
            location="Bengaluru",
            job_type="Full-Time",
            min_cgpa=8.0,
            eligible_departments="Computer Science & Engineering, Artificial Intelligence & Data Science",
            max_backlogs=0,
            deadline=today + timedelta(days=12),
            description="Build high-throughput microservices, Go/Python cloud APIs, and distributed AI workflows.",
            announcement="Pre-placement talk scheduled this Thursday at 4:00 PM in Main Auditorium.",
            is_active=True,
        ),
        PlacementOpportunity(
            company_name="NovaAI Labs",
            role_title="Applied AI / ML Engineer",
            package_lpa=22.0,
            location="Hyderabad",
            job_type="Full-Time",
            min_cgpa=8.5,
            eligible_departments="Computer Science & Engineering, Artificial Intelligence & Data Science",
            max_backlogs=0,
            deadline=today + timedelta(days=9),
            description="Design RAG pipelines, multi-agent LangGraph orchestration, and LLM evaluation suites.",
            announcement="Online coding & ML assessment window opens next Tuesday.",
            is_active=True,
        ),
        PlacementOpportunity(
            company_name="FinPulse Technologies",
            role_title="Full-Stack Developer",
            package_lpa=11.0,
            location="Chennai",
            job_type="Full-Time",
            min_cgpa=7.0,
            eligible_departments="Computer Science & Engineering, Information Technology, Electronics & Communication",
            max_backlogs=0,
            deadline=today + timedelta(days=18),
            description="Work with React, FastAPI, PostgreSQL, and real-time payment analytics.",
            announcement=None,
            is_active=True,
        ),
        PlacementOpportunity(
            company_name="QuantumCore Robotics",
            role_title="Embedded & Edge AI Intern",
            package_lpa=9.0,
            location="Pune",
            job_type="Internship",
            min_cgpa=9.0,
            eligible_departments="Computer Science & Engineering, Electronics & Communication",
            max_backlogs=0,
            deadline=today + timedelta(days=15),
            description="6-month paid internship with PPO conversion on edge computer vision.",
            announcement=None,
            is_active=True,
        ),
    ]
    db.add_all(placements)
    db.flush()

    db.add(
        PlacementApplication(
            student_id=profile_1.id,
            opportunity_id=placements[2].id,
            status="Shortlisted",
        )
    )

    # 8. Campus Services
    services = [
        CampusService(
            category="library",
            name="Central Knowledge Library",
            location="Academic Core — Block L (Floors 1-4)",
            timings="Mon-Sat: 8:00 AM – 10:00 PM | Sun: 10:00 AM – 6:00 PM",
            contact_info="library@campus.edu | Ext. 2201",
            status="Operational",
            details="Over 120,000 volumes, IEEE/ACM digital access, quiet reading pods, and 24/7 exam reading hall.",
        ),
        CampusService(
            category="hostel",
            name="Emerald & Oak Residential Hostels",
            location="North Campus Residential Zone",
            timings="24/7 Security | Gate Curfew: 10:30 PM | Mess: 7:30 AM – 9:30 PM",
            contact_info="chiefwarden@campus.edu | Ext. 3100",
            status="Operational",
            details="High-speed campus Wi-Fi, laundry rooms, study lounges, and biometric entry.",
        ),
        CampusService(
            category="transport",
            name="Campus Shuttle & City Bus Fleet",
            location="Main Gate Transport Bay",
            timings="Morning Routes: 7:15 AM – 9:15 AM | Evening Return: 4:30 PM – 6:45 PM",
            contact_info="transport@campus.edu | Ext. 4050",
            status="Operational",
            details="18 GPS-tracked AC shuttle routes covering Metro stations and major city corridors.",
        ),
        CampusService(
            category="canteen",
            name="GreenLeaf Central Food Court",
            location="Student Activity Plaza",
            timings="Daily: 7:30 AM – 9:00 PM",
            contact_info="dining@campus.edu | Ext. 5120",
            status="Operational",
            details="Hygienic North/South Indian meals, healthy bowls, coffee kiosk, and smart ID cashless billing.",
        ),
        CampusService(
            category="medical",
            name="Campus Wellness & Health Center",
            location="East Gate Medical Wing",
            timings="24/7 Emergency Ambulance | Doctor OPD: 8:30 AM – 8:00 PM",
            contact_info="healthcenter@campus.edu | Emergency: Ext. 911",
            status="Operational",
            details="On-campus physicians, pharmacy dispensary, counseling services, and tie-up with City General Hospital.",
        ),
    ]
    db.add_all(services)

    # 9. Support Tickets
    db.add_all(
        [
            SupportTicket(
                ticket_code="TKT-1001",
                student_id=profile_1.id,
                category="library",
                subject="Request IEEE Xplore remote VPN access renewal",
                description="Unable to access IEEE digital library papers from off-campus network since last week.",
                priority="medium",
                status="resolved",
                admin_response="Remote Shibboleth access has been re-activated for 22CS1001. Please re-login.",
            ),
            SupportTicket(
                ticket_code="TKT-1002",
                student_id=profile_1.id,
                category="hostel",
                subject="Wi-Fi access point drops in Block B Floor 3",
                description="Signal strength fluctuates in Room 314 during evening hours.",
                priority="high",
                status="in_progress",
                admin_response="IT networking team scheduled an access point inspection for tomorrow morning.",
            ),
        ]
    )

    # 10. Notifications
    db.add_all(
        [
            Notification(
                user_id=None,
                title="End-Semester Exam Timetable Published",
                message="Final examination schedule for Semester 6 is now live. Check your venues and hall ticket instructions.",
                category="exam",
                is_read=False,
            ),
            Notification(
                user_id=None,
                title="NovaAI Labs Campus Drive Open",
                message="Applications for Applied AI / ML Engineer (22 LPA) close in 9 days. Verify CGPA eligibility.",
                category="placement",
                is_read=False,
            ),
            Notification(
                user_id=student_1.id,
                title="Attendance Alert: CS603 Compiler Design",
                message="Your attendance in CS603 is currently 60.0%, which is below the 75% minimum requirement.",
                category="attendance",
                is_read=False,
            ),
        ]
    )

    # 11. Official Public RAG Documents -> Disk + SQLite + ChromaDB
    vector_store = get_vector_store()
    for doc_item in OFFICIAL_RAG_DOCS:
        stored_name = f"seed_{doc_item['filename']}"
        dest = settings.UPLOAD_DIR / stored_name
        dest.write_text(doc_item["content"], encoding="utf-8")

        chunks = chunk_text(doc_item["content"])
        doc_row = Document(
            uploaded_by_user_id=admin_user.id,
            title=doc_item["title"],
            filename=doc_item["filename"],
            stored_filename=stored_name,
            file_type="txt",
            file_size=len(doc_item["content"].encode("utf-8")),
            category=doc_item["category"],
            visibility="public",
            is_indexed=True,
            chunk_count=len(chunks),
            extracted_summary=doc_item["content"][:220] + "...",
        )
        db.add(doc_row)
        db.flush()

        vector_store.add_document_chunks(
            document_id=doc_row.id,
            owner_user_id=admin_user.id,
            visibility="public",
            title=doc_row.title,
            filename=doc_row.filename,
            category=doc_row.category,
            chunks=chunks,
        )

    db.commit()

