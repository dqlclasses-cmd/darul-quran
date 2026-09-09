import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const courseApi = createApi({
    reducerPath: "courseApi",
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_PUBLIC_SERVER_URL + "/api/course",
        credentials: "include",
        //only need this if dommian is not same as backend for sfari & incoginito browser
        // prepareHeaders: (headers, { getState }) => {
        //     const tokenFromState = getState().user?.token;

        //     const finalToken = tokenFromState || localStorage.getItem("token");

        //     if (finalToken) {
        //         headers.set("Authorization", `Bearer ${finalToken}`);
        //     }

        //     return headers;
        // },
    }),
    tagTypes: ["course", "reviews", "categories", "courseStudents", "courseAttendance", "WaitingList"],
    endpoints: (builder) => ({
        getAllCourses: builder.query({
            query: ({ page, limit, categoryId, sort, categoryIds, search, status, type, difficulties, isFree, isTrending }) => ({
                url: "/getAllCourses",
                method: "GET",
                params: {
                    page, isFree, isTrending, sort, limit, categoryId: categoryId ? categoryId : undefined, search, status, type,
                    difficulties: difficulties?.length > 0 ? JSON.stringify(difficulties) : undefined,
                    categoryIds: categoryIds?.length > 0 ? JSON.stringify(categoryIds) : undefined
                },
            }),
            providesTags: ["course"],
        }),
        getAllCoursesForSelect: builder.query({
            query: ({ page, limit, status, search, type = "live", initialValue }) => ({
                url: "/getAllCoursesForSelect",
                method: "GET",
                params: {
                    page, limit, search, status, type, initialValue
                },
            }),
            providesTags: ["course"],
        }),
        getEnrolledCourses: builder.query({
            query: ({ page = 1, limit, categoryId, search = '' }) => ({
                url: "/my-courses",
                method: "GET",
                params: { page, limit, categoryId, search }
            }),
            providesTags: ["course"],
        }),
        getCoursesByTeacherId: builder.query({
            query: ({ page = 1, limit, categoryId, search = '', type, status }) => ({
                url: "/teacher-courses",
                method: "GET",
                params: { page, limit, categoryId, search, type, status }
            }),
            providesTags: ["course"],
        }),
        getCourseFiles: builder.query({
            query: ({ courseId, page, limit, search, includeCourse, includeQuizeQuestions }) => ({
                url: "/course-files/" + courseId,
                method: "GET",
                params: { page, limit, search, includeCourse, includeQuizeQuestions }
            }),
            providesTags: ["course"],
        }),
        getCourseById: builder.query({
            query: (id) => `/getCourseById/${id}`,
            providesTags: ["course"],
        }),
        getCourseByIdView: builder.query({
            query: ({ courseId, includeCourse, teacherId }) => ({
                url: `/getCourseByIdView/${courseId}`,
                method: "GET",
                params: { teacherId, includeCourse }
            }),
            providesTags: ["course"],
        }),
        getCourseByTeacherId: builder.query({
            query: ({ courseId, includeSchedules = true, includeStats = true }) => ({
                url: `/getCourseByTeacherId/${courseId}`,
                method: "GET",
                params: { includeSchedules, includeStats }
            }),
            providesTags: ["course"],
        }),
        getCourseStudents: builder.query({
            query: ({ courseId, page = 1, limit = 10, search = '', sort = 'latest' }) => ({
                url: `/getCourseStudents/${courseId}`,
                method: "GET",
                params: { page, limit, search, sort }
            }),
            providesTags: ["courseStudents"],
        }),
        addCourse: builder.mutation({
            query: (data) => ({
                url: "/addCourse",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            }),
            invalidatesTags: ["course"],

        }),
        updateCourse: builder.mutation({
            query: ({ id, data }) => ({
                url: `/updateCourse/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["course"],
        }),
        moveCourseOrder: builder.mutation({
            query: ({ id, direction, type }) => ({
                url: `/move-order/${id}`,
                method: "PATCH",
                body: { direction, type },
            }),
            invalidatesTags: ["course"],
        }),
        reorderCourses: builder.mutation({
            query: (orderedIds) => ({
                url: "/reorder",
                method: "PATCH",
                body: { orderedIds },
            }),
            invalidatesTags: ["course"],
        }),
        deleteCourse: builder.mutation({
            query: (id) => ({
                url: `/deleteCourse`,
                method: "DELETE",
                credentials: "include",
                body: { id },
            }),
            invalidatesTags: ["course"],
        }),
        getAllCategories: builder.query({
            query: () => "/getAllCategories",
            providesTags: ["categories"],
        }),
        deleteCategory: builder.mutation({
            query: (id) => ({
                url: `/deleteCategory`,
                method: "DELETE",
                body: { category_id: id },
            }),
            invalidatesTags: ["categories"],
        }),
        addCategory: builder.mutation({
            query: (category_name) => ({
                url: "/addCategory",
                method: "POST",
                body: { category_name: category_name },
            }),
            invalidatesTags: ["categories"],
        }),
        getReviews: builder.query({
            query: ({ courseId, page, limit, search, includeOverview, rating }) => ({
                url: "/get-reviews/" + courseId,
                method: "GET",
                params: { page, limit, search, includeOverview, rating },
            }),
            providesTags: ["reviews"],
        }),
        addRevieworUpdate: builder.mutation({
            query: ({ courseId, data }) => ({
                url: "/add-review/" + courseId,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            }),
            invalidatesTags: ["reviews", "course"],
        }),
        submitQuiz: builder.mutation({
            query: ({ courseId, quizId, answers }) => ({
                url: "/submit-quiz",
                method: "POST",
                body: { courseId, quizId, answers },
            }),
            invalidatesTags: ["course"],
        }),
        getQuizAttempts: builder.query({
            query: (quizId) => ({
                url: `/quiz-attempts/${quizId}`,
                method: "GET",
            }),
            providesTags: ["course"],
        }),
        deleteReview: builder.mutation({
            query: (reviewId) => ({
                url: "/delete-review/" + reviewId,
                method: "DELETE",
            }),
            invalidatesTags: ["reviews", "course"],
        }),
        getCourseRelatedData: builder.query({
            query: (id) => ({
                url: `/course-related-data/${id}`,
                method: "GET",
            }),
        }),
        checkInPersonCapacity: builder.query({
            query: (courseId) => `/in-person/${courseId}/capacity`,
            providesTags: ["WaitingList"],
        }),
        joinWaitingList: builder.mutation({
            query: (data) => ({
                url: "/waiting-list/join",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            }),
            invalidatesTags: ["WaitingList"],
        }),
        getWaitingList: builder.query({
            query: ({ courseId, page = 1, limit = 20 }) => ({
                url: `/waiting-list/${courseId}`,
                method: "GET",
                params: { page, limit },
            }),
            providesTags: ["WaitingList"],
        }),
        inviteFromWaitingList: builder.mutation({
            query: (entryId) => ({
                url: `/waiting-list/${entryId}/invite`,
                method: "POST",
            }),
            invalidatesTags: ["WaitingList"],
        }),
    }),
});


export const {
    useGetAllCoursesQuery,
    useGetAllCoursesForSelectQuery,
    useGetEnrolledCoursesQuery,
    useGetCoursesByTeacherIdQuery,
    useGetCourseFilesQuery,
    useGetCourseByIdQuery,
    useGetCourseByIdViewQuery,
    useGetCourseByTeacherIdQuery,
    useGetCourseStudentsQuery,
    useAddCourseMutation,
    useUpdateCourseMutation,
    useMoveCourseOrderMutation,
    useReorderCoursesMutation,
    useDeleteCourseMutation,
    useGetAllCategoriesQuery,
    useDeleteCategoryMutation,
    useAddCategoryMutation,
    useGetReviewsQuery,
    useAddRevieworUpdateMutation,
    useDeleteReviewMutation,
    useSubmitQuizMutation,
    useGetQuizAttemptsQuery,
    useGetCourseRelatedDataQuery,
    useCheckInPersonCapacityQuery,
    useJoinWaitingListMutation,
    useGetWaitingListQuery,
    useInviteFromWaitingListMutation,
} = courseApi;