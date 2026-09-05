package com.bar.gestioncocktail.model;

/**
 * Type of establishment closure.
 * WEEKLY_RECURRING: Recurring closed day of the week (e.g. every Sunday or Monday).
 * EXCEPTIONAL: Single date or annual recurring holiday closure (e.g. July 14th, Christmas).
 */
public enum ClosureType {
    WEEKLY_RECURRING,
    EXCEPTIONAL
}
