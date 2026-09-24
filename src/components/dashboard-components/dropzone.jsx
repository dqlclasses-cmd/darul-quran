import { PlusCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { errorMessage } from "../../lib/toast.config";

const fileTypeMap = {
  image: {
    "image/*": [".png", ".jpg", ".jpeg", ".webp"],
  },
  video: {
    "video/*": [".mp4", ".mov", ".avi", ".mkv", "webm"],
  },
  pdf: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  // Class notes: documents, images, spreadsheets, slides, text
  notes: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [".pptx"],
    "text/plain": [".txt"],
    "text/csv": [".csv"],
    "application/rtf": [".rtf"],
    "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
  },
  assignment: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "text/plain": [".txt"],
  },
};


const FileDropzone = ({
  label = "Upload your Course Thumbnail",
  text = ' Recommended: 1280x720 pixels',
  files,
  fileType = "", // "image" | "video" | "pdf" | "notes" | "assignment"
  maxSize = 100,
  setFiles,
  height = "280px",
  className = "w-full",
  uploadBgColor = "#95c4be44",
  isMultiple = false,
  showFilesThere = true,
  showFilesNamesThere = true,
  width = "100%",
}) => {
  const finalMaxSixe = maxSize * 1024 * 1024;

  const { getRootProps, getInputProps, open, acceptedFiles } = useDropzone({
    noKeyboard: true,
    multiple: isMultiple,
    maxSize: finalMaxSixe,
    accept: fileTypeMap[fileType] || undefined,
    onDrop: (acceptedFiles) => {
      // Convert accepted files to objects with metadata
      const filesWithMetadata = acceptedFiles.map(file => ({
        file, // The actual File object
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }));

      if (isMultiple) {
        // Add new files to existing files
        setFiles(prevFiles => [...prevFiles, ...filesWithMetadata]);
      } else {
        // Replace with single file
        setFiles(filesWithMetadata);
      }
    },
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === "file-too-large") {
            errorMessage(
              `"${file.name}" is too large.\nMaximum file size is ${maxSize} MB.`
            );
          }

          if (error.code === "file-invalid-type") {
            errorMessage(`"${file.name}" has an unsupported file type.`);
          }
        });
      });
    },
  });
  const removeFile = (index) => {
    if (index >= 0) {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
    } else {
      setFiles([])
    }
  };

  const getUploadedImageSrc = (fileObj) => {
    if (!fileObj) {
      console.error("No file provided.");
      return null;
    }

    // If fileObj is a string (already uploaded URL), return it
    if (typeof fileObj === "string") return fileObj;

    // If fileObj is the metadata object, get the actual file
    const file = fileObj.file || fileObj;

    if (typeof file === "string") return file;

    const imageUrl = URL.createObjectURL(file);
    return imageUrl;
  };
  return (
    <div className={className}>


      {showFilesThere && files.length > 0 ? (
        <div
          className="border-2 relative border-[#06574C] border-dashed rounded-lg text-center cursor-pointer overflow-hidden"
          style={{ height, width }}
        >
          <PlusCircle
            onClick={() => removeFile()}
            color="white"
            className="rotate-45 top-0 right-0   absolute cursor-pointer z-40"
            fill="red"
          />

          {files.length === 1 && (fileType) ? (
            files[0].type?.startsWith("video") || files[0].name?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={getUploadedImageSrc(files[0])}
                className="w-full h-full object-contain"
                controls
              />
            ) : (
              <img
                src={getUploadedImageSrc(files[0])}
                alt="uploded file"
                title="uploded file"
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 w-full h-full overflow-auto">
              {files.map((file, i) => (
                <div key={i} className="relative group">
                  {file.type?.startsWith("video") || file.name?.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={getUploadedImageSrc(file)}
                      className="w-full h-32 object-cover rounded-md"
                      controls={false} // No controls for thumbnails in grid
                    />
                  ) : (
                    <img
                      src={getUploadedImageSrc(file)}
                      alt={`uploded file ${i}`}
                      title={`uploded file ${i}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  )}
                  <PlusCircle
                    onClick={() => removeFile(i)}
                    color="white"
                    fill="red"
                    className="rotate-45 -top-3 -right-3 absolute cursor-pointer z-10"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) :
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-[#06574C] rounded-lg flex flex-col items-center justify-center text-center p-5 cursor-pointer"
          style={{ height, width, backgroundColor: uploadBgColor }}
        >
          <input name="files" {...getInputProps()} multiple={isMultiple} />

          <img src={'/icons/upload.png'} alt="upload icon" className=" w-14" />
          <h1 className="text-gray-800 text-[16px] font-semibold">
            {label}
          </h1>
          <p className="text-gray-600 text-xs">
            {text}
          </p>

          {/* Select Files button removed as per user request */}

        </div>
      }
      {showFilesNamesThere && files.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Files:</h4>
          <ul className="list-disc ml-6">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB ({file.type})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
