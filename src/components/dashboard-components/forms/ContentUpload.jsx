import { useState, useEffect } from "react";

import { Trash2, Eye, Clock, Menu, Edit, List, Loader, File, ExternalLink, Plus } from "lucide-react";
import FileDropzone from "../dropzone";
import { Button } from "@heroui/react";
import { PiFile, PiFilePdf } from "react-icons/pi";
import { errorMessage, successMessage } from "../../../lib/toast.config";
import { Link } from "react-router-dom";
import { IntervalInput } from "./IntervalInput";

const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
};

const deleteDocument = async (id, setFiles, setIsDeleting) => {
    try {
        setIsDeleting(id);
        const response = await fetch(
            `${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/course/course-files/${id}`,
            { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();

        if (data.success) {
            setFiles((prev) => prev.filter((doc) => doc.id !== id));
            successMessage("Document deleted successfully");
        } else {
            errorMessage("Failed to delete document");
        }
    } catch (err) {
        errorMessage("Error deleting document: " + err?.message);
    } finally {
        setIsDeleting(null);
    }
};
const getVideoDuration = (file) => {
    return new Promise((resolve) => {
        try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function () {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            video.onerror = function (e) {
                console.log(e);

                resolve(0);
            };
            video.src = URL.createObjectURL(file);
        } catch (e) {
            resolve(0);
        }
    });
};

export const countPdfPagesLight = async (file) => {
    if (file.type !== "application/pdf") return;
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(arrayBuffer);

    // Count /Type /Page occurrences
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 0;
};

const handleUploadFile = async ({ title, file, fileType, courseId, duration = 0, pages = 0, linkUrl }) => {
    try {
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("title", title || (file ? file.name : 'Link'));
        formData.append("fileType", fileType);
        formData.append("courseId", courseId);
        if (duration) formData.append("duration", duration);
        if (pages) formData.append("pages", pages);
        if (linkUrl) formData.append("linkUrl", linkUrl);

        const res = await fetch(`${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/course/course-files`, {
            method: "PATCH",
            body: formData,
            credentials: "include",
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || "Upload failed");
        }
        return data.file;
    } catch (err) {
        console.error("Upload failed", err);
        throw new Error("Failed to upload files: " + err?.message);
    }
};

const handleUpdateFile = async (fileId, updates) => {
    try {
        const res = await fetch(
            `${import.meta.env.VITE_PUBLIC_SERVER_URL}/api/course/course-files/${fileId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updates),
            }
        );
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.message || "Update failed");
        }
        return data.file;
    } catch (err) {
        console.error("Update failed", err);
        throw new Error("Failed to update file: " + err?.message);
    }
};

export default function Videos({ files, setFiles, courseId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newFiles, setNewFiles] = useState([]);
    const [isDeleting, setIsDeleting] = useState(null);
    const updateDocument = async (id, field, value) => {
        const prevFiles = [...files];
        setFiles((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc))
        );

        if (courseId) {
            try {
                await handleUpdateFile(id, { [field]: value });
            } catch (err) {
                errorMessage("Failed to update document");
                setFiles(prevFiles);
            }
        }
    };

    const handleUpload = async () => {
        const newFile = newFiles[0];
        if (!newFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 95) return prev;
                    return prev + 5;
                });
            }, 500);
            const duration = await getVideoDuration(newFile?.file);
            const fileRes = await handleUploadFile({
                title: newFile.name,
                file: newFile?.file,
                fileType: "lesson_video",
                courseId,
                duration,
            });

            clearInterval(interval);
            setUploadProgress(100);
            successMessage("Lesson video uploaded successfully");
            setFiles((prev) => [...prev, fileRes]);
        } catch (err) {
            console.error("Upload failed", newFile.name);
            errorMessage("Upload failed: " + err?.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setNewFiles([]);
        }
    };

    useEffect(() => {
        if (newFiles.length > 0) {
            handleUpload();
        }
    }, [newFiles]);


    const lessonVideos = files?.filter((f) => f.fileType === "lesson_video");
    return (
        <div className="bg-white rounded-lg my-2 w-full">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                    Lesson Videos
                    <span className="flex items-center text-sm text-gray-600 gap-1">
                        <Menu />
                        Total Lessons: {lessonVideos?.length}
                    </span>
                </h1>

            </div>
            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
                <div className="space-y-4 my-4">
                    {lessonVideos?.map((document) => (
                        <div
                            key={document.id}
                            className={`rounded-lg p-4 sm:p-6 transition-all ${document.status === "scheduled"
                                ? "bg-[#F5E3DA]"
                                : "bg-[#95C4BE33]"
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:gap-6">
                                <video className="h-22 w-44 rounded-xl" controls>
                                    <source src={document.url} />
                                </video>
                                {/* <Play color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" /> */}

                                <div className="flex flex-1 flex-col justify-between gap-1">
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document.title}
                                        className="text-lg outline-none font-semibold sm:text-xl"
                                        onBlur={(e) => {
                                            if (document.title === e.target.value) return;
                                            updateDocument(document.id, "title", e.target.value)
                                        }}
                                    />
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document?.description}
                                        className="outline-none"
                                        placeholder="Add a description"
                                        onBlur={(e) => {
                                            if (document.description === e.target.value) return;
                                            updateDocument(document.id, "description", e.target.value)
                                        }}
                                    />
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        {document?.file?.size > 0 && <span className="inline-flex items-center gap-1">{((document.file.size / 1024) / 1024).toLocaleString()} MB</span>}
                                        {document.file?.duration > 0 && <span className="inline-flex items-center gap-1">
                                            <Clock className="size-3.5" /> {document.file.duration.toLocaleString() || 0}ms duration
                                        </span>}
                                        {document?.views > 0 && <span className="inline-flex items-center gap-1">
                                            <Eye className="h-4 w-4" /> {document?.views.toLocaleString()} views
                                        </span>}
                                        <span className="inline-flex items-center gap-1">{document.status}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 items-end sm:items-center">
                                    <IntervalInput
                                        initialValue={document?.releasedAt}
                                        onUpdate={(interval) => updateDocument(document.id, "releasedAt", interval)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button as={Link} target="_blank" to={document.url} radius="sm" variant="flat" color="default" isIconOnly>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            radius="sm"
                                            variant="flat"
                                            isIconOnly
                                            color="danger"
                                            isLoading={isDeleting === document.id}
                                            isDisabled={isDeleting === document.id}
                                            onPress={() => deleteDocument(document.id, setFiles, setIsDeleting)}
                                        >
                                            <Trash2 color="#fb2c36" className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload New Video</h3>
                    {isUploading ? (
                        <div className="w-full h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 px-4">
                            <Loader className="animate-spin h-8 w-8 text-[#06574C] mb-2" />
                            <div className="w-full max-w-md flex justify-between text-gray-600 mb-1 text-sm font-medium">
                                <span>Uploading files...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#06574C] transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <FileDropzone
                            files={newFiles}
                            setFiles={setNewFiles}
                            label="Drag & Drop Videos"
                            text="or click to upload. Supports multiple files."
                            height="300px"
                            fileType="video"

                        />
                    )}
                </div>
            </div>
        </div>
    );
}



export function PdfAndNotes({ files, setFiles, courseId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newFiles, setNewFiles] = useState([]);
    const [isDeleting, setIsDeleting] = useState(null);
    const updateDocument = async (id, field, value) => {
        const prevFiles = [...files];
        setFiles((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc))
        );

        // Call API to update
        if (courseId) {
            try {
                await handleUpdateFile(id, { [field]: value });
            } catch (err) {
                errorMessage("Failed to update document");
                setFiles(prevFiles);
            }
        }
    };

    const handleUpload = async () => {
        const newFile = newFiles[0];
        if (!newFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 95) return prev;
                    return prev + 5;
                });
            }, 500);
            const pages = await countPdfPagesLight(newFile?.file);

            const fileRes = await handleUploadFile({
                title: newFile.name,
                file: newFile?.file,
                fileType: "pdf_notes",
                courseId,
                pages
            });

            clearInterval(interval);
            setUploadProgress(100);
            successMessage("PDF/Note uploaded successfully");
            setFiles((prev) => [...prev, fileRes]);
        } catch (err) {
            console.error("Upload failed", newFile.name);
            errorMessage("Upload failed: " + err?.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setNewFiles([]);
        }
    };

    useEffect(() => {
        if (newFiles.length > 0) {
            handleUpload();
        }
    }, [newFiles]);


    const pdfFiles = files?.filter((f) => f.fileType === "pdf_notes");

    return (
        <div className="bg-white rounded-lg my-2 w-full">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                    PDFs & Notes
                </h1>

            </div>

            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
                <div className="space-y-4 my-4">
                    {pdfFiles?.map((document) => (
                        <div
                            key={document.id}
                            className={`rounded-lg p-4 sm:p-6 transition-all ${document.status === "scheduled"
                                ? "bg-[#F5E3DA]"
                                : "bg-[#95C4BE33]"
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:gap-6">
                                {document?.file?.mimetype?.includes("pdf") ? (
                                    <PiFilePdf color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" />
                                ) : (
                                    <PiFile color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" />
                                )}

                                <div className="flex flex-1 flex-col justify-between gap-1">
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document.title}
                                        className="text-lg outline-none font-semibold sm:text-xl"
                                        onBlur={(e) => {
                                            if (document.title === e.target.value) return;
                                            updateDocument(document.id, "title", e.target.value)
                                        }}
                                    />
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document?.description}
                                        className="outline-none"
                                        placeholder="Add a description"
                                        onBlur={(e) => {
                                            if (document.description === e.target.value) return;
                                            updateDocument(document.id, "description", e.target.value)
                                        }}
                                    />
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        {document?.file?.size > 0 && <span className="inline-flex items-center gap-1">{((document.file.size / 1024) / 1024).toLocaleString()} MB</span>}
                                        {document.file?.pages > 0 && <span className="inline-flex items-center gap-1">
                                            <File className="size-3.5" /> {document.file.pages.toLocaleString() || 0} pages
                                        </span>}
                                        {document?.views > 0 && <span className="inline-flex items-center gap-1">
                                            <Eye className="h-4 w-4" /> {document?.views.toLocaleString() || 0} views
                                        </span>}
                                        <span className="inline-flex items-center gap-1">{document.status}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 items-end sm:items-center">
                                    <IntervalInput
                                        initialValue={document?.releasedAt}
                                        onUpdate={(interval) => updateDocument(document.id, "releasedAt", interval)}
                                    />

                                    <div className="flex items-center gap-2">
                                        <Button as={Link} target="_blank" to={document.url} radius="sm" variant="flat" color="default" isIconOnly>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            radius="sm"
                                            variant="flat"
                                            isIconOnly
                                            color="danger"
                                            isLoading={isDeleting === document.id}
                                            isDisabled={isDeleting === document.id}
                                            onPress={() => deleteDocument(document.id, setFiles, setIsDeleting)}
                                        >
                                            <Trash2 color="#fb2c36" className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Notes</h3>
                    {isUploading ? (
                        <div className="w-full h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 px-4">
                            <Loader className="animate-spin h-8 w-8 text-[#06574C] mb-2" />
                            <div className="w-full max-w-md flex justify-between text-gray-600 mb-1 text-sm font-medium">
                                <span>Uploading files...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#06574C] transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <FileDropzone
                            files={newFiles}
                            setFiles={setNewFiles}
                            showFilesThere={false}
                            label="Drag & Drop Notes"
                            text="PDF, Word, Excel, PowerPoint, images, TXT, CSV — multiple files OK."
                            height="300px"
                            fileType="notes"
                            isMultiple
                        />
                    )}
                </div>
            </div>
        </div >
    );
}

export function Assignments({ files, setFiles, courseId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newFiles, setNewFiles] = useState([]);
    const [isDeleting, setIsDeleting] = useState(null);
    const updateDocument = async (id, field, value) => {
        const prevFiles = [...files];
        setFiles((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc))
        );

        // Call API to update
        if (courseId) {
            try {
                await handleUpdateFile(id, { [field]: value });
            } catch (err) {
                errorMessage("Failed to update document");
                setFiles(prevFiles);
            }
        }
    };


    const handleUpload = async () => {
        const newFile = newFiles[0];
        if (!newFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 95) return prev;
                    return prev + 5;
                });
            }, 500);
            const pages = await countPdfPagesLight(newFile?.file);
            const fileRes = await handleUploadFile({
                title: newFile.name,
                file: newFile?.file,
                fileType: "assignments",
                courseId,
                pages
            });

            clearInterval(interval);
            setUploadProgress(100);
            successMessage("Assignments uploaded successfully");
            setFiles((prev) => [...prev, fileRes]);
        } catch (err) {
            console.error("Upload failed", newFile.name);
            errorMessage("Upload failed: " + err?.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setNewFiles([]);
        }
    };

    useEffect(() => {
        if (newFiles.length > 0) {
            handleUpload();
        }
    }, [newFiles]);

    const assignments = files?.filter((f) => f.fileType === "assignments");
    return (
        <div className="bg-white rounded-lg my-2 w-full">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Assignments</h1>
                    </div>


                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
                <div className="space-y-4 my-4">
                    {assignments?.map((document) => (
                        <div
                            key={document.id}
                            className={`rounded-lg p-4 sm:p-6 transition-all ${document.status === "scheduled"
                                ? "bg-[#F5E3DA]"
                                : "bg-[#95C4BE33]"
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:gap-6">
                                {document?.file?.mimetype?.includes("pdf") ? (
                                    <PiFilePdf color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" />
                                ) : (
                                    <PiFile color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" />
                                )}

                                <div className="flex flex-1 flex-col justify-between gap-1">
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document.title}
                                        className="text-lg outline-none font-semibold sm:text-xl"
                                        onBlur={(e) => {
                                            if (document.title === e.target.value) return;
                                            updateDocument(document.id, "title", e.target.value)
                                        }}
                                    />
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document?.description}
                                        className="outline-none"
                                        placeholder="Add a description"
                                        onBlur={(e) => {
                                            if (document.description === e.target.value) return;
                                            updateDocument(document.id, "description", e.target.value)
                                        }}
                                    />
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        {document?.file?.size > 0 && <span className="inline-flex items-center gap-1">{((document.file.size / 1024) / 1024).toLocaleString()} MB</span>}
                                        {document.file?.pages > 0 && <span className="inline-flex items-center gap-1">
                                            <File className="size-3.5" /> {document.file.pages.toLocaleString() || 0} pages
                                        </span>}
                                        {document?.views > 0 && <span className="inline-flex items-center gap-1">
                                            <Eye className="h-4 w-4" /> {document?.views.toLocaleString() || 0} views
                                        </span>}
                                        <span className="inline-flex items-center gap-1">{document.status}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 items-end sm:items-center">
                                    <IntervalInput
                                        initialValue={document?.releasedAt}
                                        onUpdate={(interval) => updateDocument(document.id, "releasedAt", interval)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button as={Link} target="_blank" to={document.url} radius="sm" variant="flat" color="default" isIconOnly>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            radius="sm"
                                            variant="flat"
                                            isIconOnly
                                            color="danger"
                                            isLoading={isDeleting === document.id}
                                            isDisabled={isDeleting === document.id}
                                            onPress={() => deleteDocument(document.id, setFiles, setIsDeleting)}
                                        >
                                            <Trash2 color="#fb2c36" className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Assignment</h3>
                    {isUploading ? (
                        <div className="w-full h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 px-4">
                            <Loader className="animate-spin h-8 w-8 text-[#06574C] mb-2" />
                            <div className="w-full max-w-md flex justify-between text-gray-600 mb-1 text-sm font-medium">
                                <span>Uploading files...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#06574C] transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <FileDropzone
                            files={newFiles}
                            setFiles={setNewFiles}
                            showFilesThere={false}
                            label="Drag & Drop Assignment Files"
                            text="or click to upload. Supports multiple files."
                            height="300px"
                            fileType="assignment"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}


import QuizModal from "./QuizModal"; // Ensure import is present or verify later

export function Quizzes({ files = [], setFiles, courseId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [editingQuiz, setEditingQuiz] = useState(null);

    const quizzes = files?.filter((f) => f.fileType === "quiz");

    const handleEditQuiz = (quiz) => {
        setEditingQuiz(quiz);
        setIsOpen(true);
    };

    const handleOpenNewQuiz = () => {
        setEditingQuiz(null);
        setIsOpen(true);
    };

    const onSaveSuccess = (savedQuiz, isUpdate) => {
        if (isUpdate) {
            setFiles(prev => prev.map(f => f.id === savedQuiz.id ? savedQuiz : f));
        } else {
            setFiles(prev => [...prev, savedQuiz]);
        }
    };

    return (
        <div className=" bg-white rounded-lg my-2 w-full">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Course Quizzes</h1>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
                <div className="space-y-4 my-4">
                    {quizzes?.map((quiz) => (
                        <div key={quiz.id} className="rounded-lg p-4 sm:p-6 bg-[#95C4BE33]">
                            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                                <span className="bg-[#F5F5F5] p-2 flex justify-center items-center rounded-full size-16">
                                    <List size={24} color="#06574C" />
                                </span>

                                <div className="flex flex-1 flex-col justify-between gap-1">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">{quiz.title}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-1">
                                            <Menu size={16} />
                                            {quiz.totalQuestions || 0} Questions
                                        </span>
                                        <div className="px-2 py-0.5 rounded bg-[#06574C]/10 text-[#06574C] text-xs font-semibold">
                                            Passing {quiz.passingScore}%
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        isIconOnly
                                        variant="flat"
                                        className="bg-white"
                                        onPress={() => handleEditQuiz(quiz)}
                                    >
                                        <Edit size={18} color="#06574C" />
                                    </Button>
                                    <Button
                                        isIconOnly
                                        variant="flat"
                                        color="danger"
                                        isLoading={isDeleting === quiz.id}
                                        onPress={() => deleteDocument(quiz.id, setFiles, setIsDeleting)}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    onPress={handleOpenNewQuiz}
                    className="bg-[#06574C] text-white mt-4"
                    size="lg"
                    startContent={<Plus size={20} />}
                >
                    Create New Quiz
                </Button>
            </div>

            <QuizModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                courseId={courseId}
                editingQuiz={editingQuiz}
                onSaveSuccess={onSaveSuccess}
                handleUpdateFile={handleUpdateFile}

            />
        </div>
    );
}

import { Input } from "@heroui/react";
import { Link as LinkIcon } from "lucide-react";

export function Links({
    files,
    setFiles,
    courseId,
    title: propTitle,
    setTitle: propSetTitle,
    linkUrl: propLinkUrl,
    setLinkUrl: propSetLinkUrl,
    showAddButton = true,
    onAddLinkRef,
}) {
    const [localTitle, localSetTitle] = useState("");
    const [localLinkUrl, localSetLinkUrl] = useState("");

    const title = propTitle !== undefined ? propTitle : localTitle;
    const setTitle = propSetTitle !== undefined ? propSetTitle : localSetTitle;
    const linkUrl = propLinkUrl !== undefined ? propLinkUrl : localLinkUrl;
    const setLinkUrl = propSetLinkUrl !== undefined ? propSetLinkUrl : localSetLinkUrl;

    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);

    const updateDocument = async (id, field, value) => {
        const prevFiles = [...files];
        setFiles((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc))
        );

        if (courseId) {
            try {
                await handleUpdateFile(id, { [field]: value });
            } catch (err) {
                errorMessage("Failed to update link");
                setFiles(prevFiles);
            }
        }
    };

    const handleAddLink = async () => {
        if (!title.trim() || !linkUrl.trim()) {
            errorMessage("Title and URL are required");
            return;
        }

        setIsUploading(true);

        try {
            const fileRes = await handleUploadFile({
                title: title.trim(),
                fileType: "link",
                courseId,
                linkUrl: linkUrl.trim(),
            });

            successMessage("Link added successfully");
            setFiles((prev) => [...prev, fileRes]);
            setTitle("");
            setLinkUrl("");
            return fileRes;
        } catch (err) {
            console.error("Failed to add link", err);
            errorMessage("Failed to add link: " + err?.message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (onAddLinkRef) {
            onAddLinkRef.current = handleAddLink;
        }
    }, [title, linkUrl, courseId, setFiles, onAddLinkRef]);

    const linkFiles = files?.filter((f) => f.fileType === "link");

    return (
        <div className="bg-white rounded-lg my-2 w-full">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Links</h1>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
                <div className="space-y-4 my-4">
                    {linkFiles?.map((document) => (
                        <div
                            key={document.id}
                            className={`rounded-lg p-4 sm:p-6 transition-all ${document.status === "scheduled"
                                ? "bg-[#F5E3DA]"
                                : "bg-[#95C4BE33]"
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:gap-6">
                                <LinkIcon color="#06574C" className="bg-[#F5F5F5] p-3 rounded-full size-16" />

                                <div className="flex flex-1 flex-col justify-between gap-1">
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document.title}
                                        className="text-lg outline-none font-semibold sm:text-xl bg-transparent"
                                        onBlur={(e) => {
                                            if (document.title === e.target.value) return;
                                            updateDocument(document.id, "title", e.target.value)
                                        }}
                                    />
                                    <input
                                        variant="light"
                                        type="text"
                                        defaultValue={document.url}
                                        className="outline-none bg-transparent text-[#06574C] underline text-sm"
                                        placeholder="Edit URL"
                                        onBlur={(e) => {
                                            if (document.url === e.target.value) return;
                                            updateDocument(document.id, "url", e.target.value)
                                        }}
                                    />
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-1">{document.status}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 items-end sm:items-center">
                                    <IntervalInput
                                        initialValue={document?.releasedAt}
                                        onUpdate={(interval) => updateDocument(document.id, "releasedAt", interval)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button as={Link} target="_blank" to={document.url} radius="sm" variant="flat" color="default" isIconOnly>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            radius="sm"
                                            variant="flat"
                                            isIconOnly
                                            color="danger"
                                            isLoading={isDeleting === document.id}
                                            isDisabled={isDeleting === document.id}
                                            onPress={() => deleteDocument(document.id, setFiles, setIsDeleting)}
                                        >
                                            <Trash2 color="#fb2c36" className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Link</h3>
                    <div className="flex flex-col gap-4">
                        <Input
                            label="Link Title"
                            placeholder="e.g. Reference Material (Google sheet)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            variant="bordered"
                            fullWidth
                        />
                        <Input
                            label="URL"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            variant="bordered"
                            fullWidth
                        />
                        {showAddButton && (
                            <div className="flex justify-end mt-2">
                                <Button
                                    onPress={handleAddLink}
                                    className="bg-[#06574C] text-white"
                                    isLoading={isUploading}
                                    startContent={!isUploading && <Plus size={16} />}
                                >
                                    Add Link
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

