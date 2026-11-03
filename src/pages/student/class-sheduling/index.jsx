import { useState, useMemo, useEffect } from "react";
import { DashHeading } from "../../../components/dashboard-components/DashHeading";
import {
    Button,
    Divider,
    Select,
    SelectItem,
    Spinner,
    Chip,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Tabs,
    Tab,
    Tooltip,
    Textarea,
} from "@heroui/react";
import { CiCalendar } from "react-icons/ci";
import { Clock, Lock, Video, Calendar as CalendarIcon, User, MapPin } from "lucide-react";
import { FaRegAddressCard } from "react-icons/fa";
import { LuSquareArrowOutUpRight } from "react-icons/lu";
import { Calendar } from "@heroui/react";
import {
    useGetScheduleQuery,
    useRespondToScheduleMutation,
} from "../../../redux/api/schedules";
import { useCreateRescheduleRequestMutation } from "../../../redux/api/reschedule";
import { useCreateCancellationRequestMutation } from "../../../redux/api/cancellation";
import { RescheduleRequestModal } from "../../../components/schedule/RescheduleRequestModal";
import { CancellationRequestModal } from "../../../components/schedule/CancellationRequestModal";
import { errorMessage, successMessage } from "../../../lib/toast.config";
import { formatTime12Hour, isClassLive, isClassExpired, getStatusColor, getStatusText, getStatusTextForSingleDate, getHoursUntilClass, formatRemainingTime, getScheduleStart, getScheduleEnd } from "../../../utils/scheduleHelpers";
import { useSelector } from "react-redux";
import { dateFormatter } from "../../../lib/utils";
import CustomCalendar from "../../../components/teacher/CustomCalendar";
import QueryError from "../../../components/QueryError";
import { groupAndSortSchedulesByDate } from "../../../utils/scheduleHelpers";
import SchedulesByDateList from "../../../components/schedule/SchedulesByDateList";

import { useLocation, useNavigate } from "react-router-dom";

/** Set to true to show Cancel on student schedule cards again */
const SHOW_STUDENT_CANCEL_BUTTON = false;

