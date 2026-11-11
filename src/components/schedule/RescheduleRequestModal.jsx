import { useState, useEffect, useMemo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
} from "@heroui/react";
import { formatTime12Hour } from "../../utils/scheduleHelpers";

export const RescheduleRequestModal = ({
    isOpen,
    onClose,
    schedule,
    onSubmit,
    isSubmitting
}) => {
    const [selectedOriginalDate, setSelectedOriginalDate] = useState("");
    const [requestedDate, setRequestedDate] = useState("");
    const [requestedStartTime, setRequestedStartTime] = useState("");
    const [requestedEndTime, setRequestedEndTime] = useState(""); 
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});

    // Collect all candidate dates for this schedule
    const availableDates = useMemo(() => {
        if (!schedule) return [];
        const todayStr = new Date().toISOString().split("T")[0];
        let dates = [];
        if (Array.isArray(schedule.scheduleDates) && schedule.scheduleDates.length > 0) {
            dates = [...schedule.scheduleDates];
        }
        if (schedule.specificDates && typeof schedule.specificDates === "object") {
            dates = [...dates, ...Object.keys(schedule.specificDates)];
        }
        if (schedule.date) {
            const d = typeof schedule.date === "string" ? schedule.date.split("T")[0] : new Date(schedule.date).toISOString().split("T")[0];
            if (!dates.includes(d)) dates.push(d);
        }
        const normalized = Array.from(
            new Set(
                dates.map((d) =>
                    typeof d === "string"
                        ? d.split("T")[0]
                        : new Date(d).toISOString().split("T")[0]
                )
            )
        ).sort();

        // Prefer dates starting from today
        const upcoming = normalized.filter((d) => d >= todayStr);
        return upcoming.length > 0 ? upcoming : normalized;
    }, [schedule]);

    useEffect(() => {
        if (isOpen && schedule) {
            setRequestedDate("");
            setRequestedStartTime(schedule.startTime || "");
            setRequestedEndTime(schedule.endTime || "");
            setReason("");
            setErrors({});

            // Pick the best default original date to reschedule
            const todayStr = new Date().toISOString().split("T")[0];
            let defaultDate = "";
            if (schedule.selectedDate) {
                defaultDate = typeof schedule.selectedDate === "string" ? schedule.selectedDate.split("T")[0] : new Date(schedule.selectedDate).toISOString().split("T")[0];
            } else if (availableDates.length > 0) {
                const schedDateStr = schedule.date ? (typeof schedule.date === "string" ? schedule.date.split("T")[0] : new Date(schedule.date).toISOString().split("T")[0]) : null;
                if (schedDateStr && schedDateStr >= todayStr && availableDates.includes(schedDateStr)) {
                    defaultDate = schedDateStr;
                } else {
                    defaultDate = availableDates[0];
                }
            } else if (schedule.date) {
                defaultDate = typeof schedule.date === "string" ? schedule.date.split("T")[0] : new Date(schedule.date).toISOString().split("T")[0];
            }
            setSelectedOriginalDate(defaultDate);
        }
    }, [isOpen, schedule, availableDates]);

    const formatDateDisplay = (dateVal) => {
        if (!dateVal) return "-";
        const datePart = typeof dateVal === "string" ? dateVal.split("T")[0] : new Date(dateVal).toISOString().split("T")[0];
        const [year, month, day] = datePart.split("-").map(Number);
        if (!year || !month || !day) return dateVal;
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!requestedDate) {
            newErrors.date = "Requested date is required";
        } else {
            const selectedDate = new Date(requestedDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = "Date cannot be in the past";
            }
        }

        if (!requestedStartTime) {
            newErrors.startTime = "Start time is required";
        }

        if (!requestedEndTime) {
            newErrors.endTime = "End time is required";
        } else if (requestedStartTime && requestedEndTime) {
            const start = new Date(`2000-01-01 ${requestedStartTime}`);
            const end = new Date(`2000-01-01 ${requestedEndTime}`);
            if (end <= start) {
                newErrors.endTime = "End time must be after start time";
            }
        }

        if (!reason || reason.trim().length < 10) {
            newErrors.reason = "Please provide a reason (at least 10 characters)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        const originalDateToSubmit =
            selectedOriginalDate ||
            availableDates[0] ||
            (schedule.date
                ? (typeof schedule.date === "string"
                    ? schedule.date.split("T")[0]
                    : new Date(schedule.date).toISOString().split("T")[0])
                : requestedDate);

        onSubmit({
            scheduleId: schedule.id,
            courseId: schedule.courseId,
            requestedDate,
            originaldate: originalDateToSubmit,
            originalDate: originalDateToSubmit,
            requestedStartTime,
            requestedEndTime,
            reason,
            studentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 4);
        now.setMinutes(0, 0, 0);
        return now.toISOString().slice(0, 16);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            scrollBehavior="inside"
            classNames={{
                base: "rounded-xl",
                header: "border-b border-gray-100 pb-4",
                body: "py-6",
                footer: "border-t border-gray-100 pt-4"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold text-[#06574C]">Request Reschedule</h2>
                    <p className="text-sm text-gray-500 font-normal">
                        Submit a request to reschedule your class
                    </p>
                </ModalHeader>

                <ModalBody>
                    {schedule && (
                        <div className="bg-[#95C4BE]/20 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-[#06574C] mb-2">Current Class Session</h3>
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-700"><strong>Class:</strong> {schedule.title}</p>
                                {schedule.courseName && (
                                    <p className="text-gray-700"><strong>Course:</strong> {schedule.courseName}</p>
                                )}

                                {availableDates.length > 1 ? (
                                    <div className="mt-2">
                                        <label className="block text-xs font-semibold text-[#06574C] mb-1">
                                            Select Class Date to Reschedule:
                                        </label>
                                        <Select
                                            size="sm"
                                            aria-label="Select class date to reschedule"
                                            selectedKeys={selectedOriginalDate ? [selectedOriginalDate] : []}
                                            onChange={(e) => setSelectedOriginalDate(e.target.value)}
                                            className="w-full bg-white rounded-md"
                                        >
                                            {availableDates.map((date) => (
                                                <SelectItem key={date} value={date}>
                                                    {formatDateDisplay(date)}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                ) : (
                                    <p className="text-gray-700">
                                        <strong>Date to Reschedule:</strong> {formatDateDisplay(selectedOriginalDate || availableDates[0] || schedule.date)}
                                    </p>
                                )}

                                <p className="text-gray-700">
                                    <strong>Current Timing:</strong>{" "}
                                    {schedule?.specificDates?.[selectedOriginalDate]?.startTime
                                        ? `${formatTime12Hour(schedule.specificDates[selectedOriginalDate].startTime)} - ${formatTime12Hour(schedule.specificDates[selectedOriginalDate].endTime)}`
                                        : `${formatTime12Hour(schedule.startTime)} - ${formatTime12Hour(schedule.endTime)}`}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> Reschedule requests must be made at least 4 hours before the scheduled class time.
                        </p>
                    </div>

                    <Input
                        placeholder="Requested Date"
                        label="Requested Date"
                        type="date"
                        value={requestedDate}
                        onChange={(e) => setRequestedDate(e.target.value)}
                        isInvalid={!!errors.date}
                        errorMessage={errors.date}
                        min={getMinDateTime()}
                        required
                        classNames={{
                            label: "text-sm font-medium text-gray-700"
                        }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Time"
                            type="time"
                            value={requestedStartTime}
                            onChange={(e) => setRequestedStartTime(e.target.value)}
                            isInvalid={!!errors.startTime}
                            errorMessage={errors.startTime}
                            required
                            classNames={{
                                label: "text-sm font-medium text-gray-700"
                            }}
                        />
                        <Input
                            label="End Time"
                            type="time"
                            value={requestedEndTime}
                            onChange={(e) => setRequestedEndTime(e.target.value)}
                            isInvalid={!!errors.endTime}
                            errorMessage={errors.endTime}
                            required
                            classNames={{
                                label: "text-sm font-medium text-gray-700"
                            }}
                        />
                    </div>

                    <Textarea
                        label="Reason for Reschedule"
                        placeholder="Please explain why you need to reschedule..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        isInvalid={!!errors.reason}
                        errorMessage={errors.reason}
                        minRows={3}
                        required
                        classNames={{
                            label: "text-sm font-medium text-gray-700"
                        }}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>ℹ Information:</strong> Your request will be reviewed by the teacher / admin team. You will be notified via email once a decision is made.
                        </p>
                    </div>
                </ModalBody>

                <ModalFooter className="flex gap-2">
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isSubmitting}
                        classNames={{
                            base: "text-gray-700"
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleSubmit}
                        isLoading={isSubmitting}
                        className="bg-[#06574C] text-white"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default RescheduleRequestModal;
