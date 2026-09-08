import {
  Button,
  Progress,
  useDisclosure,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Form,
  Select,
  SelectItem,
  Textarea,
  Skeleton,
  Spinner,
} from "@heroui/react";
import {
  BookIcon,
  ChartPie,
  Clock,
  Edit,
  LucideClock4,
  MapPin,
  MegaphoneIcon,
  PlusIcon,
  UsersIcon,
  UsersRound,
  UserStar,
  Video,
  Check,
  Lock,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import OverviewCards from "../../components/dashboard-components/OverviewCards";
import {
  AiOutlineBook,
  AiOutlineEye,
  AiOutlineLineChart,
} from "react-icons/ai";
import { LuClock4 } from "react-icons/lu";
import { RiGroupLine } from "react-icons/ri";
import { useEffect, useRef, useState } from "react";
import { GrAnnounce, GrAttachment, GrClose, GrSend } from "react-icons/gr";
import { CiCalendar } from "react-icons/ci";
import { IoAlertCircleOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { formatTime12Hour, isClassLive, isClassExpired, getHoursUntilClass, formatRemainingTime, getScheduleStart, getScheduleEnd } from "../../utils/scheduleHelpers";
import NotificationPermission from "../../components/NotificationPermission";
import { useSelector } from "react-redux";
import { errorMessage } from "../../lib/toast.config";
import { useGetTeacherDashboardQuery } from "../../redux/api/dashboard";
import { useGetAllAnnouncementQuery, useCreateAnnouncementMutation } from "../../redux/api/announcements";
import QueryError from "../../components/QueryError";
import CourseSelect from "../../components/select/CourseSelect";
import { dateFormatter } from "../../lib/utils";
import QuizModal from "../../components/dashboard-components/forms/QuizModal";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const TeachersDashboard = () => {
  const { user: currentUser } = useSelector((state) => state.user);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const [placement, setPlacement] = useState("left");

  const handleOpen = (placement) => {
    setPlacement(placement);
    onOpen();
  };
  const courses = [
    { key: "WebDevelopment", label: "Web Development" },
    { key: "React", label: "React js" },
    { key: "Next js", label: "Next js" },
  ];

  const {
    data: announcementsData,
    error: announcementsError,
    isLoading: announcementsLoading,
  } = useGetAllAnnouncementQuery({ limit: 5 });

  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] = useCreateAnnouncementMutation();
  const { data, isLoading: loading, error, refetch: dashboardRefetch } = useGetTeacherDashboardQuery();

  const featuredAnnouncements = data?.data?.featured || [];
  const upcomingClasses = data?.data?.upcomingClasses;
  const analytics = data?.data?.analytics;
  const activeCourses = data?.data?.activeCourses;
  const [announcement, setAnnouncement] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState("");
  const handleAnnouncement = async (onClose) => {
    if (!course || !announcement || !delivery) {
      errorMessage("Please fill all fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("userId", currentUser.id);
      formData.append("title", announcement);
      formData.append("description", description || "");
      formData.append("type", announcement);
      formData.append("delivery", delivery); // Changed to "Both" so it sends push notification
      formData.append("isFeatured", false);
      formData.append("sendTo", "students");
      formData.append("courseId", course);
      formData.append("senderName", `${currentUser.firstName} ${currentUser.lastName}`);
      formData.append("createdBy", currentUser.role);
      formData.append("date", new Date().toISOString());

      files.forEach((file) => {
        formData.append("files", file);
      });

      await createAnnouncement(formData).unwrap();

      // reset
      setCourse("");
      setAnnouncement("");
      setDescription("");
      setFiles([]);

      onClose();
    } catch (err) {
      errorMessage(err?.data?.message || "Failed to send");
    }
  };
  const cardsData = [
    {
      title: "Total Courses ",
      value: analytics?.total_courses || "0",
      icon: <AiOutlineBook color="#06574C" size={22} />,
      changeText: "Active",
      changeColor: "text-[#38A100]",
    },
    {
      title: "Attendance Rate",
      value: `${analytics?.attendance_rate || "0"}%`,
      icon: <AiOutlineLineChart color="#06574C" size={22} />,
      changeText: "+8.2% from last month",
      changeColor: "text-[#38A100]",
    },
    {
      title: "Total Students",
      value: analytics?.total_students || "0",
      icon: <UsersRound color="#06574C" size={22} />,
      changeText: "-2.1% from last week",
      changeColor: "text-[#E8505B]",
    },
    {
      title: "Total Hours",
      value: Math.round(analytics?.total_hours || 0),
      icon: <LuClock4 color="#06574C" size={22} />,
      changeText: " +8.2% from last month",
      changeColor: "text-[#06574C]",
    },
  ];
  if (error) {
    return <QueryError
      height="300px"
      error={error}
      onRetry={dashboardRefetch}
      showLogo={false}
    />
  }
  return (
    <div className="bg-white bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 h-scrseen px-2 sm:px-3">
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
          modules={[Autoplay, Pagination, Navigation]}
          className="mySwiper rounded-lg"
        >
          {featuredAnnouncements.length > 0 ? (
            featuredAnnouncements.map((item, index) => (
              <SwiperSlide key={item.id || index}>
                <div
                  className="space-y-4 p-4 flex flex-col justify-center bg-center bg-no-repeat bg-cover"
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
                        to={`/teacher/announcements`}
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
              <div className="space-y-4 p-4 bg-white/50 flex flex-col justify-center">
                <div className="flex max-sm:flex-wrap gap-3 justify-between items-start">
                  <div>
                    <h1 className="text-xl sm:text-4xl text-white font-bold capitalize mb-2 drop-shadow-md">
                      Welcome to Darul Quran
                    </h1>
                    <p className="text-white text-lg sm:text-xl font-medium overflow-hidden line-clamp-2 drop-shadow-sm">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <Button
                      as={Link}
                      to={`/teacher/announcements`}
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

      <OverviewCards data={cardsData} isLoading={loading} />

      <div>
        <div className="grid grid-cols-12 gap-3 pb-4">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
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
            )) : activeCourses.length === 0 ? (
              <div className="col-span-12 p-10 text-center bg-white/50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-lg italic">No active courses found.</p>
              </div>
            ) : activeCourses.map((item, index) => {
              const nextClassStart = item.nextClass?.date
                ? getScheduleStart({ ...item.nextClass, timezone: item.timezone }, item.nextClass.date)
                : null;
              const nextClassTime = nextClassStart
                ? `${nextClassStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTime12Hour(nextClassStart)}`
                : "No upcoming classes";

              return (
                <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4 ">
                  <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100/50 flex flex-col h-full">
                    <div className={`relative w-full h-48 overflow-hidden rounded-t-lg ${item.thumbnail ? "" : "bg-[linear-gradient(110.57deg,rgba(241,194,172,0.25)_0.4%,rgba(149,196,190,0.25)_93.82%)] rounded-b-lg"}`}>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.courseName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-400 text-sm">No Thumbnail</p>
                        </div>
                      )}
                      <Button
                        size="sm"
                        radius="sm"
                        color="success"
                        className=" px-4 font-medium capitalize absolute top-2 right-2"
                      >
                        {item.status}
                      </Button>
                    </div>

                    <div className="p-3 space-y-3">
                      <h3 title={item.courseName} className="text-base font-semibold text-[#060606] line-clamp-2 min-h-8">
                        {item.courseName}
                      </h3>
                      <p className="text-sm text-[#666666] line-clamp-2 h-10">{item.description}</p>
                      <div className="flex justify-between items-center ">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#95C4BE33] flex items-center justify-center text-white font-bold text-sm  shrink-0">
                            <RiGroupLine size={22} color="#06574C" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#06574C] text-lg leading-tight">
                              {item.studentCount}
                            </p>
                            <p className="text-sm text-[#666666]">Students Enrolled</p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-semibold text-black text-sm leading-tight">
                            Next Class
                          </p>
                          <p className="text-sm text-[#666666]">{nextClassTime}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center text-[#6B7280]">
                          <span>Progress</span>
                          <span>{item.progress}%</span>
                        </div>
                        <Progress
                          color="success"
                          value={item.progress}
                          size="sm"
                          className="mt-1"
                        ></Progress>
                      </div>
                      <div>
                        <Button
                          as={Link}
                          to={`/teacher/courses/${item.id}`}
                          size="sm"
                          className="bg-[#06574C] text-white rounded-md w-full mt-2"
                          startContent={<AiOutlineEye size={22} />}
                        >
                          View Course
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
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
            to="/teacher/class-scheduling"
            endContent={<ArrowRight size={18} />}
            className="bg-[#06574C] text-white rounded-md"
          >
            View Schedule
          </Button>
        </div>
      </div>
      <div className="px-3 sm:px-6 py-4 rounded-lg bg-white my-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["left"].map((placement) => (
            <Button
              radius="sm"
              key={placement}
              variant="solid"
              color="primary"
              startContent={<PlusIcon />}
              className="w-full py-4 bg-[#06574C] text-white"
              onPress={() => handleOpen(placement)}
            >
              New Announcement
            </Button>
          ))}
          <Button
            radius="sm"
            variant="solid"
            color="primary"
            startContent={<PlusIcon />}
            className="w-full py-4 bg-[#06574C] text-white"
            as={Link}
            to="/teacher/class-scheduling"
          >
            Schedule New Class
          </Button>
          <Button
            radius="sm"
            variant="flat"
            startContent={<PlusIcon />}
            className="w-full py-4 bg-[#06574C] text-white font-semibold"
            onPress={() => setIsQuizModalOpen(true)}
          >
            Create Quiz
          </Button>
        </div>

        <QuizModal
          isOpen={isQuizModalOpen}
          setIsOpen={setIsQuizModalOpen}
        // Not passing courseId, so CourseSelect will be shown in the modal
        />

        <Drawer
          isOpen={isOpen}
          placement={placement}
          backdrop={"blur"}
          size={"sm"}
          onOpenChange={onOpenChange}
          className="no-scrollbar overflow-hidden"
        >
          <DrawerContent>
            {(onClose) => (
              <>
                <DrawerHeader className="flex flex-col gap-1 ">
                  Announcements
                </DrawerHeader>
                <DrawerBody className="px-0!">
                  <Form className="bg-[#95C4BE47] p-3">
                    <CourseSelect label="Select Course" onChange={(val) => setCourse(val)} />
                    <div className="flex gap-3 w-full">
                      <Select
                        className="w-1/2 min-w-[150px]"
                        radius="sm"
                        label="Announcement Type"
                        name="Announcement Type"
                        variant="bordered"
                        defaultSelectedKeys={announcement ? [announcement] : undefined}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        labelPlacement="outside"
                        placeholder="Select Announcement Type"
                      >
                        <SelectItem key={"Live Class"}>Live Class</SelectItem>
                        <SelectItem key={"Assignment"}>Assignment</SelectItem>
                        <SelectItem key={"Exam"}>Exam</SelectItem>
                        <SelectItem key={"Other"}>Other</SelectItem>
                        <SelectItem key={"Holiday"}>Holiday</SelectItem>
                        <SelectItem key={"Fee"}>Fee</SelectItem>
                        <SelectItem key={"Result"}>Result</SelectItem>
                        <SelectItem key={"Information"}>Information</SelectItem>
                        <SelectItem key={"Important Notice"}>Important Notice</SelectItem>
                      </Select>
                      <Select
                        className="w-1/2 min-w-[150px]"
                        radius="sm"
                        label="Delivery"
                        name="Delivery"
                        variant="bordered"
                        defaultSelectedKeys={delivery ? [delivery] : undefined}
                        onChange={(e) => setDelivery(e.target.value)}
                        labelPlacement="outside"
                        placeholder="Select Delivery"
                      >
                        <SelectItem key={"Email"}>Email</SelectItem>
                        <SelectItem key={"In-App"}>In-App</SelectItem>
                      </Select>
                    </div>
                  </Form>
                  <div className="overflow-y-auto no-scrollbar pb-10">
                    <div className="flex justify-between items-center px-4 pt-2">
                      <h3 className="font-semibold text-sm text-[#06574C]">Recent Announcements</h3>
                      <Link to="/teacher/announcements" className="text-xs text-[#D28E3D] hover:underline" onClick={onClose}>
                        View All
                      </Link>
                    </div>
                    {announcementsLoading ? (
                      <div className="flex justify-center p-6"><Spinner color="success" size="md" /></div>
                    ) : announcementsData?.data?.length === 0 ? (
                      <div className="text-center p-6 text-sm text-gray-500">No announcements found.</div>
                    ) : (
                      announcementsData?.data?.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="p-4 bg-white rounded-md my-2 group hover:bg-[#FBF4EC] border-[#D28E3D] border-1 m-3 cursor-pointer"
                        >
                          <div className="flex gap-3 items-center">
                            <div className="h-10 w-10 flex shrink-0 justify-center items-center group-hover:bg-white bg-[#FBF4EC] rounded-full shadow-lg overflow-hidden border-2 border-white">
                              {item.announcementFile ? (
                                <img
                                  src={item.announcementFile}
                                  alt="Banner"
                                  className="w-full h-full object-cover"
                                />
                              ) : item.createdBy === "teacher" ||
                                item.description
                                  ?.toLowerCase()
                                  ?.includes("schedule") ? (
                                <CiCalendar color="#D28E3D" size={22} />
                              ) : (
                                <GrAnnounce color="#06574C" size={22} />
                              )}
                            </div>
                            <div>
                              <h1 className="text-sm font-bold group-hover:text-[#D28E3D]">
                                {item.title}
                              </h1>
                              <p className="text-[#666666] text-[10px]">
                                {dateFormatter(item.date)}
                              </p>
                            </div>
                          </div>
                          <div className="my-2">
                            <p className="text-[#B7721F] text-xs line-clamp-3 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-4">
                            <div className="text-[10px] text-[#B7721f] font-medium">
                              Created by {item.senderName || "Admin"}
                            </div>
                            {(item.sendTo === "students" || item.sendTo === "all") && item.studentCount > 0 && (
                              <div className="text-[10px] flex gap-1 items-center bg-[#EAF3F2] px-2 py-1 rounded text-[#06574C] font-medium">
                                <RiGroupLine size={12} />
                                {item.studentCount} students
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DrawerBody>
                <DrawerFooter className="rounded-xl flex flex-col gap-2 pb-6">
                  {files.length > 0 && (
                    <div className="flex gap-3 w-full overflow-x-auto no-scrollbar pt-2 pb-1">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="relative w-20 h-[60px] rounded-lg border border-gray-200 shadow-sm flex items-center justify-center shrink-0 bg-gray-50 mt-1 mr-1"
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-[10px] text-center px-1 break-all line-clamp-3">
                              {file.name}
                            </span>
                          )}

                          <div
                            className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full cursor-pointer z-10 shadow-md p-0.5 flex items-center justify-center"
                            onClick={() => removeFile(index)}
                          >
                            <GrClose size={12} color="white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative w-full no-scrollbar">
                    <Textarea
                      classNames={{ base: "rounded-xl" }}
                      variant="bordered"
                      radius="sm"
                      className="shadow-xl"
                      value={description}
                      placeholder="Write your announcement..."
                      onChange={(e) => setDescription(e.target.value)}
                      startContent={
                        <GrAttachment
                          className="absolute bottom-3 left-2 cursor-pointer"
                          size={20}
                          onClick={handleAttachmentClick}
                        />
                      }
                      endContent={
                        <div onClick={() => handleAnnouncement(onClose)} className="p-2 bg-[#06574C] rounded-md absolute right-2 bottom-1 cursor-pointer">
                          <GrSend color="white" size={16} />
                        </div>
                      }
                    />


                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};
export default TeachersDashboard;
