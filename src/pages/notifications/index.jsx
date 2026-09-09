import React, { useState, useEffect } from "react";
import { DashHeading } from "../../components/dashboard-components/DashHeading";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Skeleton,
  Input,
  Select,
  SelectItem,
  Spinner,
  Pagination,
} from "@heroui/react";
import { BellRing, CheckCircle2, Clock, Search, Check, Trash2, DollarSign, Home, MessageSquare } from "lucide-react";
import { useGetNotificationsQuery, useMarkAsReadMutation, useDeleteReadNotificationsMutation } from "../../redux/api/notifications";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { resolveNotificationUrl } from "../../lib/notificationLinks";

const NotificationsPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isReadSort, setIsReadSort] = useState("");
  const [markLoading, setMarkLoading] = useState(null);
  const { user } = useSelector(state => state?.user);

  const isFilter = page > 1 || debouncedSearch || isReadSort;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [isReadSort, debouncedSearch]);

  const { data: notificationData, isFetching, isLoading } = useGetNotificationsQuery({
    search: debouncedSearch,
    page,
    is_read: isReadSort
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteReadNotifications, { isLoading: isDeleting }] = useDeleteReadNotificationsMutation();

  const notifications = notificationData?.data || [];
  const pagination = notificationData?.pagination || { totalPages: 1 };

  const handleMarkAsRead = (id) => {
    markAsRead({ id, is_read: true });
  };

  const handleMarkAllAsRead = () => {
    markAsRead({ is_read: true });
  };

  const handleDeleteRead = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Confirm Delete",
      text: "Are you sure you want to delete all read notifications?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "red",
      cancelButtonColor: '#406c65',
      buttonsStyling: false,
      customClass: {
        confirmButton: "z-0 cursor-pointer group relative inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal bg-[#406c65] border-1 rounded-md text-white px-4 min-w-20 h-10 text-small mr-2",
        cancelButton: "z-0 group cursor-pointer relative inline-flex items-center justify-center box-border appearance-none select-none px-4 min-w-20 h-10 text-small gap-2 whitespace-nowrap font-normal bg-white border-1 rounded-md text-[#406c65] border-[#406c65]"
      }
    });

    if (!isConfirmed) return;

    await deleteReadNotifications();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'withdrawal': return <DollarSign size={24} />;
      case 'dispute': return <BellRing size={24} />;
      case 'property': return <Home size={24} />;
      case 'message': return <MessageSquare size={24} />;
      default: return <BellRing size={24} />;
    }
  };

  const getIconBg = (type, isRead) => {
    if (isRead) return 'bg-gray-100 text-gray-400';
    switch (type) {
      case 'withdrawal': return 'bg-[#06574C] text-white';
      case 'dispute': return 'bg-blue-100 text-blue-600';
      case 'property': return 'bg-green-100 text-green-600';
      default: return 'bg-[#06574C] text-white';
    }
  };


  return (
    <div className="bg-white bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 pb-6 ">
      <div className="">
        <div className="mb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <DashHeading
              title="Notifications"
              desc="Stay updated with the latest platform activities and alerts."
            />

            <div className="flex justify-end max-md:justify-start flex-row flex-wrap items-end gap-3">
              <Input
                placeholder="Search Notifications..."
                startContent={<Search size={18} className="text-gray-400" />}
                className="w-full md:w-64"
                // endContent={
                //   isFetching ?
                //     <Spinner size="sm" color="success" />
                //     : undefined
                // }
                size="sm"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Filter by read status"
                size="sm"
                className="max-w-[180px]"
                defaultSelectedKeys={new Set([isReadSort])}
                onSelectionChange={(keys) => {
                  const k = [...keys];
                  setIsReadSort(k[0])
                }}
              >
                <SelectItem key="" >Latest</SelectItem>
                <SelectItem key="true">Read</SelectItem>
                <SelectItem key="false">Unread</SelectItem>
              </Select>
              {notifications?.some(n => !n.is_read) && (
                <Button
                  color="success"
                  startContent={<Check size={18} />}
                  onPress={handleMarkAllAsRead}
                  size="sm"
                >
                  Mark All Read
                </Button>
              )}
              <Button
                color="danger"
                startContent={<Trash2 size={18} />}
                onPress={handleDeleteRead}
                isLoading={isDeleting}
                size="sm"
              >
                Delete Read
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 min-h-[80vh]">
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-full bg-white shadow-sm h-30 rounded-xl" />
            ))
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <Card key={notif.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardBody className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon Box */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(notif.type, notif.is_read)}`}>
                      {getIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 h-full">
                        <div className="w-full">
                          <h3 className={`text-xl ${!notif.is_read ? 'font-bold' : 'font-semibold'} text-gray-900 truncate`}>
                            {notif.title}
                          </h3>
                          <p className="text-gray-500 text-base line-clamp-2">
                            {notif.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                            {resolveNotificationUrl(notif.url, user?.role, notif) && (
                              <Link
                                to={resolveNotificationUrl(notif.url, user?.role, notif)}
                                className="underline text-gray-600 font-medium hover:text-[#06574C]"
                              >
                                View Details
                              </Link>
                            )}
                            {!notif.is_read && (
                              <>
                                <span className="text-gray-300">•</span>
                                <Button
                                  onPress={() => handleMarkAsRead(notif.id)}
                                  variant="light"
                                  color="success"
                                  size="sm"
                                >
                                  Mark as Read
                                </Button>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-400">Unread</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="shrink-0 text-gray-400 text-sm font-medium sm:mt-1">
                          {(() => {
                            const diff = Math.floor((new Date() - new Date(notif.created_at)) / (1000 * 60 * 60 * 24));
                            return diff === 0 ? "Today" : `${diff} days ago`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          ) : (
            <div className="text-center py-20  bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500 text-lg">No notifications found</p>
            </div>
          )}
        </div>
        <Pagination
          showControls
          total={pagination.totalPages}
          size="sm"
          variant="faded"
          page={page}
          onChange={setPage}
          color="success"
          className="max-w-[300px] my-4 mx-auto"
        />
      </div>
    </div>
  );
};

export default NotificationsPage;
