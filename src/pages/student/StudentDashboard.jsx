import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button, Pagination, Progress, Skeleton } from "@heroui/react";
import { Clock, Video, VideoIcon, Check, Lock, CalendarDays, ArrowRight } from "lucide-react";
import { AiOutlineEye } from "react-icons/ai";
import { FaRegAddressCard } from "react-icons/fa";
import { BiGroup } from "react-icons/bi";
import { GrAnnounce } from "react-icons/gr";
import { CiCalendar } from "react-icons/ci";
import { useSelector } from "react-redux";
import NotificationPermission from "../../components/NotificationPermission";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination as SwiperPagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import { Spinner } from "@heroui/react";
import VideoPlayer from "../../components/dashboard-components/Video";
import { useGetEnrolledCoursesQuery } from "../../redux/api/courses";
import { useGetAllAnnouncementQuery } from "../../redux/api/announcements";
import { errorMessage, successMessage } from "../../lib/toast.config";
import { dateFormatter } from "../../lib/utils";
import QueryError from "../../components/QueryError";
import { formatTime12Hour, isClassExpired, isClassLive, getHoursUntilClass, getStatusText, getScheduleStart, getScheduleEnd } from "../../utils/scheduleHelpers";
import { useGetStudentDashboardQuery } from "../../redux/api/dashboard";