const StudentClassSheduling = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isMarking, setIsMarking] = useState(false);
    const [viewType, setViewType] = useState('allDates');
    const [selectedDate, setSelectedDate] = useState(null);
    const [schedulesForSelectedDate, setSchedulesForSelectedDate] = useState([]);
    const [, setScheduleClock] = useState(Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setScheduleClock(Date.now());
        }, 30 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    const { data: scheduleData, isLoading, isFetching, refetch, error } = useGetScheduleQuery({
        page: "1",
        limit: "30",
        status: filterStatus === "all" ? undefined : filterStatus,
    });

    const [createRescheduleRequest, { isLoading: isRescheduling }] = useCreateRescheduleRequestMutation();
    const [createCancellationRequest, { isLoading: isCancelling }] = useCreateCancellationRequestMutation();

    const { user: currentUser } = useSelector((state) => state.user);
    const { isOpen: isDateModalOpen, onOpen: openDateModal, onOpenChange: closeDateModal } = useDisclosure();

    const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
    const [denyReason, setDenyReason] = useState("");
    const [targetScheduleId, setTargetScheduleId] = useState(null);
    const [respondToSchedule, { isLoading: isResponding }] = useRespondToScheduleMutation();
    const [isApproving, setIsApproving] = useState(false);
    const [isDenying, setIsDenying] = useState(false);
    const targetSchedule = useMemo(() => {
        if (!targetScheduleId || !scheduleData?.schedules) return null;
        return scheduleData.schedules.find(s => s.id === Number(targetScheduleId));
    }, [targetScheduleId, scheduleData]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const action = queryParams.get("action");
        const scheduleId = queryParams.get("scheduleId");

        if (action === "deny" && scheduleId) {
            setTargetScheduleId(scheduleId);
            setIsDenyModalOpen(true);
            // Clean up URL parameters after handling
            // navigate(location.pathname, { replace: true });
        }
    }, [location.search, navigate]);

    const handleSubmitDeny = async () => {
        if (!denyReason.trim()) {
            errorMessage("Please provide a reason for declining");
            return;
        }

        try {
            setIsDenying(true);
            await respondToSchedule({
                id: targetScheduleId,
                status: "denied",
                reason: denyReason
            }).unwrap();

            // Remove the stored redirect URL
            sessionStorage.removeItem("rescheduling_redirecting");
            navigate(location.pathname, { replace: true });
            successMessage("Response submitted successfully");
            setIsDenyModalOpen(false);
            setDenyReason("");
            navigate('/student/class-scheduling');
            setTargetScheduleId(null);
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to submit response");
        }
        finally {
            setIsDenying(false);
        }
    };
    const handleApproved = async (status) => {
        try {
            setIsApproving(true)
            await respondToSchedule({
                id: targetScheduleId,
                status: status,
                reason: ""
            }).unwrap();

            sessionStorage.removeItem("rescheduling_redirecting");
            navigate(location.pathname, { replace: true });
            successMessage("Response submitted successfully");
            setIsDenyModalOpen(false);
            setDenyReason("");
            setTargetScheduleId(null);
            navigate('/student/class-scheduling');
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to submit response");
        }
        finally {
            setIsApproving(false)
        }
    };
    const schedulesDates = useMemo(() => {
        if (!scheduleData?.schedules) return [];
        const grouped = scheduleData?.schedules.flatMap(schedule => {
            // Use scheduleDates if available, otherwise fall back to date field
            if (schedule.scheduleDates?.length > 0) {
                return schedule.scheduleDates;
            } else if (schedule.date) {
                return [schedule.date];
            }
            return [];
        });
        return grouped;
    }, [scheduleData]);

    // Helper function to parse date string (supports both YYYY-MM-DD and DD-M-YY formats)
    const parseDateFromDB = (dateStr) => {
        if (!dateStr) return null;

        // Try YYYY-MM-DD format first (from PostgreSQL date array)
        if (dateStr.includes('-') && dateStr.length === 10) {
            const parsed = new Date(dateStr);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        // Try DD-M-YY format (e.g., "26-2-5")
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
            let year = parseInt(parts[2], 10);
            // Handle 2-digit years (assume 20xx for years < 100)
            if (year < 100) year += 2000;
            const parsed = new Date(year, month, day);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        // Fallback to standard Date parsing
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const schedulesByDate = useMemo(() => {
        return groupAndSortSchedulesByDate(scheduleData?.schedules, filterType, {
            excludeCancelled: true,
        });
    }, [scheduleData, filterType]);
 

    const handleDateClick = (date) => {
        // date is a JavaScript Date object from CustomCalendar
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dateStr = `${year}-${month}-${day}`;

        setSelectedDate(date);

        // Find schedules for this date
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const schedules = schedulesByDate.all[dateKey] || [];
        setSchedulesForSelectedDate(schedules);
        openDateModal();
    };

    const handleJoinClass = async (schedule) => {
        if (!currentUser) {
            errorMessage("Please login first");
            return;
        }
        setIsMarking(schedule.id);
        const finalToken = localStorage.getItem("token");
        const ua = navigator.userAgent;

        const isSafari =
            /Safari/i.test(ua) &&
            !/Chrome|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
        try {
            const res = await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/attendance/mark`, {
                method: "POST",
                credentials: "include",
                headers: { "Authorization": `Bearer ${finalToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    scheduleId: schedule.id,
                    studentId: currentUser.id,
                    courseId: schedule.courseId,
                    date: schedule.date
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (isSafari) {
                    window.location.assign(data.link);  
                } else {
                    window.open(data.link, "_blank");
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Failed to mark attendance", error);
            errorMessage(error.message);
        } finally {
            setIsMarking(null);
        }
    };

    const handleRequestReschedule = (schedule) => {
        setSelectedSchedule(schedule);
        setIsRescheduleModalOpen(true);
    };

    const handleSubmitRescheduleRequest = async (requestData) => {
        try {
            await createRescheduleRequest(requestData).unwrap();
            successMessage("Reschedule request submitted successfully! You will be notified once admin reviews your request.");
            setIsRescheduleModalOpen(false);
            setSelectedSchedule(null);
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to submit reschedule request");
        }
    };

    const handleCancelClass = (schedule) => {
        setSelectedSchedule(schedule);
        setIsCancelModalOpen(true);
    };

    const handleSubmitCancellationRequest = async (requestData) => {
        try {
            await createCancellationRequest(requestData).unwrap();
            successMessage("Cancellation request submitted successfully!");
            setIsCancelModalOpen(false);
            setSelectedSchedule(null);
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to submit cancellation request");
        }
    };

    const canReschedule = (schedule) => {
        const scheduleDates = schedule.scheduleDates?.length > 0
            ? schedule.scheduleDates
            : (schedule.date ? [schedule.date] : []);

        if (scheduleDates.length === 0) return false;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // If it's a specific date (View by Date), use that date.
        // Otherwise, if any date in the course is today, apply the restriction.
        const interactionDate = schedule.date ? (schedule.date.includes('T') ? schedule.date.split('T')[0] : schedule.date) : null;
        const datesToCheck = interactionDate ? [interactionDate] : scheduleDates.map(d => d.includes('T') ? d.split('T')[0] : d);
        const todayDate = datesToCheck.find(d => d === todayStr);

        if (!todayDate) return true; // Not today (Past or Future)

        // It's today, check the 4-hour rule or if it's already ended
        let currentStartTime = getScheduleStart(schedule, todayDate);
        let currentEndTime = getScheduleEnd(schedule, todayDate);
        const hoursUntil = getHoursUntilClass(todayDate, currentStartTime);
        if (hoursUntil !== null && hoursUntil > 4) return true;

        if (currentEndTime instanceof Date) {
            if (now > currentEndTime) return true;
        } else if (currentEndTime) {
            const [endHour, endMin] = currentEndTime.split(":").map(Number);
            const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin);
            if (now > endDateTime) return true;
        }

        return false;
    };

    const canCancel = (schedule) => {
        const scheduleDates = schedule.scheduleDates?.length > 0
            ? schedule.scheduleDates
            : (schedule.date ? [schedule.date] : []);

        if (scheduleDates.length === 0) return false;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const interactionDate = schedule.date ? (schedule.date.includes('T') ? schedule.date.split('T')[0] : schedule.date) : null;
        const datesToCheck = interactionDate ? [interactionDate] : scheduleDates.map(d => d.includes('T') ? d.split('T')[0] : d);
        const todayDate = datesToCheck.find(d => d === todayStr);

        if (!todayDate) return true; // Not today (Past or Future)

        let currentStartTime = getScheduleStart(schedule, todayDate);
        let currentEndTime = getScheduleEnd(schedule, todayDate);
        const hoursUntil = getHoursUntilClass(todayDate, currentStartTime);
        if (hoursUntil !== null && hoursUntil > 4) return true;

        if (currentEndTime instanceof Date) {
            if (now > currentEndTime) return true;
        } else if (currentEndTime) {
            const [endHour, endMin] = currentEndTime.split(":").map(Number);
            const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin);
            if (now > endDateTime) return true;
        }

        return false;
    };

    const getClassStatus = (schedule, type = 'single') => {
        let status = '';
        let hoursUntil = null;
        let isExpired = false;

        if (type === 'single') {
            status = getStatusTextForSingleDate(schedule.date, getScheduleStart(schedule), getScheduleEnd(schedule));
            hoursUntil = getHoursUntilClass(schedule.date, getScheduleStart(schedule));
            const todayStr = new Date().toISOString().split('T')[0];
            isExpired = schedule.date < todayStr || (schedule.date === todayStr && hoursUntil !== null && hoursUntil < 0);
        } else {
            status = getStatusText(schedule);
            const scheduleDates = schedule.scheduleDates?.length > 0
                ? schedule.scheduleDates
                : (schedule.date ? [schedule.date] : []);
            const todayStr = new Date().toISOString().split('T')[0];
            const upcomingDates = scheduleDates.filter(d => d >= todayStr);

            if (upcomingDates.length > 0) {
                const nextDate = upcomingDates.sort()[0];
                let currentStartTime = getScheduleStart(schedule, nextDate);
                hoursUntil = getHoursUntilClass(nextDate, currentStartTime);
            } else if (scheduleDates.length > 0) {
                const lastDate = scheduleDates[scheduleDates.length - 1];
                let currentStartTime = getScheduleStart(schedule, lastDate);
                hoursUntil = getHoursUntilClass(lastDate, currentStartTime);
            }
            isExpired = isClassExpired(schedule);
        }

        if (status === "live") {
            return 'Live Now';
        }

        if (isExpired) {
            return "Completed";
        }

        if (hoursUntil !== null && hoursUntil > 0 && hoursUntil < 3) {
            return `Starts in ${formatRemainingTime(hoursUntil)}`;
        }

        return "Upcoming";

    };

    const getClassStatusBadge = (schedule, type = 'single') => {
        let status = '';
        let hoursUntil = null;
        let isExpired = false;
        const startTime = getScheduleStart(schedule);
        const endTime = getScheduleEnd(schedule);
        if (type === 'single') {
            status = getStatusTextForSingleDate(schedule.date, startTime, endTime);
            hoursUntil = getHoursUntilClass(schedule.date, startTime);
            const todayStr = new Date().toISOString().split('T')[0];
            isExpired = schedule.date < todayStr || (schedule.date === todayStr && hoursUntil !== null && hoursUntil < 0);
        } else {
            status = getStatusText(schedule);
            const scheduleDates = schedule.scheduleDates?.length > 0
                ? schedule.scheduleDates
                : (schedule.date ? [schedule.date] : []);
            const todayStr = new Date().toISOString().split('T')[0];
            const upcomingDates = scheduleDates.filter(d => d >= todayStr);

            if (upcomingDates.length > 0) {
                const nextDate = upcomingDates.sort()[0];
                let currentStartTime = startTime;
                hoursUntil = getHoursUntilClass(nextDate, currentStartTime);
            } else if (scheduleDates.length > 0) {
                const lastDate = scheduleDates[scheduleDates.length - 1];
                let currentStartTime = startTime;
                hoursUntil = getHoursUntilClass(lastDate, currentStartTime);
            }
            isExpired = isClassExpired(schedule);
        }

        if (status === "live") {
            return (
                <Button
                    size="sm"
                    className="animate-pulse"
                    color="primary"
                    radius="sm"
                    variant="flat"
                    startContent={<Video size={14} />}
                >
                    Live Now
                </Button>
            );
        }

        if (isExpired) {
            return (
                <Button size="sm" variant="flat" color="default">
                    Completed
                </Button>
            );
        }

        if (hoursUntil !== null && hoursUntil > 0 && hoursUntil < 3) {
            return (
                <Button
                    size="sm"
                    className="bg-[#95C4BE33] text-[#06574C]"
                    radius="sm"
                    startContent={<Lock size={14} />}
                >
                    Starts in {formatRemainingTime(hoursUntil)}
                </Button>
            );
        }

        return (
            <Button size="sm" variant="flat" color="warning">
                Upcoming
            </Button>
        );
    };

    const ScheduleCard = ({ schedule, type = 'allDates' }) => {
        const isLive = isClassLive(schedule, (type === 'normal' ? 'multiple' : 'single'));
        const isExpired = isClassExpired(schedule);
        const canJoin = isLive;
        const canResched = canReschedule(schedule);
        const canCanc = canCancel(schedule);

        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap gap-2 mb-3">
                    {getClassStatusBadge(schedule, (type === 'normal' ? 'multiple' : 'single'))}
                    {type === 'allDates' && (getClassStatus(schedule, 'single') === 'Completed') && (
                        <Button
                            size="sm"
                            variant="flat"
                            color={schedule?.attendance?.includes(schedule.date) ? 'success' : 'danger'}
                        >
                            Attendance: {schedule?.attendance?.includes(schedule.date) ? 'Present' : 'Absent'}
                        </Button>
                    )}
                    {schedule.courseName && (
                        <Button
                            size="sm"
                            className="bg-[#95C4BE33] text-[#06574C]"
                            radius="sm"
                        >
                            Course: {schedule.courseName}
                        </Button>
                    )}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{schedule.title}</h2>
                {schedule.description && (
                    <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                        {schedule.description}
                    </p>
                )}

                {type === 'normal' && (
                    <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                        {schedule.scheduleDates?.length === 1
                            ? dateFormatter(getScheduleStart({ ...schedule, date: schedule.scheduleDates[0] }, schedule.scheduleDates[0]) || schedule.scheduleDates[0])
                            : `${dateFormatter(getScheduleStart({ ...schedule, date: schedule.scheduleDates[0] }, schedule.scheduleDates[0]) || schedule.scheduleDates[0])} - to - ${schedule?.isDateGenerated ? 'On Going' : dateFormatter(getScheduleStart({ ...schedule, date: schedule.scheduleDates[schedule.scheduleDates.length - 1] }, schedule.scheduleDates[schedule.scheduleDates.length - 1]) || schedule.scheduleDates[schedule.scheduleDates.length - 1])}`}
                    </p>
                )}


                <div className="flex flex-wrap gap-4 mb-4">
                    {/* <div className="flex text-[#666666] text-sm items-center gap-2">
                        {type === 'normal' ? "CreatedAt: " : <CiCalendar color="#666666" size={20} />}
                        <p className="text-[#666666] text-sm">
                            {dateFormatter(getScheduleStart(schedule) || schedule.date)}
                        </p>
                    </div> */}

                    <div className="flex items-center gap-2">
                        <Clock color="#666666" size={18} />
                        <p className="text-[#666666] text-sm">
                            {formatTime12Hour(getScheduleStart(schedule))} - {formatTime12Hour(getScheduleEnd(schedule))}
                        </p>{""}
                        {type !== "normal" && <p className="text-[#666666] text-sm">Scheduled Days Timing</p>}
                    </div>
                </div>
                {/* {type === 'normal' &&
                    <Calendar
                        size="sm"
                        variant="underlined"
                        color='success'
                        isReadOnly
                        isDateUnavailable={(date) => {
                            const datesToCheck = schedule.scheduleDates?.length > 0
                                ? schedule.scheduleDates
                                : (schedule.date ? [schedule.date] : []);
                            return datesToCheck.includes(date.toString());
                        }}
                    />
                } */}

                {schedule.notes && type !== "normal" ? schedule?.notes?.[schedule.date] && (
                    <div className="bg-amber-50 border-l-4 border-success p-3 mb-3 rounded-r-md">
                        <p className="text-sm font-semibold text-amber-800 mb-1">Schedule Note:</p>
                        <p className="text-sm text-amber-900">{schedule.notes[schedule.date]}</p>
                    </div>
                ) : schedule.notes &&
                <details>
                    <summary className="cursor-pointer text-[#406c65] hover:opacity-80 italic underline flex">All Notes</summary>
                    {Object.keys(schedule?.notes).map((date) => (
                        <div className="bg-amber-50 flex items-center gap-1 flex-wrap border-l-4 border-success p-3 mb-3 rounded-r-md">
                            <p className="text-sm font-semibold text-amber-800 msb-1">{dateFormatter(date)}:</p>
                            <p className="text-sm text-amber-900">{schedule?.notes?.[date]}</p>
                        </div>
                    ))}
                </details>
                }

                {type === 'normal' && schedule?.specificDates && Object.keys(schedule.specificDates).length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-[#06574C] mb-2 uppercase tracking-wider">Only Specific Date  Shedule:</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(schedule.specificDates).map(([date, times], index) => (
                                <p
                                    key={index}
                                    className="text-[#666666] text-md line-clamp-2"
                                >
                                    {dateFormatter(getScheduleStart({ ...schedule, date, startTime: times.startTime }, date) || date)} ({formatTime12Hour(getScheduleStart({ ...schedule, date, startTime: times.startTime }, date))} - {formatTime12Hour(getScheduleEnd({ ...schedule, date, endTime: times.endTime }, date))})
                                </p>
                            ))}
                        </div>
                    </div>
                )}
                <Divider className="my-4" />

                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center bg-[#95C4BE33] rounded-full shrink-0">
                            <FaRegAddressCard color="#06574C" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700">
                                {schedule.teacherName || "Teacher"}
                            </h3>
                            {schedule.courseName && (
                                <p className="text-xs text-gray-500">{schedule.courseName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full md:w-auto">
                        {canJoin ? (
                            <Button
                                radius="sm"
                                size="sm"
                                variant="solid"
                                className="bg-[#1570E8] text-white"
                                startContent={<LuSquareArrowOutUpRight size={18} />}
                                onPress={() => handleJoinClass(schedule)}
                                isLoading={isMarking === schedule.id}
                                isDisabled={isMarking === schedule.id}
                            >
                                Join Zoom
                            </Button>
                        ) : (
                            <Button
                                radius="sm"
                                size="sm"
                                variant="solid"
                                className="bg-[#9A9A9A] text-white"
                                startContent={<Lock size={18} />}
                                isDisabled={!isExpired}
                            >
                                {isExpired ? "Ended" : "Locked"}
                            </Button>
                        )}
                        <Tooltip
                            content="Schedule can only be rescheduled before 4 hours of the start time."
                            isDisabled={canResched}
                            placement="top"
                        >
                            <Button
                                radius="sm"
                                size="sm"
                                variant="bordered"
                                color="success"
                                isDisabled={!canResched}
                                onPress={() => handleRequestReschedule(schedule)}
                            >
                                Reschedule
                            </Button>
                        </Tooltip>

                        {SHOW_STUDENT_CANCEL_BUTTON && canCanc && !isExpired && (
                            <Button
                                radius="sm"
                                size="sm"
                                variant="bordered"
                                color="danger"
                                onPress={() => handleCancelClass(schedule)}
                            >
                                Cancel
                            </Button>
                        )}
                        {!isExpired && schedule?.specificDates && Object.keys(schedule.specificDates).length > 0 && !schedule?.studentsResponse?.[currentUser?.id] && (
                            <Button
                                radius="sm"
                                size="sm"
                                variant="bordered"
                                color="success"
                                onPress={() => {
                                    setTargetScheduleId(schedule.id);
                                    setIsDenyModalOpen(true);
                                }}
                            >
                                Approve OR Decline
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const filters = [
        { key: "all", label: "All Status" },
        { key: "upcoming", label: "Upcoming" },
        { key: "live", label: "Live" },
        { key: "completed", label: "Completed" },
    ];

    if (error) {
        return <QueryError
            height="300px"
            error={error}
            onRetry={refetch}
            showLogo={false}
            isLoading={isFetching}
        />
    }

    return (
        <div className="h-full relative bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 w-full no-scsrollbar top-0 bottom-0 overflow-auto">
            <DashHeading
                title="My Class Schedule"
                desc="View and manage your upcoming live classes"
            />

            <div className="flex items-center max-sm:flex-wrap gap-2">
                <Tabs
                    color="success"
                    variant="underlined"
                    selectedKey={viewType}
                    onSelectionChange={setViewType}
                >
                    <Tab key="normal" title="View Schedule By Course" />
                    <Tab key="allDates" title="View Schedule By Date" />
                </Tabs>
            </div>

            <div className="grid grid-cols-12 gap-4 items-start mt-4">
                {viewType === 'allDates' ?
                    <div className="col-span-12 order-2 lg:order-1 lg:col-span-8">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <Spinner size="lg" color="success" />
                            </div>
                        ) : (
                            <SchedulesByDateList
                                groupedSchedules={schedulesByDate}
                                renderCard={(schedule) => (
                                    <ScheduleCard key={`${schedule.id}-${schedule.date}`} schedule={schedule} type="allDates" />
                                )}
                            />
                        )}
                    </div>
                    :
                    <div className="col-span-12 order-2 lg:order-1 lg:col-span-8">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <Spinner size="lg" color="success" />
                            </div>
                        ) : scheduleData?.schedules?.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center">
                                <CalendarIcon className="mx-auto mb-4 text-gray-400" size={48} />
                                <p className="text-gray-500">No classes scheduled</p>
                            </div>
                        ) : (
                            scheduleData?.schedules?.map((i) => (
                                <div key={i.id} className="mb-6">
                                    <DashHeading
                                        title={"Course: " + i.courseName}
                                        desc={
                                            i.scheduleDates?.length === 1
                                                ? (getScheduleStart({ ...i, date: i.scheduleDates[0] }, i.scheduleDates[0]) || new Date(i.scheduleDates[0])).toDateString()
                                                : (getScheduleStart({ ...i, date: i.scheduleDates[0] }, i.scheduleDates[0]) || new Date(i.scheduleDates[0])).toDateString() +
                                                " - to - " +
                                                (getScheduleStart({ ...i, date: i.scheduleDates[i.scheduleDates?.length - 1] }, i.scheduleDates[i.scheduleDates?.length - 1]) || new Date(
                                                    i.scheduleDates[i.scheduleDates?.length - 1],
                                                )).toDateString()
                                        }
                                    />
                                    <div className="mt-3">
                                        <ScheduleCard key={i.id} schedule={i} type="normal" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                }

                {/* Sidebar - Calendar & Filters */}
                <div className="col-span-12 lg:sticky top-2 order-1 lg:order-2  lg:col-span-4 space-y-4 mb-4">
                    {/* Quick Stats Card */}
                    {/* <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Schedule Overview</h3>
                        {viewType === 'normal' ?
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#95C4BE33] p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-[#06574C]">
                                        {scheduleData?.schedules?.filter(s => getStatusText(s) === "upcoming").length || 0}
                                    </p>
                                    <p className="text-xs text-gray-600">Upcoming</p>
                                </div>
                                <div className="bg-[#E8F1FF] p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-[#3F86F2]">
                                        {scheduleData?.schedules?.filter(s => getStatusText(s) === "live").length || 0}
                                    </p>
                                    <p className="text-xs text-gray-600">Live</p>
                                </div>
                            </div>
                            :
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#95C4BE33] p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-[#06574C]">
                                        {(() => {
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            let count = 0;
                                            scheduleData?.schedules?.forEach(s => {
                                                const scheduleDates = s.scheduleDates || [];
                                                // Count each upcoming date individually
                                                const upcomingDates = scheduleDates.filter(d => d >= todayStr);
                                                count += upcomingDates.length;
                                            });
                                            return count;
                                        })()}
                                    </p>
                                    <p className="text-xs text-gray-600">Upcoming</p>
                                </div>
                                <div className="bg-[#E8F1FF] p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-[#3F86F2]">
                                        {(() => {
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            let count = 0;
                                            scheduleData?.schedules?.forEach(s => {
                                                const scheduleDates = s.scheduleDates || [];
                                                // Count today's dates that are currently live
                                                if (scheduleDates.includes(todayStr)) {
                                                    const [startHour, startMin] = (s.startTime || "").split(":").map(Number);
                                                    const [endHour, endMin] = (s.endTime || "").split(":").map(Number);
                                                    const now = new Date();
                                                    const [year, month, day] = todayStr.split("-").map(Number);
                                                    const startTime = new Date(year, month - 1, day, startHour, startMin);
                                                    const endTime = new Date(year, month - 1, day, endHour, endMin);
                                                    if (now >= startTime && now <= endTime) {
                                                        count++;
                                                    }
                                                }
                                            });
                                            return count;
                                        })()}
                                    </p>
                                    <p className="text-xs text-gray-600">Live</p>
                                </div>
                            </div>
                        }
                    </div> */}

                    <div className="bg-white w-full space-y-4 p-4 rounded-lg shadow-sm">
                        <CustomCalendar
                            selectedDates={schedulesDates}
                            onDateClick={handleDateClick}
                            className="max-w-[330px] mx-auto"
                        />
                    </div>


                    {/* Filters */}
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Filter by Status
                            </label>
                            <Select
                                size="sm"
                                label="Status Filter"
                                className="w-full"
                                selectedKeys={[filterStatus]}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                {filters.map((item) => (
                                    <SelectItem key={item.key} value={item.key}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isDateModalOpen}
                onOpenChange={closeDateModal}
                size="lg"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-semibold text-[#06574C]">
                                Schedule Details For
                            </h2>
                            {selectedDate && (
                                <p className="text-sm text-gray-600">
                                    {selectedDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric"
                                    })}
                                </p>
                            )}
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        {schedulesForSelectedDate.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarIcon className="mx-auto mb-4 text-gray-400" size={48} />
                                <p className="text-gray-500">No classes scheduled for this date</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {schedulesForSelectedDate.map((schedule) => (
                                    <div
                                        key={schedule.id}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {getClassStatusBadge(schedule, 'single')}
                                            {getClassStatus(schedule, 'single') === 'Completed' && (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color={schedule?.attendance?.includes(schedule.date) ? 'secondary' : 'danger'}
                                                >
                                                    Attendance: {schedule?.attendance?.includes(schedule.date) ? 'Present' : 'Absent'}
                                                </Button>
                                            )}
                                            {schedule.courseName && (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="success"
                                                >
                                                    Course: {schedule.courseName}
                                                </Button>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                                            {schedule.title}
                                        </h3>

                                        {schedule.description && (
                                            <p className="text-gray-600 text-sm mb-3">
                                                {schedule.description}
                                            </p>
                                        )}

                                        <div className="flex flex-col gap-2 mb-4">
                                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                <CiCalendar size={18} />
                                                <span>
                                                    {dateFormatter(getScheduleStart(schedule) || schedule.date)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                <Clock size={18} />
                                                <span>
                                                    {formatTime12Hour(getScheduleStart(schedule))} - {formatTime12Hour(getScheduleEnd(schedule))}
                                                </span>
                                            </div>
                                            {schedule.notes && schedule?.notes?.["2026-04-07"] &&
                                                <div className="bg-amber-50 border-l-4 border-success p-3 mb-3 rounded-r-md">
                                                    <p className="text-sm font-semibold text-amber-800 mb-1">Schedule Note:</p>
                                                    <p className="text-sm text-amber-900">{schedule.notes[schedule.date]}</p>
                                                </div>}
                                            {schedule.meetingLink && (
                                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                    <Video size={18} />
                                                    <span>Zoom Class Available</span>
                                                </div>
                                            )}
                                            {schedule.teacherName && (
                                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                    <User size={18} />
                                                    <span>{schedule.teacherName}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Divider className="my-3" />

                                        {/* <div className="flex flex-wrap gap-2">
                                            {schedule.meetingLink && isClassLive({ ...schedule, scheduleDates: [schedule.date] }) ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-[#1570E8] text-white"
                                                    startContent={<LuSquareArrowOutUpRight size={16} />}
                                                    onPress={() => handleJoinClass(schedule)}
                                                    isLoading={isMarking === schedule.id}
                                                >
                                                    Join Class
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="bg-[#9A9A9A] text-white"
                                                    startContent={<Lock size={16} />}
                                                    isDisabled
                                                >
                                                    Join Locked
                                                </Button>
                                            )}
                                            {canReschedule(schedule) && (
                                                <Button
                                                    size="sm"
                                                    variant="bordered"
                                                    color="success"
                                                    onPress={() => {
                                                        closeDateModal();
                                                        navigate('/teacher/class-scheduling/manage', { state: schedule });
                                                    }}
                                                >
                                                    Reschedule
                                                </Button>
                                            )}
                                            {canCancel(schedule) && (
                                                <Button
                                                    size="sm"
                                                    variant="bordered"
                                                    color="danger"
                                                    onPress={() => {
                                                        closeDateModal();
                                                        handleCancelClass(schedule);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div> */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="flat"
                            onPress={() => closeDateModal()}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <RescheduleRequestModal
                isOpen={isRescheduleModalOpen}
                onClose={() => {
                    setIsRescheduleModalOpen(false);
                    setSelectedSchedule(null);
                }}
                schedule={selectedSchedule}
                onSubmit={handleSubmitRescheduleRequest}
                isSubmitting={isRescheduling}
            />

            <CancellationRequestModal
                isOpen={isCancelModalOpen}
                onClose={() => {
                    setIsCancelModalOpen(false);
                    setSelectedSchedule(null);
                }}
                schedule={selectedSchedule}
                onSubmit={handleSubmitCancellationRequest}
                isSubmitting={isCancelling}
            />

            <Modal isOpen={isDenyModalOpen} onOpenChange={(v) => { setIsDenyModalOpen(v); navigate('/student/class-scheduling'); }}>
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-success">Approve OR Decline Schedule</h2>
                        <p className="text-lg text-warning font-normal">
                            Please let us know , Are you Agree Or want to Decline.
                        </p>

                        {targetSchedule?.specificDates && Object.keys(targetSchedule.specificDates).length > 0 && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Requested Dates & Times:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(targetSchedule.specificDates).map(([date, times], index) => (
                                        <div key={index} className="text-xs flex justify-between bg-white p-2 rounded border border-gray-100 shadow-sm">
                                            <p
                                                key={index}
                                                className="text-[#666666] text-sm line-clamp-2"
                                            >
                                                {dateFormatter(getScheduleStart({ ...targetSchedule, date, startTime: times.startTime }, date) || date)} ({formatTime12Hour(getScheduleStart({ ...targetSchedule, date, startTime: times.startTime }, date))} - {formatTime12Hour(getScheduleEnd({ ...targetSchedule, date, endTime: times.endTime }, date))})
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ModalHeader>
                    <ModalBody>
                        <Textarea
                            label="Reason for Declining"
                            placeholder="Enter your reason here..."
                            variant="bordered"
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            minRows={4}
                            isRequired
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="bordered"
                            color="success"
                            onPress={() => {
                                handleApproved("approved")
                            }}
                            isLoading={isApproving}
                            isDisabled={isDenying}
                        >
                            Approve
                        </Button>
                        <Button
                            color="danger"
                            onPress={handleSubmitDeny}
                            isLoading={isDenying}
                            isDisabled={isApproving}
                        >
                            Decline
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default StudentClassSheduling;
