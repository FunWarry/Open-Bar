package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Service handling file uploads and local storage for cocktail photos.
 */
@Service
public class FileUploadService {
    private static final Logger log = LoggerFactory.getLogger(FileUploadService.class);
    private static final String UPLOAD_DIR = "uploads/cocktails";
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    /**
     * Saves an uploaded cocktail photo to local file storage.
     *
     * @param cocktailId Identifier of the target cocktail
     * @param file       Uploaded multipart image file
     * @return Relative URL path to access the stored image
     */
    public String storeCocktailPhoto(Long cocktailId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Uploaded file is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds maximum allowed limit of 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
        }

        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);
            String newFilename = "cocktail_" + cocktailId + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path filePath = uploadPath.resolve(newFilename);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Successfully stored cocktail photo for ID {} at {}", cocktailId, filePath);
            return "/uploads/cocktails/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to store uploaded file for cocktail {}", cocktailId, e);
            throw new BusinessException("Could not store the image file: " + e.getMessage());
        }
    }

    private static final String GLASSWARE_UPLOAD_DIR = "uploads/glassware";

    /**
     * Saves an uploaded glassware photo to local file storage.
     *
     * @param glasswareId Identifier of the target glassware
     * @param file        Uploaded multipart image file
     * @return Relative URL path to access the stored image
     */
    public String storeGlasswarePhoto(Long glasswareId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Uploaded file is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds maximum allowed limit of 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
        }

        try {
            Path uploadPath = Paths.get(GLASSWARE_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);
            String newFilename = "glassware_" + glasswareId + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path filePath = uploadPath.resolve(newFilename);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Successfully stored glassware photo for ID {} at {}", glasswareId, filePath);
            return "/uploads/glassware/" + newFilename;
        } catch (IOException e) {
            log.error("Failed to store uploaded file for glassware {}", glasswareId, e);
            throw new BusinessException("Could not store the image file: " + e.getMessage());
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return ".jpg";
        }
        return filename.substring(filename.lastIndexOf(".")).toLowerCase();
    }
}
