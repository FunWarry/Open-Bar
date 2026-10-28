package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Service handling file uploads and local storage for cocktail photos, glassware illustrations, and checklist media.
 */
@Service
public class FileUploadService {

    private static final Logger log = LoggerFactory.getLogger(FileUploadService.class);
    private static final String UPLOAD_DIR = "uploads/cocktails";
    private static final String GLASSWARE_UPLOAD_DIR = "uploads/glassware";
    private static final String CHECKLIST_UPLOAD_DIR = "uploads/checklists";

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5 MB
    private static final long CHECKLIST_MAX_FILE_SIZE = 50L * 1024 * 1024; // 50 MB

    private static final String ERR_EMPTY_FILE = "Uploaded file is empty";
    private static final String ERR_PATH_TRAVERSAL = "Invalid file path traversal";
    private static final String ERR_IMAGE_SIZE = "File size exceeds maximum allowed limit of 5MB";
    private static final String ERR_IMAGE_TYPE = "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.";
    private static final String ERR_IMAGE_EXT = "Invalid file extension. Only JPEG, PNG, GIF, and WebP are allowed.";

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    );

    private static final Set<String> CHECKLIST_ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/webm", "video/quicktime"
    );

    private static final Set<String> CHECKLIST_ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"
    );

    private static final List<String> FORBIDDEN_MARKUP_SIGNATURES = List.of(
        "<script", "<svg", "<!doctype html", "<html", "<?php"
    );

    /**
     * Saves an uploaded cocktail photo to local file storage.
     *
     * @param cocktailId Identifier of the target cocktail
     * @param file       Uploaded multipart image file
     * @return Relative URL path to access the stored image
     */
    public String storeCocktailPhoto(Long cocktailId, MultipartFile file) {
        return storeImageFile(file, UPLOAD_DIR, "/uploads/cocktails/", "cocktail_", cocktailId);
    }

    /**
     * Saves an uploaded glassware photo to local file storage.
     *
     * @param glasswareId Identifier of the target glassware
     * @param file        Uploaded multipart image file
     * @return Relative URL path to access the stored image
     */
    public String storeGlasswarePhoto(Long glasswareId, MultipartFile file) {
        return storeImageFile(file, GLASSWARE_UPLOAD_DIR, "/uploads/glassware/", "glassware_", glasswareId);
    }

    /**
     * Saves an uploaded checklist image or tutorial video to local file storage.
     *
     * @param file Uploaded multipart media file (image or video)
     * @return Relative URL path to access the stored media
     */
    public String storeChecklistMedia(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ERR_EMPTY_FILE);
        }

        if (file.getSize() > CHECKLIST_MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds maximum allowed limit of 50MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !CHECKLIST_ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM, QuickTime videos are allowed.");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (!CHECKLIST_ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new BusinessException("Invalid file extension: " + extension);
        }

        try {
            validateSafePayload(file);
            String newFilename = "checklist_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16) + extension;
            Path filePath = saveFileToDirectory(file, CHECKLIST_UPLOAD_DIR, newFilename);
            log.info("Successfully stored checklist media at {}", filePath);
            return "/uploads/checklists/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to store uploaded checklist media", e);
            throw new BusinessException("Could not store the media file: " + e.getMessage());
        }
    }

    private String storeImageFile(MultipartFile file, String uploadDir, String urlPrefix, String filePrefix, Long entityId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ERR_EMPTY_FILE);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ERR_IMAGE_SIZE);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException(ERR_IMAGE_TYPE);
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(ERR_IMAGE_EXT);
        }

        try {
            validateSafePayload(file);
            String newFilename = filePrefix + entityId + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path filePath = saveFileToDirectory(file, uploadDir, newFilename);
            log.info("Successfully stored photo for ID {} at {}", entityId, filePath);
            return urlPrefix + newFilename;
        } catch (IOException e) {
            log.error("Failed to store uploaded image for ID {}", entityId, e);
            throw new BusinessException("Could not store the image file: " + e.getMessage());
        }
    }

    private Path saveFileToDirectory(MultipartFile file, String directory, String filename) throws IOException {
        Path uploadPath = Paths.get(directory).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        Path filePath = uploadPath.resolve(filename).normalize();
        if (!filePath.startsWith(uploadPath)) {
            throw new BusinessException(ERR_PATH_TRAVERSAL);
        }
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        }
        return filePath;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return ".jpg";
        }
        return filename.substring(filename.lastIndexOf(".")).toLowerCase();
    }

    private void validateSafePayload(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream()) {
            byte[] headerBytes = is.readNBytes(512);
            if (isElfBinary(headerBytes)) {
                throw new BusinessException("Invalid file content: executable binary payload rejected");
            }
            String headerText = new String(headerBytes, StandardCharsets.ISO_8859_1).toLowerCase();
            if (containsForbiddenMarkup(headerText)) {
                throw new BusinessException("Invalid file content: script or markup payload rejected");
            }
        }
    }

    private boolean isElfBinary(byte[] bytes) {
        return bytes.length >= 4
                && bytes[0] == 0x7F
                && bytes[1] == 'E'
                && bytes[2] == 'L'
                && bytes[3] == 'F';
    }

    private boolean containsForbiddenMarkup(String headerText) {
        for (String signature : FORBIDDEN_MARKUP_SIGNATURES) {
            if (headerText.contains(signature)) {
                return true;
            }
        }
        return false;
    }
}
