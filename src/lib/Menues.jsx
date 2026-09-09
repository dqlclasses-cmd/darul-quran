import {
  BookIcon,
  CalendarIcon,
  CalendarPlus,
  ChartBarIcon,
  DollarSignIcon,
  FileQuestionIcon,
  HomeIcon,
  LayoutTemplate,
  MegaphoneIcon,
  TicketIcon,
  TicketsIcon,
  UsersIcon,
  Video,
  BellRing,
  Users2Icon,
  MessageSquare,
  MessageCircleMore,
  UserIcon,
  CalendarDaysIcon,
  IdCardIcon,
} from "lucide-react";
import { RiProgress3Line } from "react-icons/ri";
import { IoBook } from "react-icons/io5";
import { MdOutlinePayments } from "react-icons/md";
import { FaUserCog } from "react-icons/fa";

export const adminMenu = [
  {
    name: "Dashboard",
    icon: <HomeIcon />,
    link: "/admin/dashboard",
    value: "dashboard",
  },
  {
    name: "Courses Management",
    icon: <BookIcon />,
    link: "/admin/courses-management",
    value: "courses-management",
    children: [
      {
        name: "All Courses",
        link: "/admin/courses-management",
        value: "all-courses",
      },
      {
        name: "Course Builder",
        link: "/admin/courses-management/builder",
        value: "course-builder",
      },
      {
        name: "Attendance & Progress",
        link: "/admin/courses-management/attendance",
        value: "attendance-progress",
      },
    ],
  },
  {
    name: "Email Templates",
    icon: <LayoutTemplate />,
    link: "/admin/email-templates",
    value: "email-templates",
  },
  {
    name: "User Management",
    icon: <UsersIcon />,
    link: "/admin/user-management",
    value: "user-management",
  },
  {
    name: "User Logs / Activity",
    icon: <FaUserCog  size={24}/>,
    link: "/admin/user-logs",
    value: "user-logs",
  },
  {
    name: "Class Scheduling",
    icon: <CalendarIcon />,
    link: "/admin/class-scheduling",
    value: "class-scheduling",
    children: [
      {
        name: "All Schedule",
        icon: <CalendarPlus />,
        link: "/admin/class-scheduling",
      },
      {
        name: "Reschedule Requests",
        icon: <CalendarPlus />,
        link: "/admin/reschedule-requests",
      },
    ],
  },
  {
    name: "Student Attendance List",
    icon: <Users2Icon />,
    link: "/admin/attendance-list",
    value: "attendance-list",
  },
  // {
  //   name: "Announcements",
  //   icon: <MegaphoneIcon />,
  //   link: "/admin/announcements",
  //   value: "announcements",
  // },
  {
    name: "Payments & Refunds",
    icon: <DollarSignIcon />,
    link: "/admin/payments",
    value: "payments-refunds",
  },
  // {

  //   icon: <TicketIcon />,

  // },
  {
    name: "Analytics",
    icon: <ChartBarIcon />,
    link: "/admin/analytics",
    value: "analytics",
  },
  {
    name: "Testimonials",
    icon: <MessageSquare />,
    link: "/admin/testimonials",
    value: "testimonials",
  },
  {
    name: "View Contact Forms",
    icon: <IdCardIcon />,
    link: "/admin/contact-forms",
    value: "contact-forms",
  },
  {
    name: "User Appointment",
    icon: <CalendarPlus />,
    link: "/admin/user-appointment",
    value: "user-appointment",
  },
  {
    name: "Events & Retreats",
    icon: <CalendarDaysIcon />,
    link: "/admin/events-retreats",
    value: "events-retreats",
    children: [
      {
        name: "Add Events & Retreats",
        link: "/admin/events-retreats/manage",
        value: "add-events-retreats",
      },
    ],
  },
  {
    name: "Site Management",
    icon: <LayoutTemplate />,
    link: "/admin/site-content",
    value: "site-management",
    children: [
      {
        name: "Site Content",
        link: "/admin/site-content",
        value: "site-content",
      },
      {
        name: "Site Settings",
        link: "/admin/site-settings",
        value: "site-settings",
      },
      {
        name: "SEO Settings",
        link: "/admin/seo-settings",
        value: "seo-settings",
      },
    ],
  },
  // {
  //   name: "Notifications",
  //   icon: <BellRing />,
  //   link: "/admin/notifications",
  //   value: "notifications",
  // },
  
  {
    name: "Notifications & Announcements",
    icon: <BellRing />,
    link: "/admin/notifications",
    value: "notifications-announcements",
    children: [
      {
        name: "Notifications",
        link: "/admin/notifications",
        value: "notifications",
      },
      {
        name: "Announcements",
        link: "/admin/announcements",
        value: "announcements",
      },
    ],
  },
  {
    name: "Profile",
    icon: <UserIcon />,
    link: "/admin/profile",
    value: "profile",
  },
  {
    name: "Help and Support",
    icon: <FileQuestionIcon />,
    link: "/admin/help/messages",
    value: "help-support",
    children: [
      {
        name: "Message Center",
        link: "/admin/help/messages",
        value: "messages",
      },
      {
        name: "Teacher & Student Chat",
        link: "/admin/help/chat",
        value: "chat",
      },
      {
        name: "Support",
        link: "/admin/tickets",
        value: "support-tickets",
      },
      { name: "Reviews", link: "/admin/help/reviews", value: "reviews" },
      { name: "FAQs", link: "/admin/faqs", value: "faqs" },
    ],
  },
  
];
export const teacherMenu = [
  { name: "Dashboard", icon: <HomeIcon />, link: "/teacher/dashboard" },
  {
    name: "My Courses",
    icon: <BookIcon />,
    link: "/teacher/class-scheduling",
    children: [
      // { name: 'Course Details View', link: '/teacher/courses/course-details' },
      { name: "Upload Materials", link: "/teacher/courses/upload-material" },
      { name: "Class Scheduling", link: "/teacher/class-scheduling" },
    ],
  },
  {
    name: "Student Attendance",
    icon: <CalendarIcon />,
    link: "/teacher/attendance-list",
    // children: [
    //   { name: "Progress Overview", link: "/teacher/student-attendance" },
    //   { name: "Student Attendance", link: "/teacher/attendance-list" },
    // ],
  },
  { name: 'Course Progress', icon: <RiProgress3Line size={24} />, link: '/teacher/student-attendance' },
  // { name: 'Student Attendance List', icon: <Users2Icon />, link: '/teacher/attendance-list' },
  // {
  //   name: "Class Schedule",
  //   icon: <MegaphoneIcon />,
  //   link: "/teacher/class-scheduling",
  // },
  // {
  //   name: "Reschedule Requests",
  //   icon: <CalendarPlus />,
  //   link: "/teacher/reschedule-requests",
  // },
  // {
  //   name: "Class Schedule",
  //   icon: <MegaphoneIcon />,
  //   link: "/teacher/class-scheduling",
  //   // children: [
  //   //   { name: "Class Schedule", link: "/teacher/class-scheduling" },
  //   //   { name: "Reschedule Requests", link: "/teacher/reschedule-requests" },
  //   // ],
  // },
  // { name: "Chat Center", icon: <TicketIcon />, link: "/teacher/chat" },
  // {
  //   name: "Support Tickets  ",
  //   icon: <TicketsIcon />,
  //   link: "/teacher/support-tickets"`,
  // }
  {
    name: "Notifications & Announcements",
    icon: <BellRing />,
    link: "/teacher/announcements",
    children: [
      { name: "Announcements", link: "/teacher/announcements" },
      { name: "Notifications", link: "/teacher/notifications" },

    ],
  },
  {
    name: "Chat With Student",
    icon: <MessageCircleMore size={20} />,
    link: "/teacher/chat",
    children: [
      { name: "Chat Center", link: "/teacher/chat" },
    ],
  },
  {
    name: "Support",
    icon: <FileQuestionIcon />,
    link: "/teacher/support-tickets",
    children: [
      { name: "Support", link: "/teacher/support-tickets" },
      { name: "FAQs", link: "/teacher/faqs" },
    ],
  },
  // { name: "Testimonials", icon: <MessageSquare />, link: "/teacher/testimonials" },
  // { name: 'Announcements', icon: <MegaphoneIcon />, link: '/teacher/announcements' },
  // { name: 'Notifications', icon: <BellRing />, link: '/teacher/notifications' },
  // { name: 'FAQs', icon: <FileQuestionIcon />, link: '/teacher/faqs' },
  { name: "Profile", icon: <UserIcon />, link: "/teacher/profile" },
];

