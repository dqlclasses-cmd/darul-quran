import { DashHeading } from "../../../components/dashboard-components/DashHeading";
import {
  Button,
  Image,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Pagination,
  Select,
  SelectItem,
  Skeleton,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@heroui/react";
import { IoStarSharp } from "react-icons/io5";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useDeleteCourseMutation,
  useGetAllCategoriesQuery,
  useGetAllCoursesQuery,
  useMoveCourseOrderMutation,
} from "../../../redux/api/courses";
import { errorMessage, successMessage } from "../../../lib/toast.config";
import { debounce } from "../../../lib/utils";
import QueryError from "../../../components/QueryError";

const CourseManagement = () => {


  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');
  const [trendingFilter, setTrendingFilter] = useState('all');
  const [sortKey, setSortKey] = useState('order');
  const [sortDir, setSortDir] = useState('asc');
  const [movingId, setMovingId] = useState(null);

  const sortParam = `${sortKey}_${sortDir}`;

  // Query/Fetch
  const { data, isFetching: isLoading, isError, error, refetch } = useGetAllCoursesQuery({
    page,
    categoryId,
    limit,
    status,
    search,
    type: courseTypeFilter,
    sort: sortParam,
    isTrending:
      trendingFilter === "trending"
        ? true
        : trendingFilter === "non_trending"
          ? false
          : undefined,
  });
  const { data: categoriesData, isError: categoriesError, error: categoriesErrorData } = useGetAllCategoriesQuery();
  // Mutation/Action
  const [deleteProduct] = useDeleteCourseMutation();
  const [moveCourseOrder] = useMoveCourseOrderMutation();

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "order" ? "asc" : "desc");
    }
    setPage(1);
  };

  const renderSortLabel = (label, sortField, align = "left") => {
    const isActive = sortKey === sortField;
    return (
      <button
        type="button"
        onClick={() => handleSort(sortField)}
        className={`inline-flex items-center gap-1 font-bold text-sm text-[#333333] capitalize tracking-widest hover:text-[#06574C] ${
          align === "center" ? "justify-center w-full" : ""
        }`}
      >
        <span>{label}</span>
        <span className="inline-flex flex-col leading-none">
          <ChevronUp
            size={12}
            className={isActive && sortDir === "asc" ? "text-[#06574C]" : "text-gray-400"}
          />
          <ChevronDown
            size={12}
            className={`-mt-1 ${isActive && sortDir === "desc" ? "text-[#06574C]" : "text-gray-400"}`}
          />
        </span>
      </button>
    );
  };

  const handleMoveOrder = async (id, direction) => {
    setMovingId(id);
    try {
      const res = await moveCourseOrder({
        id,
        direction,
        type: courseTypeFilter,
      });
      if (res.error) {
        throw new Error(res.error?.data?.message || "Failed to update order");
      }
      successMessage(direction === "up" ? "Moved up" : "Moved down");
    } catch (err) {
      errorMessage(err?.message || "Failed to update order");
    } finally {
      setMovingId(null);
    }
  };

  useEffect(() => {
    if (isError) {
      errorMessage(error.data.error, error.status);
    } else if (categoriesError) {
      errorMessage(categoriesErrorData.data.error, categoriesErrorData.status);
    }
  }, [isError, categoriesError]);

  const statuses = [
    { key: "all", label: "All Status" },
    { key: "draft", label: "Draft" },
    { key: "private", label: "Private" },
    { key: "published", label: "Published" },
  ];
  const limits = [
    { key: "6", label: "6" },
    { key: "10", label: "10" },
    { key: "20", label: "20" },
    { key: "30", label: "30" },
    { key: "40", label: "40" },
    { key: "50", label: "50" },
  ];

  const courseTypes = [
    { key: "all", label: "All Types" },
    { key: "one_time", label: "One Time Paid" },
    { key: "live", label: "Live Class" },
    { key: "in_person", label: "In-Person Classes" },
    { key: "one_to_one", label: "1:1 Class" },
  ];

  const trendingOptions = [
    { key: "all", label: "All Courses" },
    { key: "trending", label: "Trending" },
    { key: "non_trending", label: "Non Trending" },
  ];

  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  // Delete confirmation modal state
  const deleteModal = useDisclosure();
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [relatedData, setRelatedData] = useState(null);
  const [isLoadingRelatedData, setIsLoadingRelatedData] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Open delete confirmation modal and load related data
  const handleOpenDeleteModal = async (id) => {
    setSelectedDeleteId(id);
    setRelatedData(null);
    setLoadError(null);
    setIsLoadingRelatedData(true);
    deleteModal.onOpen();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/course/course-related-data/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch related data");
      }

      const data = await response.json();
      setRelatedData(data);
    } catch (error) {
      console.error("Error fetching related data:", error);
      setLoadError(error.message);
    } finally {
      setIsLoadingRelatedData(false);
    }
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!selectedDeleteId) return;

    setDeleteLoading(true);
    setDeletingId(selectedDeleteId);

    try {
      const res = await deleteProduct(selectedDeleteId);
      if (res.error) {
        throw new Error(res.error.message || "Failed to delete course");
      }
      deleteModal.onClose();
      setSelectedDeleteId(null);
      setRelatedData(null);
    } catch (error) {
      console.error("Delete error:", error);
      errorMessage(error?.message);
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

  // Close modal and reset state
  const handleCloseDeleteModal = () => {
    deleteModal.onClose();
    setSelectedDeleteId(null);
    setRelatedData(null);
    setLoadError(null);
  };

  const handleEdit = (id) => {
    navigate(`/admin/courses-management/builder?tab=info&id=${id}`);
  };
  if (error) {
    return <QueryError
      height="300px"
      error={error}
      onRetry={refetch}
      showLogo={false}
      isLoading={isLoading}
    />
  }
  return (
    <div className="bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-3">
      <DashHeading desc={"Manage and monitor course catalog — use ↑↓ arrows to set website display order"} />
      <div className="bg-[#EBD4C9] flex-wrap gap-2 p-2 sm:p-4 rounded-lg my-3 flex justify-between items-center">
        <div className="flex max-md:flex-wrap items-center gap-2">
          <Select
            className=" min-w-[120px]"
            radius="sm"
            defaultSelectedKeys={["all"]}
            onSelectionChange={(k) => {
              const keys = [...k];
              setStatus(keys[0]);
              setPage(1);
            }}
            placeholder="Select an status"
          >
            {statuses.map((status) => (
              <SelectItem key={status.key}>{status.label}</SelectItem>
            ))}
          </Select>
          <Select
            className="min-w-[140px]"
            radius="sm"
            defaultSelectedKeys={["all"]}
            onSelectionChange={(k) => {
              const keys = [...k];
              setCourseTypeFilter(keys[0]);
              setPage(1);
            }}
            placeholder="Select course type"
          >
            {courseTypes.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>
          <Select
            className="min-w-[150px]"
            radius="sm"
            defaultSelectedKeys={["all"]}
            onSelectionChange={(k) => {
              const keys = [...k];
              setTrendingFilter(keys[0]);
              setPage(1);
            }}
            placeholder="Trending filter"
          >
            {trendingOptions.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>
          <Select
            className="min-w-40"
            radius="sm"
            defaultSelectedKeys={["all"]}
            onSelectionChange={(k) => {
              const keys = [...k];
              setCategoryId(keys[0]); // can be string can be number it is going through searchParams anyway
              setPage(1);
            }}
            placeholder="Select a category"
          >
            <SelectItem key="all">All Category</SelectItem>
            {categoriesData?.categories?.map((item) => (
              <SelectItem title={item.categoryName} key={String(item.id)} value={String(item.id)}>
                {item.categoryName}</SelectItem>
            ))}
          </Select>
          <Input
            type="search"
            placeholder="Search..."
            radius="sm"
            defaultValue={search}
            onChange={(e) =>
              debounce(() => {
                setSearch(e.target.value);
              }, 400)
            }
          />
        </div>
        {/* <CourseForm /> */}
        <Button as={Link} to={'/admin/courses-management/builder'} radius="md" size="md" startContent={<Plus color="white" size={15} />} className="bg-[#06574C] max-sm:w-full text-white py-4 px-3 sm:px-8">
          Create Course
        </Button>
      </div>
      <div className="">
        <div className="overflow-x-auto no-scrollbar bg-white rounded-lg">
          <Table
            aria-label="Pending approvals table"
            removeWrapper
            align="center"
            classNames={{
              base: "table-fixed w-full bg-white rounded-lg min-h-[500px] overflow-y-auto",
              th: "font-bold p-4 text-sm text-[#333333] capitalize tracking-widest bg-[#EBD4C936]",
              td: "py-3 align-center",
              tr: "border-b border-default-200 last:border-b-0 hover:bg-[#EBD4C936]",
            }}
          >
            <TableHeader>
              <TableColumn className="w-16 text-center">
                {renderSortLabel("Order", "order", "center")}
              </TableColumn>
              <TableColumn className="w-1/4">Thumbnail</TableColumn>
              <TableColumn className="w-1/4">
                {renderSortLabel("Details", "name")}
              </TableColumn>
              <TableColumn className="w-2/6 text-center">
                {renderSortLabel("Type", "type", "center")}
              </TableColumn>
              <TableColumn className="w-1/6 text-center">Category</TableColumn>
              <TableColumn className="w-1/6">Teacher</TableColumn>
              <TableColumn className="w-1/12 text-center">
                {renderSortLabel("Price", "price", "center")}
              </TableColumn>
              <TableColumn className="w-1/12 text-center">
                {renderSortLabel("Enrolled", "enrolled", "center")}
              </TableColumn>
              <TableColumn className="w-1/12 text-center">
                {renderSortLabel("Status", "status", "center")}
              </TableColumn>
              <TableColumn className="w-1/12 text-center">
                {renderSortLabel("Trending", "trending", "center")}
              </TableColumn>
              <TableColumn className="w-1/6">
                {renderSortLabel("Rating", "rating")}
              </TableColumn>
              <TableColumn className="w-24">Actions</TableColumn>
            </TableHeader>

            <TableBody
              loadingContent={<Spinner color="success" />}
              emptyContent={"  No Course Found."}
              loadingState={isLoading ? "loading" : "idle"}
            >
              {data?.courses?.map((classItem, index) => {
                const globalIndex = (page - 1) * limit + index;
                const isFirst = globalIndex === 0;
                const isLast = globalIndex >= (data?.total ?? 0) - 1;
                const isMoving = movingId === classItem.id;

                return (
                <TableRow key={classItem.id}>
                  <TableCell>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold text-[#06574C]">
                        {classItem.displayOrder || globalIndex + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="success"
                          aria-label="Move up"
                          isDisabled={isFirst || isMoving || !!movingId}
                          isLoading={isMoving}
                          onPress={() => handleMoveOrder(classItem.id, "up")}
                          className="min-w-6 w-6 h-6"
                        >
                          <ChevronUp size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="success"
                          aria-label="Move down"
                          isDisabled={isLast || isMoving || !!movingId}
                          isLoading={isMoving}
                          onPress={() => handleMoveOrder(classItem.id, "down")}
                          className="min-w-6 w-6 h-6"
                        >
                          <ChevronDown size={14} />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell >
                    <Image src={classItem.thumbnail ?? ''}
                      width={50}
                      height={50}
                      fallbackSrc={'https://user-images.githubusercontent.com/237508/90246627-ecbda400-de2c-11ea-8bfb-b4307bfb975d.png'}
                      alt={classItem.courseName}
                      isBlurred
                      className="rounded-lg shrink-0" />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p title={classItem?.courseName} className="font-medium cursor-pointer max-w-[220px] text-gray-900 truncate">
                        {classItem?.courseName}
                      </p>
                      <p title={classItem?.description} className="text-xs cursor-pointer text-gray-500 mt-0.5 whitespace-normal max-w-[220px] line-clamp-1">
                        {classItem?.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="p-2 text-center w-full capitalize text-xs rounded-md text-warning bg-warning/20">
                      {classItem?.type?.replace("_", "")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="p-2 w-full text-center text-xs rounded-md text-[#06574C] bg-[#95C4BE]/20">
                      {classItem?.category_name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {classItem?.first_name} {classItem?.last_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                        {classItem?.email}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="font-medium">
                      {classItem?.isFree ? 'Free' : `£${classItem?.coursePrice}`}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="font-medium">
                      {classItem?.studentCourseCount}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <p className="p-2 capitalize w-full text-xs text-center rounded-md text-[#06574C] bg-[#95C4BE]/20">
                      {classItem.status}
                    </p>
                  </TableCell>

                  <TableCell className="text-center">
                    <p
                      className={`p-2 w-full text-xs text-center rounded-md ${
                        classItem?.isTrending
                          ? "text-[#D28E3D] bg-[#FBF4EC]"
                          : "text-gray-500 bg-gray-100"
                      }`}
                    >
                      {classItem?.isTrending ? "Yes" : "No"}
                    </p>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-0 flex items-center">
                      <Link to={'/admin/help/reviews?id=' + classItem?.id} className="font-medium flex gap-1 items-center truncate max-w-[220px] ">
                        {classItem?.rating > 0 && <IoStarSharp size={18} color="#FDD835" />}
                        {classItem?.rating || "No ratings"}
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center gap-2 justify-end">
                    {/* <CourseForm initialData={classItem} /> */}

                    {classItem?.type === "in_person" && (
                      <Button
                        as={Link}
                        to={`/admin/courses-management/waiting-list/${classItem.id}`}
                        variant="bordered"
                        color="warning"
                        size="sm"
                      >
                        Waiting List
                      </Button>
                    )}
                    <Button
                      variant="bordered"
                      color="success"
                      onPress={() => handleEdit(classItem.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      color="danger"
                      variant="bordered"
                      isLoading={deletingId === classItem.id}
                      isDisabled={deletingId === classItem.id}
                      onPress={() => handleOpenDeleteModal(classItem.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center p-4 gap-2 justify-between overflow-hidden">
        <div className="flex text-sm items-center gap-1">
          <span>Limit</span>
          <Select
            radius="sm"
            className="w-[70px]"
            defaultSelectedKeys={["10"]}
            onSelectionChange={(k) => {
              const keys = [...k];
              setLimit(Number(keys[0]))
            }}
            placeholder="1"
          >
            {limits.map((limit) => (
              <SelectItem key={limit.key}>{limit.label}</SelectItem>
            ))}
          </Select>
          <span className="min-w-56">Out of {data?.total}</span>
        </div        >
        <Pagination
          className=""
          showControls
          variant="ghost"
          initialPage={1}
          total={data?.totalPages}
          onChange={setPage}
          classNames={{
            item: "rounded-sm hover:bg-bg-[#06574C]/50",
            cursor: "bg-[#06574C] rounded-sm text-white",
            prev: "rounded-sm bg-white/80",
            next: "rounded-sm bg-white/80",
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onOpenChange={handleCloseDeleteModal}
        size="lg"
        isDismissable={false}
        isKeyboardDismissDisabled={true}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-xl font-bold text-danger flex items-center gap-2">
                  <Trash2 size={24} />
                  Delete Course
                </span>
              </ModalHeader>
              <ModalBody className="py-4">
                {isLoadingRelatedData ? (
                  // Skeleton Loading
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-3/4 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-5/6 rounded" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-5 w-1/2 rounded" />
                      <Skeleton className="h-4 w-2/3 rounded ml-4" />
                      <Skeleton className="h-4 w-1/2 rounded ml-4" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-5 w-1/3 rounded" />
                      <Skeleton className="h-4 w-1/2 rounded ml-4" />
                    </div>
                  </div>
                ) : loadError ? (
                  // Error State
                  <div className="text-center py-8">
                    <p className="text-danger font-semibold mb-2">Failed to load related data</p>
                    <p className="text-sm text-gray-500">{loadError}</p>
                  </div>
                ) : relatedData ? (
                  // Related Data Display
                  <div className="space-y-4">
                    <div className="bg-danger/10 rounded-lg p-4">
                      <p className="text-sm text-gray-700 mb-3">
                        You are about to delete:
                      </p>
                      <p className="font-bold text-lg text-gray-900">
                        {relatedData?.courseName || "This Course"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-danger">⚠</span>
                        This will also permanently remove:
                      </p>

                      <div className="space-y-3 ml-2">
                        {relatedData?.relatedData?.schedules > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-danger rounded-full" />
                            <span className="text-sm text-gray-700">
                              <strong className="font-semibold text-danger">
                                {relatedData.relatedData.schedules}
                              </strong>{" "}
                              Schedule{relatedData.relatedData.schedules > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {relatedData?.relatedData?.enrollments?.count > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-danger rounded-full mt-1.5" />
                            <div className="text-sm text-gray-700">
                              <span className="font-semibold text-danger">
                                {relatedData.relatedData.enrollments.count}
                              </span>{" "}
                              Enrollment{relatedData.relatedData.enrollments.count > 1 ? 's' : ''}
                              <div className="text-xs text-gray-500 ml-4 mt-1">
                                Active: <strong className="text-success">{relatedData.relatedData.enrollments.activeCount}</strong>
                                {" • "}
                                Inactive: <strong className="text-gray-600">{relatedData.relatedData.enrollments.inactiveCount}</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {relatedData?.relatedData?.subscriptions?.count > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-danger rounded-full mt-1.5" />
                            <div className="text-sm text-gray-700">
                              <span className="font-semibold text-danger">
                                {relatedData.relatedData.subscriptions.count}
                              </span>{" "}
                              Subscription{relatedData.relatedData.subscriptions.count > 1 ? 's' : ''}
                              <div className="text-xs text-gray-500 ml-4 mt-1">
                                Active: <strong className="text-success">{relatedData.relatedData.subscriptions.activeCount}</strong>
                                {" • "}
                                Inactive: <strong className="text-gray-600">{relatedData.relatedData.subscriptions.inactiveCount}</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {relatedData?.relatedData?.attendance > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-danger rounded-full" />
                            <span className="text-sm text-gray-700">
                              <strong className="font-semibold text-danger">
                                {relatedData.relatedData.attendance}
                              </strong>{" "}
                              Attendance Record{relatedData.relatedData.attendance > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {relatedData?.relatedData?.courseFiles > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-danger rounded-full" />
                            <span className="text-sm text-gray-700">
                              <strong className="font-semibold text-danger">
                                {relatedData.relatedData.courseFiles}
                              </strong>{" "}
                              Course File{relatedData.relatedData.courseFiles > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {!relatedData?.relatedData || (
                          relatedData.relatedData.schedules === 0 &&
                          !relatedData.relatedData.enrollments?.count &&
                          !relatedData.relatedData.subscriptions?.count &&
                          relatedData.relatedData.attendance === 0 &&
                          relatedData.relatedData.courseFiles === 0
                        ) && (
                            <div className="flex items-center gap-2">
                              <span className="text-success">✓</span>
                              <span className="text-sm text-gray-700">
                                No related data found for this course
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="bg-warning/10 rounded-lg p-3 mt-2">
                      <p className="text-xs text-warning-dark font-medium">
                        ⚠ This action cannot be undone!
                      </p>
                    </div>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter className="border-t border-gray-200">
                <Button
                  color="default"
                  variant="light"
                  onPress={handleCloseDeleteModal}
                  isDisabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={deleteLoading}
                  isDisabled={isLoadingRelatedData || loadError !== null || !relatedData}
                  startContent={!deleteLoading && <Trash2 size={16} />}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default CourseManagement;
