import { DashHeading } from "../../../components/dashboard-components/DashHeading";
import {
  Tabs,
  Tab,
  Form,
  Input,
  Select,
  SelectItem,
  Textarea,
  Button,
  Switch,
  Image,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { motion } from "framer-motion";
import FileDropzone from "../../../components/dashboard-components/dropzone";
import {
  File,
  FolderDot,
  Lightbulb,
  PlusIcon,
  Rocket,
  ScrollText,
  Trash2Icon,
  Video,
  Link2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Videos, {
  Assignments,
  PdfAndNotes,
  Quizzes,
  Links,
} from "../../../components/dashboard-components/forms/ContentUpload";
import { useSearchParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  useAddCategoryMutation,
  useAddCourseMutation,
  useDeleteCategoryMutation,
  useGetAllCategoriesQuery,
  useGetCourseByIdQuery,
  useUpdateCourseMutation,
} from "../../../redux/api/courses";
import { errorMessage, successMessage } from "../../../lib/toast.config";
import { FormOverlayLoader } from "../../../components/Loader";
import { parseInterval, uploadFilesToServer } from "../../../lib/utils";
import { IntervalInput } from "../../../components/dashboard-components/forms/IntervalInput";
import TeacherSelect from "../../../components/select/TeacherSelect";
import UserSelect from "../../../components/select/UserSelect";
import StudentSelect from "../../../components/select/StudentSelect";
import { useGetEmailTemplatesQuery } from "../../../redux/api/emailTemplates";
import { FiCopy, FiCode } from "react-icons/fi";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const parseScheduleTimeRange = (value) => {
  if (!value) return { start: "", end: "" };
  const parts = value
    .split(/\s*-\s*|\s+to\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { start: toTimeInputValue(parts[0]), end: toTimeInputValue(parts[1]) };
  }
  return { start: "", end: "" };
};

const toTimeInputValue = (timeStr) => {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(`1970-01-01 ${trimmed}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toTimeString().slice(0, 5);
  }
  return "";
};

const formatScheduleTimeRange = (start, end) => {
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
};

const normalizeLoadedEmailTriggers = (course) => {
  const triggers = course?.emailTriggers || {};
  const formFillerTemplateId =
    triggers.formFillerTemplateId ?? course?.emailTemplateId ?? "";

  // Prefer new field; fall back to first legacy multi-trigger template
  const adminNotificationTemplateId =
    triggers.adminNotificationTemplateId ??
    triggers.triggers?.[0]?.templateId ??
    "";

  return {
    form_filler_template_id: formFillerTemplateId
      ? String(formFillerTemplateId)
      : "",
    admin_notification_template_id: adminNotificationTemplateId
      ? String(adminNotificationTemplateId)
      : "",
    admin_notification_emails: Array.isArray(triggers.adminNotificationEmails)
      ? triggers.adminNotificationEmails.join(", ")
      : "",
  };
};

const containerVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },

  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      // staggerChildren: 0.06,
      // delayChildren: 0.02,
      duration: 0.2,
    },
  },
};
const CourseBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const courseId = searchParams.get("id");

  // useEffect(() => {
  //   const fetchTeachers = async () => {
  //     try {
  //       const response = await fetch(
  //         import.meta.env.VITE_PUBLIC_SERVER_URL + "/api/user/getTeachers"
  //       );
  //       const data = await response.json();

  //       if (data.success) {
  //         setTeachers(data.user);
  //         console.log("Teachers", data.user);
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch teachers", error);
  //     }
  //   };

  //   fetchTeachers();
  // }, []);
  const [teachers, setTeachers] = useState([]);
  const navigate = useNavigate();
  const [video, setVideo] = useState([]); //file objects with metadata
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState([]); // Cover image file objects with metadata
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // Cover image URL
  const [removedUrls, setRemovedUrls] = useState([""]);
  const [files, setFiles] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  //query/fetch
  const {
    data = {},
    isLoading,
    isError,
    error,
  } = useGetCourseByIdQuery(courseId, { skip: !courseId });
  const {
    data: categoriesData,
    isError: categoriesError,
    error: categoriesErrorData,
  } = useGetAllCategoriesQuery();
  //mutations/actions
  const [addCourse] = useAddCourseMutation();
  const [updateCourse, { error: updateCourseError }] =
    useUpdateCourseMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [addCategory, { isLoading: isAddingCategory }] =
    useAddCategoryMutation();
  const { data: emailTemplatesData } = useGetEmailTemplatesQuery();
  // const [quizzes, setQuizzes] = useState([]);
  useEffect(() => {
    if (isError) {
      errorMessage(error.data.error, error.status);
    } else if (categoriesError) {
      errorMessage(categoriesErrorData.data.error, categoriesErrorData.status);
    }
  }, [isError, categoriesError]);

  useEffect(() => {
    const fetchCourseById = async () => {
      if (!courseId) return;
      try {
        if (!data?.course) return;

        const course = data.course;
        setFormData({
          course_name: course.courseName || "",
          category_id: Number(course.category) || "",
          difficulty_level: course.difficultyLevel || "",
          description: course.description || "",
          // course_price: course.coursePrice || "",
          teacher_id: Number(course.teacherId) || null,
          access_duration: course.accessDuration || "",
          previous_lesson:
            course?.previous_lesson || course?.previousLesson || "",
          base_price: course?.basePrice,
          discount_percentage: course?.discountPercentage,
          enroll_number: course.enrollNumber || "",
          status: course.status || "draft",
          videoDuration: course.videoDuration || "",
          is_free: course.isFree || false,
          is_trending: course.isTrending || false,
          student_ids: course.studentIds || [],
          video_count: course.videoCount || 0,
          type: course.type || "one_time",
          interval: course.interval || "",
          duration: course.duration || "",
          age_group: course.ageGroup || "",
          schedule_days: course.scheduleDays || "",
          ...(() => {
            const { start, end } = parseScheduleTimeRange(course.scheduleTime || "");
            return {
              schedule_start_time: start,
              schedule_end_time: end,
              schedule_time: course.scheduleTime || "",
            };
          })(),
          venue: course.venue || "",
          max_capacity: course.maxCapacity || "",
          what_to_bring: course.whatToBring || "",
          start_date: course.startDate || "",
          google_form_link: course.googleFormLink || "",
          display_tab: course.displayTab || "auto",
          ...normalizeLoadedEmailTriggers(course),
        });

        setVideoUrl(course.video || "");
        setThumbnailUrl(course.thumbnail || course.classImage || "");
        setFiles(course.files || []);
      } catch (error) {
        console.error("Failed to fetch course", error);
        errorMessage("Failed to load course data: " + error?.message);
      }
    };

    fetchCourseById();
  }, [data, courseId]);

  const Difficulty = [
    { key: "Beginner", label: "Beginner" },
    { key: "Intermediate", label: "Intermediate" },
    { key: "Advanced", label: "Advanced" },
  ];

  const card = [
    {
      title: "Videos",
      count: (files?.filter((f) => f.fileType === "lesson_video")).length || 0,
      icone: <Video size={20} color="#06574C" />,
    },
    {
      title: "PDFs:",
      count: (files?.filter((f) => f.fileType === "pdf_notes")).length || 0,
      icone: <File size={20} color="#06574C" />,
    },
    {
      title: "Quizzes",
      count: (files?.filter((f) => f.fileType === "quiz")).length || 0,
      icone: <Lightbulb size={20} color="#06574C" />,
    },
    {
      title: "Assignments",
      count: (files?.filter((f) => f.fileType === "assignments")).length || 0,
      icone: <ScrollText size={20} color="#06574C" />,
    },
    {
      title: "Links",
      count: (files?.filter((f) => f.fileType === "link")).length || 0,
      icone: <Link2 size={20} color="#06574C" />,
    },
  ];
  const [categories, setCategories] = useState([]);
  const accessDuration = [
    { key: "108_days", label: "108 Days" },
    { key: "Lifetime_Access", label: "Lifetime Access" },
    { key: "360_days", label: "360 Days" },
  ];

  const [selected, setSelected] = useState(currentTab || "info");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (currentTab) {
      setSelected(currentTab);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentTab]);
  const handleSelected = (value) => {
    setSelected(value);
    // Preserve existing params like 'id'
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("tab", value);
      return newParams;
    });
  };

  const [formData, setFormData] = useState({
    course_name: "",
    category_id: null,
    difficulty_level: "",
    description: "",
    category_name: "",
    base_price: 0,
    discount_percentage: 0,
    type: "one_time",
    teacher_id: null,
    student_ids: [],
    access_duration: "",
    previous_lesson: 0,
    enroll_number: "",
    status: "draft", // Default
    videoDuration: "",
    duration: null,
    interval: null,
    is_free: false,
    is_trending: false,
    video_count: 0,
    age_group: "",
    schedule_days: "",
    schedule_start_time: "",
    schedule_end_time: "",
    schedule_time: "",
    venue: "",
    max_capacity: "",
    what_to_bring: "",
    start_date: "",
    google_form_link: "",
    display_tab: "auto",
    form_filler_template_id: "",
    admin_notification_template_id: "",
    admin_notification_emails: "",
  });
  const [teacherError, setTeacherError] = useState("");
  const [appsScriptOpen, setAppsScriptOpen] = useState(false);
  const [appsScriptLoading, setAppsScriptLoading] = useState(false);
  const [appsScriptData, setAppsScriptData] = useState(null);

  // console.log(formData);
  const coursepreview = useMemo(() => {
    return [
      { title: "Title:", desc: formData?.course_name || "Add Tittle" },
      {
        title: "Category:",
        desc:
          categoriesData?.categories?.find(
            (category) => category.id === formData?.category_id,
          )?.categoryName ||
          formData?.category_name ||
          "Add Category",
      },
      formData?.type !== "one_to_one" && {
        title: "Difficulty Level:",
        desc: formData?.difficulty_level || "Add Difficulty Level",
      },
      formData?.type !== "one_to_one" && {
        title: "Price:",
        desc:
          formData?.base_price -
          (formData?.discount_percentage * formData?.base_price) / 100 +
          "£" || "Add Price",
      },
      { title: "Type:", desc: formData?.type === "one_to_one" ? "1:1 Class" : formData?.type?.replace("_", " ") || "Add Type" },
      formData?.type !== "one_to_one" && {
        title: "Duration:",
        desc:
          !formData?.duration
            ? "Ongoing"
            : `${parseInterval(formData?.duration).number} ${parseInterval(formData?.duration).unit}` ||
            "Add Duration",
      },
      formData?.type === "live" && {
        title: "Subscription - Interval:",
        desc:
          `${parseInterval(formData?.interval).number} ${parseInterval(formData?.interval).unit}` ||
          "Add Subscription - Interval",
      },
      formData?.type === "in_person" && {
        title: "Age Group:",
        desc: formData?.age_group || "Not set",
      },
      formData?.type === "in_person" && {
        title: "Schedule:",
        desc:
          `${formData?.schedule_days || ""} ${formatScheduleTimeRange(formData?.schedule_start_time, formData?.schedule_end_time) || formData?.schedule_time || ""}`.trim() ||
          "Not set",
      },
      formData?.type === "in_person" && {
        title: "Venue:",
        desc: formData?.venue || "Not set",
      },
    ].filter(Boolean);
  }, [categoriesData, formData]);

  // handle change
  const handleChange = (name, value) => {
    if (name === "teacher_id" && value) {
      setTeacherError("");
    }
    if (name === "type" && value === "in_person") {
      setTeacherError("");
    }
    if (name === "type" && value === "one_to_one" && selected !== "info") {
      handleSelected("info");
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "type" && value === "in_person" ? { teacher_id: null } : {}),
      ...(name === "type" && value === "one_to_one"
        ? { teacher_id: null, student_ids: [], is_free: true }
        : {}),
    }));
  };
  const handleSubmitTab1 = async (e) => {
    e.preventDefault();

    if (
      formData.type !== "in_person" &&
      formData.type !== "one_to_one" &&
      !formData.teacher_id
    ) {
      setTeacherError("Please select a teacher ");
      // Scroll to the teacher select if possible or just stop
      return;
    }
    setLoadingAction(pendingAction);

    const urlMap = {};
    const isOneToOne = formData.type === "one_to_one";
    if (
      video.length > 0 ||
      thumbnail.length > 0
    ) {
      const filesToUpload = [];
      if (!isOneToOne && video.length > 0)
        filesToUpload.push({ file: video[0], type: "video" });
      if (thumbnail.length > 0)
        filesToUpload.push({ file: thumbnail[0], type: "thumbnail" });

      try {
        const uploadedUrls = await uploadFilesToServer(
          filesToUpload.map((f) => f.file),
        );
        uploadedUrls.forEach((url, index) => {
          const type = filesToUpload[index].type;
          urlMap[type] = url;
        });

        if (urlMap.video) {
          setVideoUrl(urlMap.video);
          setVideo([]);
        }
        if (urlMap.thumbnail) {
          setThumbnailUrl(urlMap.thumbnail);
          setThumbnail([]);
        }
      } catch (error) {
        console.error("Upload failed", error);
        errorMessage("Failed to upload files");
        setLoadingAction(null);
        setPendingAction(null);
        return;
      }
    }

    const payload = {
      ...formData,
      previous_lesson:
        formData.previous_lesson != null && formData.previous_lesson !== ""
          ? String(formData.previous_lesson)
          : null,
      enroll_number: formData.enroll_number
        ? parseInt(formData.enroll_number)
        : null,
      status: formData.status,
      course_price: (
        formData?.base_price -
        (formData?.discount_percentage * formData?.base_price) / 100
      ).toFixed(2),
      videoUrl: isOneToOne ? null : urlMap.video ?? videoUrl ?? null,
      thumbnailurl: urlMap.thumbnail ?? thumbnailUrl ?? null,
      teacher_id:
        formData.type === "in_person" || formData.type === "one_to_one"
          ? null
          : Number(formData.teacher_id),
      student_ids: formData.type === "one_to_one" ? [] : formData.student_ids,
      is_free: isOneToOne ? true : formData.is_free,
      age_group: formData.age_group || null,
      schedule_days: formData.schedule_days || null,
      schedule_time:
        formatScheduleTimeRange(formData.schedule_start_time, formData.schedule_end_time) ||
        formData.schedule_time ||
        null,
      venue: formData.venue || null,
      max_capacity: formData.max_capacity ? Number(formData.max_capacity) : null,
      what_to_bring: formData.what_to_bring || null,
      start_date: formData.start_date || null,
      class_title: formData.course_name || null,
      class_description: formData.description || null,
      class_image: urlMap.thumbnail ?? thumbnailUrl ?? null,
      google_form_link: formData.google_form_link || null,
      display_tab:
        !formData.display_tab || formData.display_tab === "auto"
          ? null
          : formData.display_tab,
      email_template_id: formData.form_filler_template_id
        ? Number(formData.form_filler_template_id)
        : null,
      emailTriggers: {
        formFillerTemplateId: formData.form_filler_template_id
          ? Number(formData.form_filler_template_id)
          : null,
        adminNotificationTemplateId: formData.admin_notification_template_id
          ? Number(formData.admin_notification_template_id)
          : null,
        adminNotificationEmails: formData.admin_notification_emails
          ? formData.admin_notification_emails
            .split(/[,;\n]+/)
            .map((email) => email.trim())
            .filter(Boolean)
          : [],
      },
    };
    try {
      const courseId = searchParams.get("id");
      let response;

      if (courseId) {
        response = await updateCourse({ id: courseId, data: payload });
      } else {
        response = await addCourse(payload);
      }

      const data = response.data;

      if (data?.success) {
        successMessage(courseId ? "Course Updated!" : "Course Created!");

        if (formData.type === "one_to_one") {
          if (!courseId && data.courseId) {
            setSearchParams({ tab: "info", id: data.courseId });
          }
          if (pendingAction === "next-1") {
            navigate("/admin/courses-management");
          }
        } else if (!courseId && data.courseId) {
          setSearchParams({ tab: "content", id: data.courseId });
        } else {
          handleSelected("content");
        }
      } else {
        errorMessage(
          response?.error?.data?.message ||
          response?.error?.data?.error ||
          "Something went wrong",
        );
      }
    } catch (error) {
      console.error(error);
      errorMessage(error.message);
    } finally {
      setLoadingAction(null);
      setPendingAction(null);
    }
  };

  const handleSubmit3tab = async (e) => {
    if (e) e.preventDefault();

    setLoadingAction(pendingAction);
    const payload = {
      courseName: formData.course_name,
      category: formData.category_id,
      difficultyLevel: formData.difficulty_level,
      description: formData.description,
      coursePrice: formData.course_price,
      teacherId:
        formData.type === "in_person" || formData.type === "one_to_one"
          ? null
          : formData.teacher_id,
      accessDuration: formData.access_duration,
      previousLesson: formData.previous_lesson,
      enrollNumber: formData.enroll_number,
      duration: formData.duration,
      interval: formData.interval || null,
      type: formData.type,
      basePrice: formData.base_price,
      discountPercentage: formData.discount_percentage,
      status: formData.status,
      isFree: formData.is_free,
      isTrending: formData.is_trending,
      student_ids: formData.student_ids,
    };
    try {
      const data = await updateCourse({
        id: courseId,
        data: payload,
      }).unwrap();

      successMessage(data?.message);
      navigate("/admin/courses-management");
    } catch (error) {
      console.error("Update error:", error);

      const message =
        error?.data?.message ||
        error?.data?.error ||
        error?.error ||
        "Failed to update course";

      errorMessage(message);
    } finally {
      setLoadingAction(null);
      setPendingAction(null);
    }
  };

  const handleSubmitAddCategory = async () => {
    if (!newCategory.trim()) {
      errorMessage("Category name is required");
      return;
    }

    try {
      const res = await addCategory(newCategory);
      const data = res.data;

      if (!data.success) {
        errorMessage(data.message || "Failed to add category");
        return;
      }
      setCategories((prev) => [...prev, data.category]);
      successMessage("Category added successfully");
      setIsAddCategoryOpen(false);
      setNewCategory("");
    } catch (error) {
      console.error(error);
      errorMessage("Server error");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const res = await deleteCategory(id);
      if (res.data.success) {
        successMessage(res.data.message || "Category deleted successfully");
        return;
      }
      setCategories((prev) => prev.filter((category) => category.id !== id));
    } catch (error) {
      console.error(error);
      errorMessage("Server error");
    }
  };

  const isOneToOne = formData.type === "one_to_one";

  const openAppsScriptModal = async () => {
    setAppsScriptLoading(true);
    try {
      const params = new URLSearchParams();
      if (formData.course_name) params.set("formTitle", formData.course_name);
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/webhooks/google-form/apps-script?${params}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load Apps Script");
      }
      setAppsScriptData(data);
      setAppsScriptOpen(true);
    } catch (err) {
      errorMessage(err.message || "Failed to load Apps Script");
    } finally {
      setAppsScriptLoading(false);
    }
  };

  const copyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(appsScriptData?.script || "");
      successMessage("Apps Script copied to clipboard");
    } catch {
      errorMessage("Could not copy to clipboard");
    }
  };

  useEffect(() => {
    if (isOneToOne && (selected === "content" || selected === "pricing")) {
      handleSelected("info");
    }
  }, [isOneToOne, selected]);

  return (
    <div className="h-full relative bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3 w-full no-scrollbar top-0 bottom-0 overflow-auto">
      {/* <FormOverlayLoader loading={isLoading || !!loadingAction} loadingText={loadingAction ? 'Saving...' : "Fetching Data..."} /> */}
      <DashHeading
        title={"Course Builder"}
        desc={"Create a new course step by step"}
      />
      <div className="flex w-full flex-col my-3">
        <Tabs
          isDisabled={data?.course?.status === "draft"}
          className="w-full  md:inline-block py-2 opacity-100!"
          aria-label="Disabled Options"
          // disabledKeys={["info" , "pricing" , "content"]}
          selectedKey={selected}
          onSelectionChange={handleSelected}
          classNames={{
            base: "w-full !opacity-100",
            tabList: " flex flex-wrap rounded-lg px-2 py-1 !opacity-100",
            tab: `!opacity-100
            w-full flex-1
      data-[selected=true]:bg-[#EBD4C9E5] rounded-lg 
      data-[selected=true]:rounded-lg 
      data-[selected=true]:border-b-3 
      data-[selected=true]:max-md:border-3 
      data-[selected=true]:border-[#06574C] 
      rounded-none
      px-6 py-4
    `,
            tabContent: `
      group-data-[selected=true]:text-[#06574C]
      text-[#3F3F44]
      font-semibold
      flex  md:items-center gap-3 opacity-100
    `,
          }}
        >
          <Tab
            className="h-20 max-md:justify-start"
            key="info"
            title={
              <div className="flex gap-3 justify-between items-center">
                <div className="bg-white text-[#3F3F44] shadow-2xl  size-9 sm:size-15 rounded-full flex items-center justify-center">
                  <h1 className="text-xl font-bold text-[#06574C]">1</h1>
                </div>
                <div className="text-start">
                  <h1 className="text-[#06574C] text-lg font-bold">
                    Basic Information
                  </h1>
                  <h1 className="text-xs wrap-break-word">
                    {" "}
                    Course details & settings
                  </h1>
                </div>
              </div>
            }
          >
            <motion.div
              layout
              variants={containerVariants}
              initial="hidden"
              animate="show"
              transition={{ when: "beforeChildren" }}
            >
              <Form onSubmit={handleSubmitTab1} className="w-full py-4">
                <div className="grid grid-cols-12 gap-2 w-full">
                  <div className="bg-white rounded-lg p-4 col-span-12 sm:col-span-8 shadow-xl">
                    <div>
                      <h1 className="text-xl font-medium text-[#333333]">
                        Course Details
                      </h1>
                    </div>
                    <div className="py-4">
                      <Input
                        size="lg"
                        variant="bordered"
                        label="Course Title"
                        labelPlacement="outside"
                        placeholder="Enter course title"
                        className="w-full"
                        isRequired
                        errorMessage="Course title is required"
                        value={formData.course_name}
                        onChange={(e) =>
                          handleChange("course_name", e.target.value)
                        }
                      />

                      <div className="flex max-sm:flex-wrap gap-3 items-center pt-6">
                        <Select
                          size="lg"
                          variant="bordered"
                          label="Category"
                          labelPlacement="outside"
                          placeholder="Select category"
                          className="w-full"
                          isRequired
                          errorMessage="Category is required"
                          selectedKeys={
                            formData.category_id
                              ? [String(formData.category_id)]
                              : []
                          }
                          onSelectionChange={(keys) => {
                            const selected = [...keys][0];
                            if (selected === "add-category") {
                              setIsAddCategoryOpen(true);
                              return;
                            }

                            handleChange("category_id", Number(selected));
                          }}
                        >
                          {categoriesData?.categories?.map((item) => (
                            <SelectItem
                              endContent={
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isIconOnly
                                  onPress={() => {
                                    handleDeleteCategory(item.id);
                                  }}
                                >
                                  <Trash2Icon
                                    className="text-red-500"
                                    size={15}
                                  />
                                </Button>
                              }
                              key={String(item.id)}
                              value={String(item.id)}
                            >
                              {item.categoryName}
                            </SelectItem>
                          ))}

                          <SelectItem
                            key="add-category"
                            className="text-primary font-semibold"
                            textValue="Add Category"
                            startContent={<PlusIcon size={15} />}
                          >
                            Add Category
                          </SelectItem>
                        </Select>
                        {formData.type !== "one_to_one" && (
                          <Select
                            size="lg"
                            variant="bordered"
                            label="Difficulty Level"
                            labelPlacement="outside"
                            placeholder="Select Difficulty Level"
                            isRequired
                            errorMessage="Difficulty Level is required"
                            className="w-full"
                            selectedKeys={[formData.difficulty_level]}
                            onSelectionChange={(keys) =>
                              handleChange("difficulty_level", [...keys][0])
                            }
                          >
                            {Difficulty.map((item) => (
                              <SelectItem key={item.key} value={item.id}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </Select>
                        )}
                      </div>
                      <div className="py-4">
                        <Textarea
                          size="lg"
                          variant="bordered"
                          label="Description"
                          value={formData.description}
                          onChange={(e) =>
                            handleChange("description", e.target.value)
                          }
                          labelPlacement="outside"
                          placeholder="Enter course description"
                        />
                      </div>
                      {formData.type !== "one_to_one" && (
                        <div className="flex items-center max-sm:flex-wrap gap-3">
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Base Course Price (GBP)"
                            type="number"
                            labelPlacement="outside"
                            placeholder="0.00"
                            isRequired
                            isDisabled={formData.is_free}
                            startContent={"£"}
                            min={1}
                            errorMessage="Base Course Price must be at least 1 £"
                            className="w-full"
                            value={formData.base_price}
                            onChange={(e) =>
                              handleChange("base_price", e.target.value)
                            }
                          />
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Discount Percentage"
                            type="number"
                            labelPlacement="outside"
                            placeholder="15%"
                            endContent={"%"}
                            max={100}
                            isDisabled={formData.is_free}
                            errorMessage="Discount Percentage is must be between 0 and 100"
                            className="w-full"
                            value={formData.discount_percentage}
                            onChange={(e) =>
                              handleChange("discount_percentage", e.target.value)
                            }
                          />
                        </div>
                      )}
                      <div className="flex items-center pt-2 gap-3 flex-wrap">
                        {formData.type !== "one_to_one" && (
                          <div className="flex items-center gap-2">
                            <p className="text-md text-[#06574C]">
                              Paid
                            </p>
                            <Switch
                              color="success"
                              aria-label="Free or Paid course"
                              isSelected={!formData.is_free}
                              onValueChange={(val) => {
                                handleChange("is_free", !val);
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-md text-[#06574C]">
                            Trending
                          </p>
                          <Switch
                            color="success"
                            aria-label="Trending course"
                            isSelected={!!formData.is_trending}
                            onValueChange={(val) => {
                              handleChange("is_trending", val);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <p className="text-sm font-medium text-gray-700">
                            Course Status:
                          </p>
                          <Select
                            size="sm"
                            selectedKeys={[formData.status]}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              handleChange("status", value);
                            }}
                            className="w-32"
                            variant="bordered"
                            defaultSelectedKeys={["draft"]}
                          >
                            <SelectItem key="published">Public</SelectItem>
                            <SelectItem key="private">Private</SelectItem>
                            <SelectItem key="draft">Draft</SelectItem>
                          </Select>
                        </div>
                      </div>
                      {formData?.type !== "in_person" && formData?.type !== "one_to_one" && (
                        <div className="pt-6">
                          <TeacherSelect
                            label="Teacher"
                            isRequired
                            onChange={(id) => handleChange("teacher_id", id)}
                            initialValue={formData.teacher_id}
                            errorMessage={teacherError}
                          />
                        </div>
                      )}
                      {formData?.type !== "one_to_one" && (
                        <div className="my-4">
                          <StudentSelect
                            onChange={(ids) => handleChange("student_ids", ids)}
                            initialValues={formData.student_ids || []}
                          />
                        </div>
                      )}

                      <div className="pt-6">
                        <Select
                          placeholder="Select Type"
                          label="Select Type"
                          labelPlacement="outside"
                          title="Select Type"
                          radius="md"
                          size="lg"
                          errorMessage="Type is required"
                          variant="bordered"
                          onSelectionChange={(k) => {
                            const keys = [...k];
                            handleChange("type", keys[0]);
                          }}
                          selectedKeys={
                            formData.type
                              ? new Set([String(formData.type)])
                              : new Set()
                          }
                        >
                          <SelectItem
                            key="all"
                            value="all"
                            className="capitalize"
                          >
                            All Courses
                          </SelectItem>

                          <SelectItem
                            description={
                              <span
                                title=" Pay once and get lifetime access to all course materials. Includes course player, files, and progress tracking."
                                className="block text-xs text-gray-500"
                              >
                                Pay once and get lifetime access to all course
                                materials. Includes course player, files, and
                                progress tracking.
                              </span>
                            }
                            key="one_time"
                            value="one_time"
                            className="capitalize"
                          >
                            One Time Paid
                          </SelectItem>

                          <SelectItem
                            description={
                              <span
                                title="Scheduled live sessions requiring subscription. Access course player, files, and track progress for each live class."
                                className="block text-xs text-gray-500"
                              >
                                Scheduled live sessions requiring subscription.
                                Access course player, files, and track progress
                                for each live class.
                              </span>
                            }
                            key="live"
                            value="live"
                            className="capitalize"
                          >
                            Live Classes
                          </SelectItem>
                          <SelectItem
                            description={
                              <span className="block text-xs text-gray-500">
                                Physical classroom course with monthly subscription. Admin manages teachers and classroom manually.
                              </span>
                            }
                            key="in_person"
                            value="in_person"
                            className="capitalize"
                          >
                            In-Person Classes
                          </SelectItem>
                          <SelectItem
                            description={
                              <span className="block text-xs text-gray-500">
                                Advertise a 1:1 inquiry on the website. Students submit a Google Form (no payment). Teacher and student are assigned later when the class is created.
                              </span>
                            }
                            key="one_to_one"
                            value="one_to_one"
                            className="capitalize"
                          >
                            1:1 Class
                          </SelectItem>
                        </Select>
                      </div>
                      <div className="pt-4">
                        <Select
                          placeholder="Select display tab"
                          label="Display Tab (Website)"
                          labelPlacement="outside"
                          title="Display Tab"
                          radius="md"
                          size="lg"
                          variant="bordered"
                          description="Choose which website tab this course appears under. Auto uses the course type (One Time Paid & Live → Online)."
                          onSelectionChange={(k) => {
                            const keys = [...k];
                            handleChange("display_tab", keys[0] || "auto");
                          }}
                          selectedKeys={
                            formData.display_tab
                              ? new Set([String(formData.display_tab)])
                              : new Set(["auto"])
                          }
                        >
                          <SelectItem key="auto" value="auto">
                            Auto (from course type)
                          </SelectItem>
                          <SelectItem key="live" value="live">
                            Online Classes
                          </SelectItem>
                          <SelectItem key="in_person" value="in_person">
                            In-Person Classes
                          </SelectItem>
                          <SelectItem key="one_to_one" value="one_to_one">
                            One-to-One / 1:1
                          </SelectItem>
                        </Select>
                      </div>
                      {formData.type !== "one_to_one" && (
                        <IntervalInput
                          label="Course duration"
                          inputWidth={140}
                          className="mt-3"
                          nullableValue="on_going"
                          nullableValueLabel="Ongoing"
                          initialValue={formData?.duration}
                          onUpdate={(interval) =>
                            handleChange("duration", interval)
                          }
                        />
                      )}
                      {(formData?.type === "live" || formData?.type === "in_person") && (
                        <IntervalInput
                          label="Subscription Interval"
                          inputWidth={140}
                          toolTipContent={
                            formData?.type === "in_person"
                              ? "How often students are charged for this in-person course"
                              : "How do want to charge student for live sessions on this course"
                          }
                          className="mt-3"
                          initialValue={formData?.interval}
                          onUpdate={(interval) =>
                            handleChange("interval", interval)
                          }
                          units={["week", "month", "day"]}
                        />
                      )}
                      {formData?.type === "in_person" && (
                        <div className="mt-4 space-y-4 p-4 bg-[#95C4BE22] rounded-lg border border-[#95C4BE]">
                          <h2 className="text-[#06574C] font-semibold text-base">
                            In-Person Course Details
                          </h2>
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Age Group"
                            labelPlacement="outside"
                            placeholder="e.g. 5-8 years, Teens, Adults"
                            value={formData.age_group}
                            onChange={(e) => handleChange("age_group", e.target.value)}
                          />
                          <Select
                            label="Schedule Days"
                            labelPlacement="outside"
                            placeholder="Select days"
                            size="lg"
                            radius="md"
                            variant="bordered"
                            selectionMode="multiple"
                            selectedKeys={
                              formData.schedule_days
                                ? new Set(
                                  formData.schedule_days
                                    .split(",")
                                    .map((day) => day.trim())
                                    .filter(Boolean),
                                )
                                : new Set()
                            }
                            onSelectionChange={(keys) => {
                              const selected = [...keys];
                              handleChange("schedule_days", selected.join(", "));
                            }}
                          >
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </Select>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                              size="lg"
                              variant="bordered"
                              label="Start Time"
                              labelPlacement="outside"
                              type="time"
                              value={formData.schedule_start_time}
                              onChange={(e) =>
                                handleChange("schedule_start_time", e.target.value)
                              }
                            />
                            <Input
                              size="lg"
                              variant="bordered"
                              label="End Time"
                              labelPlacement="outside"
                              type="time"
                              value={formData.schedule_end_time}
                              onChange={(e) =>
                                handleChange("schedule_end_time", e.target.value)
                              }
                            />
                          </div>
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Venue / Location"
                            labelPlacement="outside"
                            placeholder="Full address of the classroom/venue"
                            value={formData.venue}
                            onChange={(e) => handleChange("venue", e.target.value)}
                          />
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Enrollment Limit"
                            labelPlacement="outside"
                            placeholder="e.g. 15"
                            type="number"
                            min={1}
                            value={formData.max_capacity}
                            onChange={(e) => handleChange("max_capacity", e.target.value)}
                          />
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Start Date"
                            labelPlacement="outside"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => handleChange("start_date", e.target.value)}
                          />
                          <Textarea
                            size="lg"
                            variant="bordered"
                            label="What to Bring (optional)"
                            labelPlacement="outside"
                            placeholder="e.g. Comfortable clothing, water bottle, yoga mat"
                            value={formData.what_to_bring}
                            onChange={(e) => handleChange("what_to_bring", e.target.value)}
                          />
                        </div>
                      )}
                      {formData?.type === "one_to_one" && (
                        <div className="mt-4 space-y-4 p-4 bg-[#95C4BE22] rounded-lg border border-[#95C4BE]">
                          <h2 className="text-[#06574C] font-semibold text-base">
                            1:1 Class Details
                          </h2>
                          <p className="text-xs text-gray-600">
                            Advertise this class on the website. Paste a Google Form (inquiry) or Stripe payment link.
                            Teacher and student are assigned later when the real class is created on the portal.
                            For Google Form flow, the form title must match the Course Title exactly.
                          </p>
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Enrollment Link"
                            labelPlacement="outside"
                            placeholder="https://docs.google.com/forms/... or https://buy.stripe.com/..."
                            type="url"
                            value={formData.google_form_link}
                            onChange={(e) =>
                              handleChange("google_form_link", e.target.value)
                            }
                            description="Website button shows “Enquire Now” for Google Form links and “Enroll Now” for Stripe links."
                          />
                          {(!formData.google_form_link ||
                            /docs\.google\.com\/forms|forms\.gle/i.test(
                              formData.google_form_link,
                            )) && (
                              <>
                                {(!emailTemplatesData?.templates ||
                                  emailTemplatesData.templates.length === 0) && (
                                    <p className="text-xs text-gray-500">
                                      No email templates yet.{" "}
                                      <Link
                                        to="/admin/email-templates"
                                        className="text-[#06574C] font-medium underline"
                                      >
                                        Create email templates
                                      </Link>{" "}
                                      and they will appear here.
                                    </p>
                                  )}

                                <div className="bg-white rounded-lg border border-[#95C4BE] p-3 space-y-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#06574C]">
                                      Form Filler Email Template
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Sent to the student who submits the Google Form.
                                    </p>
                                  </div>
                                  <Select
                                    size="lg"
                                    variant="bordered"
                                    label="Email Template"
                                    labelPlacement="outside"
                                    placeholder="Select student confirmation template"
                                    selectionMode="single"
                                    selectedKeys={
                                      formData.form_filler_template_id
                                        ? new Set([String(formData.form_filler_template_id)])
                                        : new Set()
                                    }
                                    onSelectionChange={(keys) => {
                                      const selected = [...keys][0];
                                      if (!selected) return;
                                      handleChange("form_filler_template_id", String(selected));
                                    }}
                                  >
                                    {(emailTemplatesData?.templates || []).map((template) => (
                                      <SelectItem key={String(template.id)} value={String(template.id)}>
                                        {template.name}
                                      </SelectItem>
                                    ))}
                                  </Select>
                                </div>

                                <div className="bg-white rounded-lg border border-[#95C4BE] p-3 space-y-3">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-[#06574C]">
                                      Admin Notification Email Template
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Sent to admin with the student inquiry details. Leave custom emails empty to use the default admin email.
                                    </p>
                                  </div>
                                  <div className="mb-4 h-20 mt-3 relative top-2">
                                    <Select
                                      className="!h-fit relative mb-4 " 
                                      size="lg"
                                      variant="bordered"
                                      label="Email Template"
                                      labelPlacement="outside"
                                      placeholder="Select admin notification template"
                                      selectionMode="single"
                                      selectedKeys={
                                        formData.admin_notification_template_id
                                          ? new Set([
                                            String(formData.admin_notification_template_id),
                                          ])
                                          : new Set()
                                      }
                                      onSelectionChange={(keys) => {
                                        const selected = [...keys][0];
                                        if (!selected) return;
                                        handleChange(
                                          "admin_notification_template_id",
                                          String(selected),
                                        );
                                      }}
                                    >
                                      {(emailTemplatesData?.templates || []).map((template) => (
                                        <SelectItem key={String(template.id)} value={String(template.id)}>
                                          {template.name}
                                        </SelectItem>
                                      ))}
                                    </Select>
                                  </div>
                                  <Input
                                    className="mt-4"
                                    size="lg"
                                    variant="bordered"
                                    type="text"
                                    label="Notification Email(s)"
                                    labelPlacement="outside"
                                    placeholder="e.g. admin@example.com, teacher@example.com"
                                    value={formData.admin_notification_emails}
                                    onChange={(e) =>
                                      handleChange("admin_notification_emails", e.target.value)
                                    }
                                    description="Optional. Comma-separated emails. If set, notifications go to these addresses instead of the default admin email."
                                  />
                                </div>

                                <div className="bg-white rounded-lg border border-dashed border-[#06574C55] p-3 space-y-2">
                                  <p className="text-sm font-semibold text-[#06574C]">
                                    Apps Script Integration
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Copy the webhook script and paste it into your Google Form Apps Script editor, then add an On form submit trigger.
                                  </p>
                                  <Button
                                    size="sm"
                                    color="success"
                                    variant="flat"
                                    startContent={<FiCode size={14} />}
                                    isLoading={appsScriptLoading}
                                    onPress={openAppsScriptModal}
                                  >
                                    Get Apps Script
                                  </Button>
                                </div>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {isOneToOne && (
                      <div className="bg-white rounded-lg p-3 shadow-xl mb-3">
                        <h1 className="text-xl font-medium text-[#333333]">
                          Course Image
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                          Upload a cover image for this 1:1 class
                        </p>
                        <div className="py-4">
                          {thumbnailUrl ? (
                            <div className="relative w-full h-40 rounded-lg overflow-hidden group border border-gray-300">
                              <Image
                                removeWrapper
                                src={thumbnailUrl}
                                className="w-full h-full object-cover"
                                alt="Course cover"
                              />
                              <Button
                                size="sm"
                                color="danger"
                                className="absolute top-2 right-2 z-10"
                                onPress={() => {
                                  setRemovedUrls([...removedUrls, thumbnailUrl]);
                                  setThumbnailUrl("");
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <FileDropzone
                              files={thumbnail}
                              setFiles={setThumbnail}
                              label="Upload Course Image"
                              text="JPG, PNG, or WebP recommended"
                              height="180px"
                              fileType="image"
                            />
                          )}
                        </div>
                      </div>
                    )}
                    {!isOneToOne && (
                      <div className="bg-white rounded-lg p-3 shadow-xl">
                        <h1 className="text-xl font-medium text-[#333333]">
                          Introduction Video
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                          Upload a preview video to showcase your course
                        </p>
                        <div className="py-6">
                          <div className="flex flex-col gap-4">
                            {videoUrl ? (
                              <div className="relative w-full h-[300px] overflow-hidden rounded-lg bg-black">
                                <video
                                  className="w-full h-full object-contain"
                                  src={videoUrl}
                                  controls
                                  preload="metadata"
                                >
                                  Your browser does not support the video tag.
                                </video>
                                <Button
                                  size="sm"
                                  className="absolute top-2 right-2 bg-red-500 text-white z-10"
                                  onPress={() => {
                                    setRemovedUrls([...removedUrls, videoUrl]);
                                    setVideoUrl("");
                                    setThumbnailUrl("");
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <FileDropzone
                                files={video}
                                setFiles={setVideo}
                                fileType="video"
                                label="Upload Introduction Video"
                                text="Recommended: MP4, Webm format, 1280x720 pixels."
                              />
                            )}
                            {/* Video Cover Image Uploader */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <h4 className="font-medium text-sm mb-2 text-gray-700">
                                Video Cover Image (thumbnail)
                              </h4>
                              {thumbnailUrl ? (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden group border border-gray-300">
                                  <Image
                                    removeWrapper
                                    src={thumbnailUrl}
                                    className="w-full h-full object-cover"
                                    alt="Video Poster"
                                  />
                                  <Button
                                    size="sm"
                                    color="danger"
                                    className="absolute top-2 right-2 z-10"
                                    onPress={() => {
                                      setRemovedUrls([
                                        ...removedUrls,
                                        thumbnailUrl,
                                      ]);
                                      setThumbnailUrl("");
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <FileDropzone
                                  files={thumbnail}
                                  setFiles={setThumbnail}
                                  label="Upload Cover Image"
                                  text="JPG/PNG, 1280x720 recommended"
                                  height="150px"
                                  fileType="image"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-2 shadow-xl mt-3">
                      <h1 className="text-xl font-medium text-[#333333]">
                        Course Preview
                      </h1>
                      <div className="py-2">
                        {coursepreview.map((item, i) => (
                          <div
                            key={i}
                            className="py-1 flex justify-between items-center"
                          >
                            <h1 className="text-[16px] font-medium text-[#666666]">
                              {item.title}
                            </h1>
                            <p className="text-[16px] text-end capitalize font-semibold text-[#333333]">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center sm:justify-between items-center w-full ">
                  <Button
                    size="lg"
                    startContent={<FolderDot color="#06574C" size={16} />}
                    variant="bordered"
                    className="border-[#06574C] max-sm:w-full md:w-40 text-[#06574C]"
                    type="submit"
                    onPress={() => setPendingAction("save-1")}
                    isLoading={loadingAction === "save-1"}
                  >
                    Save Progress
                  </Button>
                  <div className="flex flex-wrap gap-3 max-sm:w-full">
                    <Button
                      size="lg"
                      className="bg-[#06574C] max-sm:w-full text-white md:w-35"
                      type="submit"
                      onPress={() => setPendingAction("next-1")}
                      isLoading={loadingAction === "next-1"}
                    >
                      {isOneToOne ? "Save & Finish" : "Next Step"}
                    </Button>
                  </div>
                </div>
              </Form>
              <Modal
                isOpen={isAddCategoryOpen}
                onOpenChange={setIsAddCategoryOpen}
              >
                <ModalContent>
                  <ModalHeader>Add Category</ModalHeader>

                  <ModalBody>
                    <Input
                      size="lg"
                      variant="bordered"
                      label="Category Name"
                      labelPlacement="outside"
                      placeholder="Enter category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </ModalBody>

                  <ModalFooter>
                    <Button
                      variant="light"
                      onPress={() => setIsAddCategoryOpen(false)}
                    >
                      Cancel
                    </Button>

                    <Button
                      color="success"
                      isDisabled={isAddingCategory}
                      isLoading={isAddingCategory}
                      onPress={handleSubmitAddCategory}
                    >
                      Add
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
              <Modal
                isOpen={appsScriptOpen}
                onOpenChange={setAppsScriptOpen}
                size="3xl"
                scrollBehavior="inside"
              >
                <ModalContent>
                  <ModalHeader>Apps Script Integration</ModalHeader>
                  <ModalBody className="space-y-4">
                    <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                      {(appsScriptData?.steps || []).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {!appsScriptData?.hasSecret && (
                      <p className="text-xs text-amber-600">
                        GOOGLE_FORM_WEBHOOK_SECRET is not set on the server. Add it to backend .env before using this script.
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Webhook URL: {appsScriptData?.webhookUrl}
                    </p>
                    <pre className="text-xs bg-gray-50 border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {appsScriptData?.script}
                    </pre>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={() => setAppsScriptOpen(false)}>
                      Close
                    </Button>
                    <Button
                      color="success"
                      startContent={<FiCopy size={14} />}
                      onPress={copyAppsScript}
                    >
                      Copy Script
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </motion.div>
          </Tab>
          {!isOneToOne && (
            <Tab
              className="h-20 max-md:justify-start"
              key="content"
              title={
                <div className="flex gap-3  justify-between items-center">
                  <div className="bg-white text-[#3F3F44] shadow-2xl  size-9 sm:size-15 rounded-full flex items-center justify-center">
                    <h1 className="text-xl font-bold text-[#06574C]">2</h1>
                  </div>
                  <div className="text-start">
                    <h1 className="text-[#06574C] text-lg font-bold">
                      Content Upload
                    </h1>
                    <h1 className="text-xs wrap-break-word">
                      Videos, PDFs, quizzes & assignments
                    </h1>
                  </div>
                </div>
              }
            >
              <motion.div
                layout
                variants={containerVariants}
                initial="hidden"
                animate="show"
                transition={{ when: "beforeChildren" }}
              >
                <div className="w-full grid grid-cols-2 md:grid-cols-5 py-4 gap-2">
                  {card.map((item, i) => (
                    <div
                      key={i}
                      className="w-full sm:flex-1 max-sm:border border-gray-300 p-3 bg-white rounded-lg"
                    >
                      <h1 className="text-[#333333] text-md font-semibold">
                        {item.title}
                      </h1>
                      <div className="mt-3 flex gap-2 items-center">
                        <div className="h-12 w-12 rounded-full bg-[#95C4BE33] p-1 items-center flex justify-center">
                          {item.icone}
                        </div>
                        <h1 className="text-2xl text-[#333333] font-bold">
                          {item.count}
                        </h1>
                      </div>
                    </div>
                  ))}
                </div>
                <Videos courseId={courseId} files={files} setFiles={setFiles} />
                <PdfAndNotes
                  courseId={courseId}
                  files={files}
                  setFiles={setFiles}
                />
                <Assignments
                  courseId={courseId}
                  files={files}
                  setFiles={setFiles}
                />
                <Quizzes courseId={courseId} files={files} setFiles={setFiles} />
                <Links courseId={courseId} files={files} setFiles={setFiles} />
                <div className="p-3 my-5 bg-[#95C4BE33] rounded-md flex justify-between items-center">
                  <div>
                    <h1 className="text-[#06574C] font-medium text-lg">
                      Content Drip Schedule
                    </h1>
                    <h1 className="text-[#06574C] font-medium text-sm">
                      Control when students can access each lesson. Content will
                      be released automatically based on their enrollment date.
                      This helps create a structured learning experience and
                      prevents overwhelming students with too much content at
                      once.
                    </h1>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center sm:justify-between items-center w-full ">
                  <Button
                    size="lg"
                    startContent={<FolderDot color="#06574C" size={16} />}
                    variant="bordered"
                    className="border-[#06574C] w-78 sm:w-40 text-[#06574C]"
                    onPress={() => handleSelected("info")}
                  >
                    Previous Step
                  </Button>
                  <div className="flex flex-wrap my-5 gap-3">
                    <Button
                      size="lg"
                      className="bg-[#06574C] w-full text-white sm:w-35"
                      type="submit"
                      onPress={() => {
                        // if (files.length === 0) { errorMessage("Please upload at least one file"); return; };
                        handleSelected("pricing");
                      }}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              </motion.div>
            </Tab>
          )}
          {!isOneToOne && (
            <Tab
              className="h-20 max-md:justify-start"
              key="pricing"
              title={
                <div className="flex gap-3 justify-between items-center">
                  <div className="bg-white text-[#3F3F44] shadow-2xl  size-9 sm:size-15 rounded-full flex items-center justify-center">
                    <h1 className="text-xl font-bold text-[#06574C]">3</h1>
                  </div>
                  <div className="text-start">
                    <h1 className="text-[#06574C] text-lg font-bold"> Access</h1>
                    <h1 className="text-xs wrap-break-word">
                      {" "}
                      Configure access rules
                    </h1>
                  </div>
                </div>
              }
            >
              <motion.div
                layout
                variants={containerVariants}
                initial="hidden"
                animate="show"
                transition={{ when: "beforeChildren" }}
              >
                <Form onSubmit={handleSubmit3tab} className="w-full py-4">
                  <div className="grid grid-cols-12 gap-2 w-full">
                    <div className="bg-white rounded-lg p-4 col-span-12 shadow-xl">
                      <div>
                        <h1 className="text-xl font-medium text-[#333333]">
                          Access Settings
                        </h1>
                      </div>
                      <div className="py-4">
                        {/* <div className="p-3 bg-[#95C4BE33] rounded-lg flex justify-between items-center">
                        <div>
                          <h1 className="text-[#06574C] font-medium text-lg">
                            Course Type
                          </h1>
                          <h1 className="text-[#06574C] font-medium text-sm">
                            Choose between paid or free course
                          </h1>
                        </div>
                      </div> */}

                        <div className="flex gap-3 items-center py-4">
                          {formData.type === "one_time" && (
                            <Select
                              size="lg"
                              variant="bordered"
                              label="Access Duration"
                              labelPlacement="outside"
                              placeholder="Select Access Duration"
                              className="w-full"
                              selectedKeys={[formData.access_duration]}
                              onSelectionChange={(keys) =>
                                handleChange("access_duration", [...keys][0])
                              }
                            >
                              {accessDuration.map((item) => (
                                <SelectItem key={item.key} value={item.label}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </Select>
                          )}
                          <Input
                            size="lg"
                            variant="bordered"
                            label="Preview Lessons "
                            labelPlacement="outside"
                            placeholder="Select Preview Lessons "
                            className="w-full"
                            type="text"
                            value={formData.previous_lesson}
                            onChange={(e) =>
                              handleChange("previous_lesson", e.target.value)
                            }
                          />
                        </div>
                        <Input
                          size="lg"
                          variant="bordered"
                          label="Enrollment Limit"
                          labelPlacement="outside"
                          placeholder="0"
                          className="w-full"
                          type="number"
                          min={1}
                          isRequired={true}
                          errorMessage="Enrollment limit must be at least 1"
                          value={formData.enroll_number}
                          onChange={(e) =>
                            handleChange("enroll_number", e.target.value)
                          }
                        />
                        {/* <span className="text-xs text-[#06574C]">
                        Leave empty for unlimited enrollments
                      </span> */}
                        <div className="my-3 text-xl font-bold">
                          Publish Status
                        </div>
                        <div className="p-3 bg-[#EBD4C982] rounded-lg flex justify-between items-center">
                          <div>
                            <h1 className="text-[#333333] font-bold text-lg">
                              Current Status: {formData.status}
                            </h1>

                            <h1 className="text-[#666666] font-medium text-sm">
                              {formData.status === "published"
                                ? "Your course is visible to students"
                                : formData.status === "private"
                                  ? "Your course is private (only admin , assigned students or assigned teachers can see it)"
                                  : "Your course is saved as draft"}
                            </h1>
                          </div>

                          <div className="flex items-center gap-3">
                            <Select
                              selectedKeys={[formData.status]}
                              onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0];
                                handleChange("status", value);
                              }}
                              className="w-40"
                              variant="bordered"
                              color="success"
                            >
                              <SelectItem key="published">Public</SelectItem>
                              <SelectItem key="private">Private</SelectItem>
                              <SelectItem key="draft">Draft</SelectItem>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-between items-center w-full ">
                    <div className="flex flex-wrap items-center justify-center  gap-2">
                      <Button
                        size="lg"
                        startContent={<FolderDot color="#06574C" size={16} />}
                        variant="bordered"
                        className="border-[#06574C] w-80 sm:w-40 text-[#06574C]"
                        onPress={() => handleSelected("content")}
                      >
                        Previous Step
                      </Button>
                      <Button
                        size="lg"
                        startContent={<FolderDot color="#06574C" size={16} />}
                        variant="bordered"
                        className="border-[#06574C] text-[#06574C] w-80 sm:w-40"
                        type="submit"
                        onPress={() => {
                          setPendingAction("save-3");
                        }}
                        isLoading={loadingAction === "save-3"}
                      >
                        Save Changes
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        startContent={<Rocket color="white" size={16} />}
                        className="bg-[#06574C] text-white w-80 sm:w-60"
                        type="submit"
                        onPress={() => {
                          setPendingAction("publish-3");
                          // Only auto-publish if it's a draft. If private/public already selected, just save.
                          if (formData?.status === "draft") {
                            handleChange("status", "published");
                          }
                        }}
                        isLoading={loadingAction === "publish-3"}
                      >
                        {formData?.status === "published"
                          ? "Save & Published"
                          : formData?.status === "private"
                            ? "Save as Private"
                            : "Publish Course"}
                      </Button>
                    </div>
                  </div>
                </Form>
              </motion.div>
            </Tab>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default CourseBuilder;