export const studentMenu = [
  { name: "Dashboard", icon: <HomeIcon />, link: "/student/dashboard" },
  // { name: 'My Learning Journey', icon: <FaChalkboardTeacher size={22}/>, link: '/student/my-learning' },
  // { name: 'Enrollments', icon: <IoCashOutline size={22}/>, link: '/student/enrollments' },

  {
    name: "Schedule Sessions",
    icon: <Video />,
    link: "/student/class-scheduling",
    children: [
      { name: "Class Schedule", link: "/student/class-scheduling" },
      { name: "My Reschedule Requests", link: "/student/reschedule-requests", }
    ],
  },
  // {
  //   name: "Class Schedule",
  //   icon: <Video />,
  //   link: "/student/class-scheduling",
  // },
  // {
  //   name: "My Reschedule Requests",
  //   icon: <GrSchedules size={21} />,
  //   link: "/student/reschedule-requests",
  // },
  {
    name: "Browse Courses",
    icon: <IoBook size={21} />,
    link: "/student/browse-courses",
  },
  // {
  //     name: 'Help and Support',
  //     icon: <FileQuestionIcon />,
  //     link: '/student/help/messages',
  //     children: [
  //         { name: 'Chat Center', link: '/student/help/messages' },
  //         { name: 'Payments & Subscriptions', link: '/student/payments' },
  //         { name: 'My Reschedule Requests', link: '/student/reschedule-requests' },
  //         // { name: 'Reviews', link: '/admin/help/reviews' },
  //         // { name: 'FAQs', link: '/admin/help/faqs' }
  //     ]
  // },
  {
    name: "Payments & Subscriptions",
    icon: <MdOutlinePayments size={23} />,
    link: "/student/payments",
  },
  // { name: 'Attendance & Progress', icon: <FaMedal size={21} />, link: '/student/attendance-list' },
  {
    name: "Notifications & Announcements",
    icon: <BellRing />,
    link: "/student/notifications",
    children: [
      { name: "Notifications", link: "/student/notifications" },
      { name: "Announcements", link: "/student/announcements" },
    ],
  },
  // { name: "Notifications", icon: <BellRing />, link: "/student/notifications" },
  {
    name: "Chat With Teacher",
    icon: <MessageCircleMore size={20} />,
    link: "/student/help/messages",
    children: [
      { name: "Chat Center", link: "/student/help/messages" },
      
    ],
  },
  {
    name: "Support",
    icon: <MessageCircleMore size={20} />,
    link: "/student/support-tickets",
    children: [ 
      { name: "Support", link: "/student/support-tickets" },
      { name: "FAQs", link: "/student/faqs" },
    ],
  },
  { name: "Profile", icon: <UserIcon />, link: "/student/profile" },
];