const StudentDashboard = () => {
  const { user } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isMarking, setIsMarking] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useGetEnrolledCoursesQuery({
    page,
  });
  useEffect(() => {
    const reschedulingRedirect = sessionStorage.getItem("rescheduling_redirecting");
    if (reschedulingRedirect) {
      sessionStorage.removeItem("rescheduling_redirecting");
      navigate(reschedulingRedirect);
    }
  }, [location.search, navigate]);

  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
    refetch: dashboardRefetch
  } = useGetStudentDashboardQuery()

  const announcementsSlider = dashboardData?.data?.announcements || [];
  const upcomingClasses = dashboardData?.data?.upcomingClasses || [];
  const announcementsList = dashboardData?.data?.recentAnnouncements || [];
  const handleJoinClass = async (schedule) => {
    if (!user) {
      errorMessage("Please login first");
      return;
    }
    setIsMarking(schedule.id);
    const finalToken = localStorage.getItem("token");
    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/attendance/mark`, {
        method: "POST",
        credentials: "include",
        headers: { "Authorization": `Bearer ${finalToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          studentId: user.id,
          courseId: schedule.courseId,
          date: schedule.date
        })
      });
      const data = await res.json();
      if (res.ok) {
        window.open(data?.link, '_blank');
        // successMessage(data?.message || "Joined class! Attendance marked.");
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
  if (dashboardError) {
    return <QueryError
      height="300px"
      error={dashboardError}
      onRetry={dashboardRefetch}
      showLogo={false}
      isLoading={dashboardLoading}
    />
  }
  return (
    <div className="bg-white bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 h-fsull px-2 sm:px-3">
      {/* banner slider */}
      <div className="mt-3 w-full rounded-lg overflow-hidden">
        <Swiper
          spaceBetween={30}
          centeredSlides={true}
          autoplay={{
            delay: 4500,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          navigation={true}
          modules={[Autoplay, SwiperPagination, Navigation]}
          className="mySwiper rounded-lg"
        >
          {announcementsSlider.length > 0 ? (
            announcementsSlider.map((item, index) => (
              <SwiperSlide key={item.id || index}>
                <div
                  className="space-y-4 p-4 w-full flex flex-col justify-center bg-center bg-no-repeat bg-cover"
                  style={{
                    backgroundImage: item?.announcementFile
                      ? `url('${item.announcementFile}')`
                      : `url('/images/banner.png')`,
                  }}
                >
                  <div className="flex max-sm:flex-wrap gap-3 justify-between items-start">
                    <div>
                      <h1 className="text-xl sm:text-4xl text-white font-bold capitalize mb-2 drop-shadow-md">
                        {item?.title}
                      </h1>
                      <p className="text-white text-lg sm:text-xl font-medium overflow-hidden line-clamp-3 max-w-2xl drop-shadow-sm">
                        {item?.description}
                      </p>
                      <p className="text-white text-sm font-medium overflow-hidden capitalize line-clamp-3 max-w-2xl drop-shadow-sm">
                        Created By : {item?.createdBy}
                      </p>
                      <Button
                        as={Link}
                        to={`/student/announcements`}
                        size="md"
                        className="bg-[#06574C] text-white rounded-md mt-6 font-semibold hover:bg-[#086d5f] transition-all"
                      >
                        View Announcements
                      </Button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))
          ) : (
            <SwiperSlide>
              <div className="space-y-4 bg-white/50 p-4 w-full flex flex-col justify-center">
                <div className="flex max-sm:flex-wrap gap-3 justify-between items-start">
                  <div>
                    <h1 className="text-xl sm:text-4xl text-white font-bold capitalize mb-2 drop-shadow-md">
                      Welcome to Darul Quran
                    </h1>
                    <p className="text-white text-lg sm:text-xl font-medium overflow-hidden line-clamp-2 drop-shadow-sm">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <Button
                      as={Link}
                      to={`/student/announcements`}
                      size="md"
                      className="bg-[#06574C] text-white rounded-md mt-6 font-semibold hover:bg-[#086d5f] transition-all"
                    >
                      View Announcements
                    </Button>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          )}
        </Swiper>
      </div>
      <div>
        {error &&
          <QueryError
            height="300px"
            error={error}
            onRetry={refetch}
            showLogo={false}
            isLoading={isFetching}
          />
        }
        <div className="grid grid-cols-12 gap-3 py-4">

          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="col-span-12 md:col-span-6 lg:col-span-4"
              >
                <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100/50 p-4 space-y-4">
                  {/* Status Badge */}
                  <Skeleton className="h-6 w-24 rounded-md" />

                  {/* Course Title */}
                  <Skeleton className="h-8 w-3/4 rounded-md mx-auto" />

                  {/* Student + Next Class Row */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    </div>
                    <div className="space-y-2 text-end">
                      <Skeleton className="h-4 w-20 rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-full rounded-md" />
                  </div>

                  {/* Button */}
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
            ))
          ) : data?.courses?.length === 0 ? (
            <div className="col-span-12 text-center py-10 text-gray-500">
              You haven't enrolled in any courses yet.
            </div>
          ) : (
            data?.courses?.map((item) => (
              <div
                key={item.id}
                className="col-span-12 md:col-span-6 lg:col-span-4 "
              >
                <div className="w-full bg-white rounded-lg shadow-md hover:shadow-md transition-all">
                  <div className="h-48 overflow-hidden rounded-t-lg bg-gray-100">
                    {(item.video || item.thumbnail) ? <VideoPlayer
                      src={item.video}
                      className="w-full h-full object-contain bg-black"
                      poster={item.thumbnail}
                    /> :
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-400 text-sm">No Thumbnail</p>
                      </div>}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col flex-1 gap-2">
                      <h1 className="text-lg font-bold text-[#06574C] line-clamp-1">
                        {item.courseName}
                      </h1>

                      <div className="flex flex-col gap-2 justify-between items-start text-sm text-black">
                        <div className="flex gap-1 items-center ">
                          <span className="text-xs font-semibold text-success">Teacher :</span>
                          {<FaRegAddressCard size={16} />}{" "}
                          {item.teacherName || "Instructor"}
                        </div>
                        <div className="flex gap-1 items-center ">
                          <span className="text-xs font-semibold text-success">Enrolled At :</span>
                          {<CiCalendar size={16} />}{" "}
                          {dateFormatter(item.enrolledAt, true)}
                        </div>
                        <div className="flex justify-between items-center text-sm text-black">
                          <div className="flex gap-1 items-center ">
                            <span className="text-xs font-semibold text-success">Expires At :</span>
                            {<CiCalendar size={16} />}{" "}
                            {item?.cancelledAt || item?.cancelledat ? dateFormatter(item?.cancelledAt || item?.cancelledat, true) : "Live Time"}
                          </div>
                        </div>
                      </div>

                    </div>
                    <div>
                      <div className="flex justify-between items-center text-sm text-black">
                        <span className="text-xs font-semibold text-success">Progress :</span>
                        {item.progress ? item.progress == "not_started" ? "0 %" : item.progress + " %" : "0 %"}
                      </div>
                      <Progress
                        aria-label="Course Progress"
                        size="sm"
                        value={item.progress}
                        color="success"
                        className="max-w-md"
                      />
                    </div>
                    <div>
                      <Button
                        size="md"
                        radius="sm"
                        variant="bordered"
                        color="success"
                        className="w-full mt-2 font-medium"
                        startContent={<AiOutlineEye size={20} />}
                        onPress={() =>
                          navigate(`/student/course/${item.id}/learn`, {
                            state: item,
                          })
                        }
                      >
                        View Course
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {data?.totalPages > 1 && (
          <Pagination
            showControls
            className="mb-4"
            variant="ghost"
            initialPage={1}
            onChange={(page) => setPage(page)}
            total={data?.totalPages || 1}
            classNames={{
              item: "rounded-sm hover:bg-bg-[#06574C]/50",
              cursor: "bg-[#06574C] rounded-sm text-white",
              prev: "rounded-sm bg-white/80",
              next: "rounded-sm bg-white/80",
            }}
          />
        )}
      </div>

      <div className="bg-white rounded-lg mb-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-[#EAF3F2] flex items-center justify-center">
              <CalendarDays size={22} className="text-[#06574C]" />
            </div>

            <div>
              <h1 className="text-xl text-[#333333] font-semibold">
                Today's Classes
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                View your complete class schedule and upcoming sessions.
              </p>
            </div>
          </div>

          <Button
            as={Link}
            to="/student/class-scheduling"
            endContent={<ArrowRight size={18} />}
            className="bg-[#06574C] text-white rounded-md"
          >
            View Schedule
          </Button>
        </div>
      </div>
      <div className=" bg-white rounded-lg mb-3 ">
        <h1 className="p-3 text-xl font-medium text-[#333333]">
          Recent Announcements
        </h1>
        <div className="flex flex-col gap-3">
          {dashboardLoading ? (
            <div className="flex justify-center py-10">
              <Spinner color="success" size="lg" />
            </div>
          ) : !announcementsList ||
            announcementsList?.length <= 0 ? (
            <div className="text-center py-10 text-gray-500">
              No announcements found
            </div>
          ) : (
            announcementsList.map((item, index) => (
              <div
                key={item.id}
                className={`${item.created_by === "teacher" ||
                  item.description?.toLowerCase()?.includes("schedule")
                  ? "bg-[#F5E3DA]"
                  : "bg-[#EAF3F2]"
                  } `}
              >
                <div className="flex flex-col md:flex-row gap-4 md:justify-between p-4 md:items-start">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center justify-center">
                    <div className="h-20 shrink-0 w-20 rounded-full shadow-lg flex flex-col items-center justify-center bg-white overflow-hidden border-4 border-white">
                      {item.announcementFile || item.announcement_file ? (
                        <img
                          src={item.announcementFile || item.announcement_file}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                      ) : item.created_by === "teacher" ||
                        item.description?.toLowerCase()?.includes("schedule") ? (
                        <CiCalendar color="#D28E3D" size={30} />
                      ) : (
                        <GrAnnounce color="#06574C" size={30} />
                      )}
                    </div>
                    <div>
                      <div
                        className={`${item.created_by === "teacher" ||
                          item.description?.toLowerCase()?.includes("schedule")
                          ? "text-[#B7721F]"
                          : "text-[#06574C]"
                          } font-semibold`}
                      >
                        {item.title}
                      </div>
                      <div className=" text-xs text-[#666666]">
                        <p>{dateFormatter(getScheduleStart(item) || item.date)}</p>
                      </div>
                      <div className=" max-w-4xl text-sm text-[#666666] line-clamp-2">
                        <p>{item.description}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#666666] capitalize">
                      {item.createdBy}
                    </p>
                    <p className="font-medium text-sm text-[#666666] capitalize">
                      {dateFormatter(item.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div >
  );
};
export default StudentDashboard;
