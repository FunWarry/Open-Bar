package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class FileUploadServiceTest {

    private FileUploadService fileUploadService;

    @BeforeEach
    void setUp() {
        fileUploadService = new FileUploadService();
    }

    @Test
    @DisplayName("Should successfully store valid JPEG image file")
    void shouldStoreValidImage() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test_photo.jpg",
            "image/jpeg",
            "fake-image-bytes".getBytes()
        );

        String resultPath = fileUploadService.storeCocktailPhoto(1L, file);

        assertNotNull(resultPath);
        assertTrue(resultPath.startsWith("/uploads/cocktails/cocktail_1_"));
        assertTrue(resultPath.endsWith(".jpg"));
    }

    @Test
    @DisplayName("Should throw BusinessException when uploaded file is empty")
    void shouldThrowExceptionForEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        BusinessException ex = assertThrows(BusinessException.class, () ->
            fileUploadService.storeCocktailPhoto(1L, emptyFile)
        );

        assertEquals("Uploaded file is empty", ex.getMessage());
    }

    @Test
    @DisplayName("Should throw BusinessException when file format is not an allowed image MIME type")
    void shouldThrowExceptionForInvalidContentType() {
        MockMultipartFile pdfFile = new MockMultipartFile(
            "file",
            "document.pdf",
            "application/pdf",
            "pdf-content".getBytes()
        );

        BusinessException ex = assertThrows(BusinessException.class, () ->
            fileUploadService.storeCocktailPhoto(1L, pdfFile)
        );

        assertTrue(ex.getMessage().contains("Invalid file type"));
    }
}
