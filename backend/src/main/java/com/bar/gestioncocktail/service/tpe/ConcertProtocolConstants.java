package com.bar.gestioncocktail.service.tpe;

/**
 * Standard protocol byte control characters and format constants for the French/European
 * Concert / CB IP credit card payment terminal interface.
 */
public final class ConcertProtocolConstants {

    private ConcertProtocolConstants() {
        // Utility class
    }

    /**
     * Enquiry character (0x05) initiating handshakes.
     */
    public static final byte ENQ = 0x05;

    /**
     * Positive acknowledgement character (0x06).
     */
    public static final byte ACK = 0x06;

    /**
     * Negative acknowledgement character (0x15).
     */
    public static final byte NAK = 0x15;

    /**
     * Start of Text framing character (0x02).
     */
    public static final byte STX = 0x02;

    /**
     * End of Text framing character (0x03).
     */
    public static final byte ETX = 0x03;

    /**
     * End of Transmission character (0x04) used to release the communication line.
     */
    public static final byte EOT = 0x04;

    /**
     * Operation type: Standard Debit / Sale transaction ('C').
     */
    public static final char OP_DEBIT = 'C';

    /**
     * Result code: Transaction authorized and approved ('0').
     */
    public static final char RESULT_APPROVED = '0';

    /**
     * Result code: Transaction declined / refused by issuing bank or terminal ('1').
     */
    public static final char RESULT_REFUSED = '1';

    /**
     * Result code: Transaction cancelled by customer, staff, or timeout ('2').
     */
    public static final char RESULT_CANCELLED = '2';

    /**
     * ISO 4217 Numeric Currency code for Euro (978).
     */
    public static final String CURRENCY_EUR = "978";

    /**
     * ISO 4217 Numeric Currency code for US Dollar (840).
     */
    public static final String CURRENCY_USD = "840";

    /**
     * ISO 4217 Numeric Currency code for Swiss Franc (756).
     */
    public static final String CURRENCY_CHF = "756";

    /**
     * ISO 4217 Numeric Currency code for British Pound (826).
     */
    public static final String CURRENCY_GBP = "826";
}
