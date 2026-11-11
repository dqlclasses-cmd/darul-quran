import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

import { DashHeading } from "../../components/dashboard-components/DashHeading";
import { ScheduleCard } from "../../components/schedule/ScheduleCard";
import { RescheduleRequestModal } from "../../components/schedule/RescheduleRequestModal";
import { errorMessage, successMessage } from "../../lib/toast.config";
import { useCreateRescheduleRequestMutation } from "../../redux/api/reschedule";
import { CancellationRequestModal } from "../../components/schedule/CancellationRequestModal";
import { useCreateCancellationRequestMutation } from "../../redux/api/cancellation";

const StudentClassSchedule = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);

    const [createRescheduleRequest, { isLoading: isSubmittingReschedule }] = useCreateRescheduleRequestMutation();
    const [createCancellationRequest, { isLoading: isSubmittingCancellation }] = useCreateCancellationRequestMutation();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.user) {
                setCurrentUser(data.user);
                await fetchSchedules();
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to fetch user", error);
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/schedule/getAll`);
            const data = await res.json();

            if (data.success) {
                setSchedules(data.schedules);
            }
        } catch (error) {
            console.error("Failed to fetch schedules", error);
            errorMessage("Failed to load class schedule");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinClass = async (schedule) => {
        if (!currentUser) {
            errorMessage("Please login first");
            return;
        }

        try {
            await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/attendance/mark`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scheduleId: schedule.id,
                    studentId: currentUser.id,
                    courseId: schedule.courseId,
                })
            });

            window.open(schedule.meetingLink, '_blank');
            successMessage("Joined class! Attendance marked.");
        } catch (error) {
            console.error("Failed to mark attendance", error);
            window.open(schedule.meetingLink, '_blank');
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

    const handleRequestCancellation = (schedule) => {
        setSelectedSchedule(schedule);
        setIsCancellationModalOpen(true);
    };

    const handleSubmitCancellationRequest = async (requestData) => {
        try {
            await createCancellationRequest(requestData).unwrap();
            successMessage("Cancellation request submitted successfully!");
            setIsCancellationModalOpen(false);
            setSelectedSchedule(null);
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to submit cancellation request");
        }
    };

    // Check if student can reschedule (more than 4 hours before class)
    const canReschedule = (schedule) => {
        const scheduleDates = schedule.scheduleDates?.length > 0
            ? schedule.scheduleDates
            : (schedule.date ? [schedule.date] : []);
        const todayStr = new Date().toISOString().split('T')[0];
        const upcomingDates = scheduleDates.filter(d => (typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0]) >= todayStr);
        if (upcomingDates.length === 0) return false;
        const nextDate = typeof upcomingDates[0] === 'string' ? upcomingDates[0].split('T')[0] : new Date(upcomingDates[0]).toISOString().split('T')[0];
        const scheduleDateTime = new Date(`${nextDate}T${schedule.startTime}`);
        const now = new Date();
        const hoursUntilClass = (scheduleDateTime - now) / (1000 * 60 * 60);
        return hoursUntilClass > 4;
    };

    return (
        <div className="bg-white bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 min-h-screen">
            <DashHeading
                title="My Class Schedule"
                desc="View and join your upcoming live classes"
            />

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06574C]"></div>
                </div>
            ) : schedules.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center">
                    <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-500">No upcoming classes scheduled</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                    {schedules.map((schedule) => (
                        <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            onJoin={handleJoinClass}
                            showJoinButton={true}
                            showTeacherName={true}
                            showRescheduleButton={true}
                            canReschedule={canReschedule(schedule)}
                            onRequestReschedule={handleRequestReschedule}
                            showCancellationButton={true}
                            onRequestCancellation={handleRequestCancellation}
                        />
                    ))}
                </div>
            )}

            <RescheduleRequestModal
                isOpen={isRescheduleModalOpen}
                onClose={() => {
                    setIsRescheduleModalOpen(false);
                    setSelectedSchedule(null);
                }}
                schedule={selectedSchedule}
                onSubmit={handleSubmitRescheduleRequest}
                isSubmitting={isSubmittingReschedule}
            />

            <CancellationRequestModal
                isOpen={isCancellationModalOpen}
                onClose={() => {
                    setIsCancellationModalOpen(false);
                    setSelectedSchedule(null);
                }}
                schedule={selectedSchedule}
                onSubmit={handleSubmitCancellationRequest}
                isSubmitting={isSubmittingCancellation}
            />
        </div>
    );
};

export default StudentClassSchedule;
