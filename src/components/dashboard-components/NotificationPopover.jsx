'use client'
import { Button, Chip, Popover, PopoverContent, PopoverTrigger, useSelect } from '@heroui/react'
import { useEffect, useState } from 'react'
import { FaRegBell } from 'react-icons/fa6'
import { useGetNotificationsQuery, useMarkAsReadMutation } from '../../redux/api/notifications'
import { useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { dateFormatter } from '../../lib/utils'
import { resolveNotificationUrl } from '../../lib/notificationLinks'

const NotificationPopover = ({ isHomeMob = false }) => {
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
    const [initialUnreadCount, setInitialUnreadCount] = useState(0);
    const { user } = useSelector((state) => state.user);
    const currentUser = user || {};
    const userId = user?.id;
    const userPermissions = (currentUser?.permissions || []);
    const canAccessNotifications =
        (currentUser?.role === 'admin' && userPermissions?.includes('/admin/notifications')) ||
        (currentUser?.role !== 'admin');

    const { data: notificationsData, refetch } = useGetNotificationsQuery({
        is_read: 'false',
        is_pop_over: 'true',
        limit: 20,
        page: 1
    }, {
        skip: !canAccessNotifications,
        pollingInterval: 60000  // Poll every 60 seconds for new notifications
    });

    const [markAsRead] = useMarkAsReadMutation();

    const unreadNotifications = notificationsData?.data || [];
    const unreadCount = notificationsData?.pagination?.unreadCount || 0;
    
    // Track initial unread count on page load
    useEffect(() => {
        if (notificationsData && initialUnreadCount === 0) {
            setInitialUnreadCount(unreadCount || unreadNotifications.length);
        }
        
        // Check if there are more unread notifications than when page first loaded
        if (notificationsData) {
            const currentUnread = unreadCount || unreadNotifications.length;
            if (currentUnread > initialUnreadCount) {
                setHasNewNotifications(true);
            }
        }
    }, [notificationsData, initialUnreadCount, unreadCount, unreadNotifications.length]);
    const isHome = [
        "/",
        "/property-listing",
        "/faqs",
        "/contact",
        "/available-properties",
    ];
    const handleRoute = () => {
        if (currentUser?.role === "admin") {
            return ("/admin/notifications");
        } else if (currentUser?.role === "student" ) {
            return ("/student/notifications");
        } else {
            return ("/teacher/notifications");
        }
    };
    if (!canAccessNotifications) {
        return null;
    }
    return (
        <Popover className="relative" isOpen={isOpen} onOpenChange={setIsOpen}>
            {(
                (currentUser?.role === 'admin' && userPermissions?.includes('/admin/notifications')) ||
                currentUser?.role !== 'admin'
            ) && <PopoverTrigger>
                    <button
                        onClick={() => refetch()}
                        type="button"
                        className="relative inline-flex cursor-pointer items-center justify-center p-3 border-[#CBD5E1] border  bg-white rounded-full shadow-sm hover:shadow-md"
                        title="Notifications"
                    >
                        <FaRegBell
                            className={(isHome.includes(pathname) && !isHomeMob)
                                ? "text-white"
                                : (hasNewNotifications || unreadCount > 0 || unreadNotifications.length > 0) ? "text-red-600" : " text-[#406C65]"
                            }
                            size={20}
                        />
                        {(hasNewNotifications || unreadCount || unreadNotifications.length) > 0 && < span className="pointer-events-none absolute -top-1 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1.2 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none ring-2 ring-white z-10">
                            {unreadCount || unreadNotifications.length}
                        </span>}
                    </button>

                </PopoverTrigger>}

            <PopoverContent className="p-0 mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                <div className=" py-3 px-2  flex w-full  justify-between">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                            Notifications
                        </h4>
                    </div>
                    <div className="flex justify-between ml-2">
                        <Chip
                            size="sm"
                            variant="flat"
                            className="bg-[#d0ded7] shrink-0 text-white font-bold"
                        >
                             {unreadCount || unreadNotifications.length}
                        </Chip>
                    </div>
                </div>

                {unreadNotifications.length !== 0 ? (
                    <div className=" py-2 border-t border-gray-100 max-h-[300px] overflow-scroll no-scrollbar w-full">
                        {unreadNotifications.map((notification, index) => (
                            <div key={index} className="flex items-center gap-4 py-3 justify-center w-full ">
                                <div className="flex flex-col items-start gap-2 shadow-md hover:bg-gray-100 p-2 rounded-lg w-[95%]">
                                    <div className="flex flex-col px-2 w-full ">
                                        <div className="text-sm font-semibold">
                                            {notification.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {notification.description}
                                        </div>
                                        <div className="flex items-center w-full gap-2 justify-between">
                                            {resolveNotificationUrl(notification?.url, user?.role, notification) && (
                                                <Link
                                                    to={resolveNotificationUrl(notification.url, user?.role, notification)}
                                                    className="underline text-[12px] text-[#406c65] hover:opacity-80 transition-opacity"
                                                    onClick={() => markAsRead({ id: notification.id })}
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                            <span className='text-xs text-[#406c65]'>{dateFormatter(notification.created_at, true)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 font-bold py-10">
                        No New notifications
                    </div>
                )}

                <div className=" py-3 border-t border-gray-100  w-full px-4">
                    <Button
                        variant="bordered"
                        color="success"
                        className="w-full"
                        as={Link}
                        to={handleRoute()}
                    >
                        View All
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default NotificationPopover
