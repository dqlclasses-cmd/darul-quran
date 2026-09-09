import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashHeading } from "../../../components/dashboard-components/DashHeading";
import {
  Button,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Spinner,
  Chip,
  User,
  Input,
} from "@heroui/react";
import {
  Eye,
  MessageCircle,
  MessageSquare,
  Trash2,
  TicketIcon,
} from "lucide-react";
import {
  useGetAllTicketsQuery,
  useGetTicketByIdQuery,
  useRespondToTicketMutation,
  useDeleteTicketMutation,
} from "../../../redux/api/supportTickets";
import { addToast } from "@heroui/react";
import Swal from "sweetalert2";
import { debounce } from "../../../lib/utils";

const STATUS_COLORS = {
  open: { bg: "bg-[#E8F1FF]", text: "text-[#3F86F2]" },
  pending: { bg: "bg-[#FBF4EC]", text: "text-[#D28E3D]" },
  resolved: { bg: "bg-[#95C4BE33]", text: "text-[#06574C]" },
  cancelled: { bg: "bg-[#FFE8E8]", text: "text-[#E53E3E]" },
};

const AdminSupportTickets = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");

  const respondModal = useDisclosure();
  const viewModal = useDisclosure();

  const { data, isLoading, isFetching } = useGetAllTicketsQuery({
    page,
    limit: 10,
    search,
    status: statusFilter
  });
  const [respondToTicket, { isLoading: isResponding }] = useRespondToTicketMutation();
  const [deleteTicket] = useDeleteTicketMutation();

  const tickets = data?.tickets || [];
  const totalPages = data?.totalPages || 1;
  const deepLinkTicketId = searchParams.get("ticketId");

  const { data: deepLinkTicketData } = useGetTicketByIdQuery(deepLinkTicketId, {
    skip: !deepLinkTicketId,
  });

  // Deep-link from notifications: /admin/tickets?ticketId=123
  useEffect(() => {
    const ticket = deepLinkTicketData?.ticket || deepLinkTicketData;
    if (!deepLinkTicketId || !ticket?.id) return;
    setSelectedTicket(ticket);
    viewModal.onOpen();
    const next = new URLSearchParams(searchParams);
    next.delete("ticketId");
    setSearchParams(next, { replace: true });
  }, [deepLinkTicketId, deepLinkTicketData]);

  const handleRespondOpen = (ticket) => {
    setSelectedTicket(ticket);
    setResponseMessage(ticket.adminResponse || "");
    setTicketStatus(ticket.status);
    respondModal.onOpen();
  };

  const handleViewOpen = (ticket) => {
    setSelectedTicket(ticket);
    viewModal.onOpen();
  };

  const handleSubmitResponse = async () => {
    try {
      await respondToTicket({
        id: selectedTicket.id,
        adminResponse: responseMessage,
        status: ticketStatus,
      }).unwrap();
      addToast({ title: "Response sent successfully!", color: "success" });
      respondModal.onClose();
    } catch (err) {
      addToast({ title: err?.data?.message || "Failed to send response", color: "danger" });
    }
  };

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#06574C",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    })
    if (!isConfirmed) return; try {
      await deleteTicket(id).unwrap();
      addToast({ title: "Ticket deleted", color: "success" });
    } catch (err) {
      addToast({ title: err?.data?.message || "Failed to delete ticket", color: "danger" });
    }
  };

  return (
    <div className="bg-white sm:bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 min-h-full">
      <DashHeading
        title={"Support"}
        desc={"Manage and respond to student and teacher help requests"}
      />

      <div className="bg-[#EBD4C9] max-sm:flex-wrap gap-2 p-2 sm:p-4 rounded-lg my-3 flex  justify-start items-center">
        <Select
          className="max-w-[150px]"
          radius="sm"
          size="md"
          placeholder="Filter by Status"
          // label="Filter by Status"
          selectedKeys={[statusFilter]}
          onSelectionChange={(keys) => setStatusFilter([...keys][0] || "all")}
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="open">Open</SelectItem>
          <SelectItem key="pending">Pending</SelectItem>
          <SelectItem key="resolved">Resolved</SelectItem>
          <SelectItem key="cancelled">Cancelled</SelectItem>
        </Select>
        <Input
          type="search"
          placeholder="Search..."
          radius="sm"
          className="max-w-[180px]"
          defaultValue={search}
          onChange={(e) =>
            debounce(() => {
              setSearch(e.target.value);
            }, 400)
          }
        />
      </div>

      <div className="overflow-hidden">
        <Table
          isHeaderSticky
          align="center"
          removeWrapper
          classNames={{
            base: "w-full bg-white rounded-lg overflow-x-auto no-scrollbar h-[calc(100vh-280px)]",
            th: "font-bold p-4 text-md text-[#333333] capitalize tracking-widest bg-[#ebd4c9]",
            td: "py-3 items-center whitespace-nowrap px-4",
            tr: "border-b border-default-200",
          }}
        >
          <TableHeader>
            <TableColumn>User</TableColumn>
            <TableColumn>Issue Summary</TableColumn>
            <TableColumn>Role</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Date</TableColumn>
            <TableColumn>Action</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isLoading || isFetching}
            loadingContent={<Spinner color="success" />}
            emptyContent="No support  found."
          >
            {tickets.map((ticket) => {
              const color = STATUS_COLORS[ticket.status] || STATUS_COLORS.open;
              return (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <User
                      name={`${ticket.userName} ${ticket.userLastName || ""}`}
                      description={ticket.userEmail}
                      avatarProps={{
                        radius: "sm",
                        className: "bg-[#06574C] text-white font-bold",
                        name: ticket.userName?.charAt(0),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate font-medium">
                      {ticket.title}
                    </div>
                    <div className="max-w-[200px] text-sm truncate text-gray-500">
                      {ticket.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      className="capitalize"
                      color={ticket.userRole === "teacher" ? "secondary" : "primary"}
                    >
                      {ticket.userRole}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
                    >
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        radius="sm"
                        variant="bordered"
                        size="sm"
                        className="border-[#06574C] text-[#06574C]"
                        startContent={<Eye size={18} />}
                        onPress={() => handleViewOpen(ticket)}
                      >
                        View
                      </Button>
                      <Button
                        radius="sm"
                        size="sm"
                        className="bg-[#06574C] text-white"
                        startContent={<MessageSquare size={18} />}
                        onPress={() => handleRespondOpen(ticket)}
                      >
                        Reply
                      </Button>
                      <Button
                        radius="sm"
                        variant="flat"
                        size="sm"
                        className="text-[#06574C] bg-teal-100"
                        startContent={<MessageCircle size={18} />}
                        onPress={() =>
                          navigate("/admin/help/messages", {
                            state: { fromTicket: true, ticketId: ticket.id },
                          })
                        }
                      >
                        Start chat
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(ticket.id)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* {totalPages > 1 && ( */}
      <div className="flex justify-between items-center p-4">
        <span className="text-sm text-gray-500">
          Showing Page {page} of {totalPages}
        </span>
        <Pagination
          showControls
          variant="ghost"
          page={page}
          total={totalPages}
          onChange={setPage}
          classNames={{
            item: "rounded-sm",
            cursor: "bg-[#06574C] rounded-sm text-white",
            prev: "rounded-sm bg-gray-200",
            next: "rounded-sm bg-gray-200",
          }}
        />
      </div>
      {/* )} */}

      {/* ── Respond Modal ── */}
      <Modal isOpen={respondModal.isOpen} onOpenChange={respondModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Update Ticket Response</ModalHeader>
              <ModalBody>
                {selectedTicket && (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">User's Message</p>
                      <p className="font-semibold text-gray-800">{selectedTicket.title}</p>
                      <p className="text-sm text-gray-600 mt-2">{selectedTicket.description}</p>
                    </div>

                    <Select
                      label="Update Status"
                      radius="sm"
                      selectedKeys={[ticketStatus]}
                      onSelectionChange={(keys) => setTicketStatus([...keys][0])}
                    >
                      <SelectItem key="pending">Pending</SelectItem>
                      <SelectItem key="open">Open</SelectItem>
                      <SelectItem key="resolved">Resolved</SelectItem>
                      <SelectItem key="cancelled">Cancelled</SelectItem>
                    </Select>

                    <Textarea
                      label="Admin Response"
                      placeholder="Write your response here..."
                      radius="sm"
                      minRows={4}
                      value={responseMessage}
                      onValueChange={setResponseMessage}
                    />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" radius="sm" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#06574C] text-white"
                  radius="sm"
                  isLoading={isResponding}
                  onPress={handleSubmitResponse}
                >
                  Save Response
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── View Detail Modal ── */}
      <Modal isOpen={viewModal.isOpen} onOpenChange={viewModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <TicketIcon size={20} className="text-[#06574C]" />
                Ticket Preview
              </ModalHeader>
              <ModalBody>
                {selectedTicket && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <User
                        name={`${selectedTicket.userName} ${selectedTicket.userLastName || ""}`}
                        description={`${selectedTicket.userEmail} (${selectedTicket.userRole})`}
                        avatarProps={{
                          radius: "sm",
                          name: selectedTicket.userName?.charAt(0),
                          className: "bg-[#06574C] text-white",
                        }}
                      />
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedTicket.status]?.bg
                          } ${STATUS_COLORS[selectedTicket.status]?.text}`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>
                    <hr className="border-gray-100" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Issue</p>
                      <p className="font-semibold text-gray-800">{selectedTicket.title}</p>
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                        {selectedTicket.description}
                      </p>
                    </div>
                    {selectedTicket.adminResponse && (
                      <div className="bg-[#95C4BE20] border border-[#06574C30] rounded-lg p-3">
                        <p className="text-xs text-[#06574C] font-bold mb-1">Response sent:</p>
                        <p className="text-gray-800 text-sm italic">
                          "{selectedTicket.adminResponse}"
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          At: {new Date(selectedTicket.adminResponseAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button className="bg-[#06574C] text-white" radius="sm" onPress={onClose}>
                  Dismiss
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AdminSupportTickets;
