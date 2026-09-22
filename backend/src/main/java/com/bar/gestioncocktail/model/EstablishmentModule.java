package com.bar.gestioncocktail.model;

/**
 * Enumeration of optional modular capabilities that can be dynamically enabled or disabled
 * per establishment profile (e.g. standard bar, restaurant/brasserie, food-truck, nightclub).
 */
public enum EstablishmentModule {

    /**
     * Kitchen Display Screen (KDS), workstation-based order item routing (BAR vs KITCHEN),
     * and dedicated kitchen dashboard screen.
     */
    CUISINE_KDS,

    /**
     * Happy Hour promotional rule engine, time window scheduling, and dynamic drink price resolution.
     */
    HAPPY_HOUR,

    /**
     * Employee shift planning, schedule calendar, recurring presets, and shift audit logs.
     */
    EMPLOYEE_MANAGEMENT,

    /**
     * Interactive 2D Konva.js floor plan editor and visual table layouts across zones and floors.
     */
    FLOOR_PLAN,

    /**
     * Patron self-ordering via table QR code, collaborative live cart, and waiter assistance alerts.
     */
    QR_CLIENT_ORDERING,

    /**
     * Real-time automated ingredient stock deduction on order preparation and inventory waste/breakage tracking.
     */
    STOCK_TRACKING,

    /**
     * Physical cash drawer management lifecycle: daily opening float, cash movements (in/drop/paid out),
     * and intermediate X-reports.
     */
    CASH_DRAWER,

    /**
     * Customer bar tabs and running ledgers without mandatory physical table assignment,
     * supporting drink accumulation across the evening, table-tab transfers, and unified settlement.
     */
    BAR_TABS,

    /**
     * Standard cocktail & ingredient library import wizard with preconfigured recipes,
     * IBA classics, glassware, flavor profiles, and automatic inventory deduplication.
     */
    COCKTAIL_LIBRARY,

    /**
     * Beverage and produce supplier management, purchase orders, incoming delivery (BL) check-in intake,
     * automatic stock replenishment, and live Weighted Average Unit Cost (PAMP / WAC) recalculation.
     */
    SUPPLIERS_MANAGEMENT
}

