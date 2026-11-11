import { useState, useEffect } from "react";
import {
    Button,
    Chip,
    Pagination,
    Select,
    SelectItem,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import { DashHeading } from "../../components/dashboard-components/DashHeading";
import {
    useGetRescheduleRequestsQuery,
    useCancelRescheduleRequestMutation,
} from "../../redux/api/reschedule";
import { errorMessage, successMessage } from "../../lib/toast.config";
import { formatTime12Hour } from "../../utils/scheduleHelpers";
import { Calendar as CalendarIcon } from "lucide-react";

const StudentRescheduleRequests = () => {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");

    const { data, isFetching: isLoading, refetch } = useGetRescheduleRequestsQuery({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
    });

    useEffect(() => {
        if (data) {
            console.log("Reschedule Requests Data:", data);
        }
    }, [data]);

    const [cancelRequest, { isLoading: isCancelling }] = useCancelRescheduleRequestMutation();

    const handleCancelClick = async (request) => {
        if (!window.confirm("Are you sure you want to cancel this reschedule request?")) {
            return;
        }

        try {
            await cancelRequest(request.id).unwrap();
            successMessage("Reschedule request cancelled successfully");
            refetch();
        } catch (error) {
            errorMessage(error?.data?.message || "Failed to cancel request");
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: "warning",
            approved: "success",
            rejected: "danger",
            cancelled: "default",
        };
        return colors[status] || "default";
    };

    const formatDateSafe = (dateVal) => {
        if (!dateVal) return "-";
        const datePart = typeof dateVal === "string" ? dateVal.split("T")[0] : new Date(dateVal).toISOString().split("T")[0];
        const [year, month, day] = datePart.split("-").map(Number);
        if (!year || !month || !day) return dateVal;
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    const columns = [
        { key: "class", label: "Class" },
        { key: "originalSchedule", label: "Original Schedule" },
        { key: "requestedSchedule", label: "Requested Schedule" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
        { key: "requestedAt", label: "Requested At" },
        { key: "response", label: "Response" },
        { key: "actions", label: "Actions" },
    ];

    return (
        <div className="bg-white bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 min-h-screen">
            <DashHeading
                title="My Reschedule Requests"
                desc="View and manage your reschedule requests"
            />

            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 flex justify-between items-center">
                <Select
                    label="Filter by Status"
                    selectedKeys={[statusFilter]}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-xs"
                    size="sm"
                >
                    <SelectItem key="all" value="all">All Requests</SelectItem>
                    <SelectItem key="pending" value="pending">Pending</SelectItem>
                    <SelectItem key="approved" value="approved">Approved</SelectItem>
                    <SelectItem key="rejected" value="rejected">Rejected</SelectItem>
                    <SelectItem key="cancelled" value="cancelled">Cancelled</SelectItem>
                </Select>

                <Button
                    size="sm"
                    variant="flat"
                    onPress={() => refetch()}
                    className="bg-[#06574C] text-white"
                >
                    Refresh
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <Table
                    removeWrapper
                    isHeaderSticky
                    aria-label="Reschedule Requests Table"
                    classNames={{
                        base: "w-full bg-white rounded-lg min-h-[50vh] overflow-x-scroll w-full no-scrollbar max-h-[500px] shadow-md",
                        th: "font-bold bg-[#EBD4C9] p-4 text-md text-[#333333] capitalize tracking-widest ",
                        td: "py-3 items-center whitespace-nowrap",
                        tr: "border-b border-default-200",
                    }}
                >
                    <TableHeader columns={columns}>
                        {(column) => (
                            <TableColumn key={column.key} align={column.key === "actions" ? "center" : "start"}>
                                {column.label}
                            </TableColumn>
                        )}
                    </TableHeader>
                    <TableBody
                        loadingContent={<Spinner color="success" />}
                        loadingState={isLoading ? 'loading' : 'idle'}
                        emptyContent={<div className="text-center py-20">
                            <CalendarIcon className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-gray-500 text-lg">No reschedule requests found</p>
                            <p className="text-gray-400 text-sm mt-2">
                                {statusFilter !== "all"
                                    ? `Try changing the filter from "${statusFilter}" to "all"`
                                    : "You haven't submitted any reschedule requests yet"}
                            </p>
                        </div>}
                        items={data?.requests || []}>
                        {(request) => (
                            <TableRow key={request.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium text-sm">{request.scheduleTitle}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatDateSafe(request.originaldate || request.scheduleDate)}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-800">
                                            {formatDateSafe(request.originaldate || request.scheduleDate)}
                                        </p>
                                        <p className="text-gray-500">
                                            {formatTime12Hour(request.scheduleStartTime)}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        <p className="font-medium text-[#06574C]">
                                            {formatDateSafe(request.requestedDate)}
                                        </p>
                                        <p className="text-gray-500">
                                            {formatTime12Hour(request.requestedStartTime)} -{" "}
                                            {formatTime12Hour(request.requestedEndTime)}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm max-w-xs truncate" title={request.reason}>
                                        {request.reason || "-"}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <Chip size="sm" variant="flat" color={getStatusColor(request.status)}>
                                        {request.status}
                                    </Chip>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm">
                                        {new Date(request.requestedAt).toLocaleDateString()}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm max-w-xs truncate" title={request.adminResponse || "-"}>
                                        {request.adminResponse || "-"}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        {request.status === "pending" && (
                                            <Button
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                onPress={() => handleCancelClick(request)}
                                                isLoading={isCancelling}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        {request.status !== "pending" && (
                                            <Chip size="sm" variant="flat">
                                                {request.status === "approved" ? "Reviewed" : "Closed"}
                                            </Chip>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {data?.totalPages > 1 && (
                    <div className="flex justify-center mt-4 p-4">
                        <Pagination
                            total={data.totalPages}
                            page={page}
                            onChange={setPage}
                            color="primary"
                            showControls
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentRescheduleRequests;
