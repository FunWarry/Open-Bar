package com.bar.gestioncocktail.model;

/**
 * Type of rich instructional media attached to a checklist SOP item.
 */
public enum ChecklistMediaType {
    /**
     * No instructional media attached.
     */
    NONE,

    /**
     * Static photographic or diagram guide.
     */
    IMAGE,

    /**
     * Stored instructional video file.
     */
    VIDEO,

    /**
     * External video tutorial or training URL (YouTube, Vimeo, stream).
     */
    EXTERNAL_LINK
}
