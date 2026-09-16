import React, { useEffect, useState } from "react";
import { Button, Input, Spinner } from "@heroui/react";
import { FiSave } from "react-icons/fi";
import { DashHeading } from "../../../components/dashboard-components/DashHeading";
import FileDropzone from "../../../components/dashboard-components/dropzone";
import { uploadFilesToServer } from "../../../lib/utils";
import {
  useGetSiteSettingsQuery,
  useUpdateSiteSettingsMutation,
} from "../../../redux/api/siteSettings";
import { errorMessage, successMessage } from "../../../lib/toast.config";

const resolveImageUrl = async (files) => {
  if (!files?.length) return "";
  if (typeof files[0] === "string") return files[0];
  if (files[0]?.file) {
    const uploaded = await uploadFilesToServer([files[0]]);
    return uploaded?.[0] || "";
  }
  return "";
};

const initialFormData = {
  websiteName: "",
  websiteTagline: "",
  websiteUrl: "",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactPhone: "",
  whatsappUrl: "",
  instagramUrl: "",
  facebookUrl: "",
};

const applySiteSettingsToState = (
  settings,
  setFormData,
  setLogoFiles,
  setFaviconFiles,
) => {
  setFormData({
    websiteName: settings?.websiteName || "",
    websiteTagline: settings?.websiteTagline || "",
    websiteUrl: settings?.websiteUrl || "",
    logoUrl: settings?.logoUrl || "",
    faviconUrl: settings?.faviconUrl || "",
    contactEmail: settings?.contactEmail || "",
    contactPhone: settings?.contactPhone || "",
    whatsappUrl: settings?.whatsappUrl || "",
    instagramUrl: settings?.instagramUrl || "",
    facebookUrl: settings?.facebookUrl || "",
  });
  setLogoFiles(settings?.logoUrl ? [settings.logoUrl] : []);
  setFaviconFiles(settings?.faviconUrl ? [settings.faviconUrl] : []);
};

const getSaveErrorMessage = (err, fallback) =>
  err?.data?.message ||
  err?.error ||
  (err?.status ? `Request failed (${err.status})` : null) ||
  fallback;

const SiteSettings = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [logoFiles, setLogoFiles] = useState([]);
  const [faviconFiles, setFaviconFiles] = useState([]);

  const { data, isFetching, isError, error } = useGetSiteSettingsQuery();
  const [updateSiteSettings, { isLoading: isSaving }] =
    useUpdateSiteSettingsMutation();

  useEffect(() => {
    if (!data?.data) return;

    applySiteSettingsToState(
      data.data,
      setFormData,
      setLogoFiles,
      setFaviconFiles,
    );
  }, [data]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const logoUrl = await resolveImageUrl(logoFiles);
    const faviconUrl = await resolveImageUrl(faviconFiles);

    const payload = {
      websiteName: formData.websiteName.trim(),
      websiteTagline: formData.websiteTagline.trim(),
      websiteUrl: formData.websiteUrl.trim(),
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
      contactEmail: formData.contactEmail.trim(),
      contactPhone: formData.contactPhone.trim(),
      whatsappUrl: formData.whatsappUrl.trim(),
      instagramUrl: formData.instagramUrl.trim(),
      facebookUrl: formData.facebookUrl.trim(),
    };

    try {
      const res = await updateSiteSettings(payload).unwrap();

      if (res.success) {
        successMessage(res.message || "Site settings updated successfully");
        if (res.data) {
          applySiteSettingsToState(
            res.data,
            setFormData,
            setLogoFiles,
            setFaviconFiles,
          );
        }
      }
    } catch (err) {
      console.error("Site settings save failed:", err, "payload:", payload);
      errorMessage(getSaveErrorMessage(err, "Failed to update site settings"));
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="success" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500 py-8">
        Error:{" "}
        {error?.data?.message || error?.message || "Failed to load site settings"}
      </div>
    );
  }

  return (
    <div className="bg-white sm:bg-linear-to-t from-[#F1C2AC]/50 to-[#95C4BE]/50 px-2 sm:px-6 py-4 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <DashHeading
          title="Site Settings"
          desc="Manage global website information, branding, and contact / social links for the public site."
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6"
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Website Information
          </h3>
          <div className="space-y-5">
            <Input
              label="Website Name"
              placeholder="Darul Quran Leicester"
              variant="bordered"
              labelPlacement="outside"
              value={formData.websiteName}
              onChange={(e) => updateField("websiteName", e.target.value)}
            />
            <Input
              label="Website Tagline"
              placeholder="Learn Quran with excellence"
              variant="bordered"
              labelPlacement="outside"
              value={formData.websiteTagline}
              onChange={(e) => updateField("websiteTagline", e.target.value)}
            />
            <Input
              label="Website URL"
              placeholder="https://darulquranleicester.co.uk"
              variant="bordered"
              labelPlacement="outside"
              value={formData.websiteUrl}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Branding</h3>

          <div className="space-y-5">
            <FileDropzone
              label="Website Logo"
              text="PNG, JPG or WEBP"
              files={logoFiles}
              setFiles={setLogoFiles}
              fileType="image"
              isMultiple={false}
              maxSize={5}
              height="140px"
              showFilesNamesThere={false}
            />

            <FileDropzone
              label="Website Favicon"
              text="PNG, JPG or WEBP"
              files={faviconFiles}
              setFiles={setFaviconFiles}
              fileType="image"
              isMultiple={false}
              maxSize={2}
              height="140px"
              showFilesNamesThere={false}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Contact &amp; Social Links
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            These appear on the public website footer and contact page. Leave blank
            to hide an icon or link.
          </p>
          <div className="space-y-5">
            <Input
              label="Contact Email"
              placeholder="info@darulquranleicester.co.uk"
              type="email"
              variant="bordered"
              labelPlacement="outside"
              value={formData.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
            />
            <Input
              label="Contact Phone"
              placeholder="+44 116 000 0000"
              type="tel"
              variant="bordered"
              labelPlacement="outside"
              value={formData.contactPhone}
              onChange={(e) => updateField("contactPhone", e.target.value)}
            />
            <Input
              label="WhatsApp Link or Number"
              placeholder="https://wa.me/441160000000 or +44 116 000 0000"
              variant="bordered"
              labelPlacement="outside"
              description="Used for the footer WhatsApp icon. Full wa.me link or phone number."
              value={formData.whatsappUrl}
              onChange={(e) => updateField("whatsappUrl", e.target.value)}
            />
            <Input
              label="Instagram URL"
              placeholder="https://www.instagram.com/yourprofile"
              variant="bordered"
              labelPlacement="outside"
              value={formData.instagramUrl}
              onChange={(e) => updateField("instagramUrl", e.target.value)}
            />
            <Input
              label="Facebook URL"
              placeholder="https://www.facebook.com/yourpage"
              variant="bordered"
              labelPlacement="outside"
              value={formData.facebookUrl}
              onChange={(e) => updateField("facebookUrl", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button
            type="submit"
            color="success"
            startContent={<FiSave />}
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SiteSettings;
